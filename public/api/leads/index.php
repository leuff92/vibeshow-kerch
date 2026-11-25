<?php
declare(strict_types=1);

require_once __DIR__ . '/notification.php';
require_once __DIR__ . '/push.php';

const BACKUP_FILE = __DIR__ . '/data/leads-backup.json';
const RATE_LIMIT_FILE = __DIR__ . '/data/rate-limit.json';
const RATE_LIMIT_WINDOW = 900;
const RATE_LIMIT_MAX = 5;

header('Content-Type: application/json; charset=UTF-8');

$env = load_env([
    __DIR__ . '/../../.env',
    __DIR__ . '/../../../.env',
]);

handle_cors($env['ALLOWED_ORIGIN'] ?? 'https://vibeshow-kerch.ru');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$rawBody = file_get_contents('php://input') ?: '';
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    json_response(400, ['ok' => false, 'error' => 'Invalid request']);
}

if (clean_text($payload['website'] ?? '', 200) !== '') {
    json_response(200, ['ok' => true]);
}

$clientIp = get_client_ip();

if (is_rate_limited($clientIp)) {
    json_response(429, ['ok' => false, 'error' => 'Too many requests']);
}

$lead = normalize_lead($payload);

if ($lead['childrenCount'] !== null && (!is_int($lead['childrenCount']) || $lead['childrenCount'] < 1 || $lead['childrenCount'] > 9007199254740991)) {
    json_response(400, ['ok' => false, 'error' => 'Invalid children count']);
}

if ($lead['programName'] === '' || $lead['consentAccepted'] !== true || !phone_looks_valid($lead['parentPhone'])) {
    json_response(400, ['ok' => false, 'error' => 'Invalid lead data']);
}

try {
    $lead = array_merge($lead, [
        'id' => bin2hex(random_bytes(8)),
        'clientIp' => $clientIp,
        'backupReason' => 'local_lead_storage',
        'savedAt' => gmdate('c'),
    ]);
    save_backup($lead);
} catch (Throwable $backupError) {
    error_log('Lead backup save failed. ' . $backupError->getMessage());
    json_response(502, ['ok' => false, 'error' => 'Lead submit failed']);
}

try {
    $pushSettings = lead_push_settings();
    if ($pushSettings !== null) {
        lead_send_push($pushSettings);
    }
} catch (Throwable $pushError) {
    error_log('Lead push failed (' . get_class($pushError) . '). Lead: ' . $lead['id']);
}
send_lead_notification($lead, $env);
json_response(200, ['ok' => true, 'savedToBackup' => true]);

function load_env(array $paths): array
{
    $env = [];

    foreach ($paths as $path) {
        if (!is_file($path)) {
            continue;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            $line = preg_replace('/^\xEF\xBB\xBF/', '', trim($line));

            if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $env[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }

        break;
    }

    return $env;
}

function handle_cors(string $allowedOrigin): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin === '') {
        return;
    }

    $isAllowedOrigin = $origin === $allowedOrigin;
    $isLocalhost = (bool) preg_match('/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i', $origin);

    if (!$isAllowedOrigin && !$isLocalhost) {
        json_response(403, ['ok' => false, 'error' => 'Request origin is not allowed']);
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function get_client_ip(): string
{
    $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';

    if ($forwardedFor !== '') {
        return trim(explode(',', $forwardedFor)[0]);
    }

    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function is_rate_limited(string $clientIp): bool
{
    $now = time();
    $rateData = read_json_file(RATE_LIMIT_FILE);

    if (!is_array($rateData)) {
        $rateData = [];
    }

    $timestamps = array_values(array_filter($rateData[$clientIp] ?? [], static function ($timestamp) use ($now) {
        return is_int($timestamp) && ($now - $timestamp) < RATE_LIMIT_WINDOW;
    }));

    if (count($timestamps) >= RATE_LIMIT_MAX) {
        $rateData[$clientIp] = $timestamps;
        write_json_file(RATE_LIMIT_FILE, $rateData);

        return true;
    }

    $timestamps[] = $now;
    $rateData[$clientIp] = $timestamps;
    write_json_file(RATE_LIMIT_FILE, $rateData);

    return false;
}

function normalize_lead(array $payload): array
{
    return [
        'programId' => clean_text($payload['programId'] ?? '', 80),
        'programName' => clean_text($payload['programName'] ?? '', 160),
        'programPrice' => clean_text($payload['programPrice'] ?? '', 80),
        'bookingPrice' => clean_text($payload['bookingPrice'] ?? '', 80),
        'date' => clean_text($payload['date'] ?? '', 40),
        'time' => clean_text($payload['time'] ?? '', 40),
        'parentName' => clean_text($payload['parentName'] ?? '', 120),
        'childName' => clean_text($payload['childName'] ?? '', 120),
        'childAge' => clean_text($payload['childAge'] ?? '', 20),
        'childrenCount' => $payload['childrenCount'] ?? null,
        'parentPhone' => clean_text($payload['parentPhone'] ?? '', 40),
        'comment' => clean_multiline_text($payload['comment'] ?? '', 1000),
        'pageUrl' => clean_url($payload['pageUrl'] ?? ''),
        'createdAt' => normalize_created_at($payload['createdAt'] ?? ''),
        'consentAccepted' => ($payload['consentAccepted'] ?? false) === true,
    ];
}

function clean_text($value, int $maxLength = 500): string
{
    $text = (string) ($value ?? '');
    $text = str_replace(['<', '>', '`'], '', $text);
    $text = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $text) ?? '';
    $text = preg_replace('/\s+/u', ' ', $text) ?? '';

    return limit_text(trim($text), $maxLength);
}

function clean_multiline_text($value, int $maxLength = 1000): string
{
    $text = (string) ($value ?? '');
    $text = str_replace(['<', '>', '`'], '', $text);
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    $text = preg_replace('/[^\S\n]+/u', ' ', $text) ?? '';
    $text = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $text) ?? '';

    return limit_text(trim($text), $maxLength);
}

function limit_text(string $text, int $maxLength): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength, 'UTF-8');
    }

    return substr($text, 0, $maxLength);
}

function clean_url($value): string
{
    $url = clean_text($value, 500);

    if ($url === '') {
        return '';
    }

    $parts = parse_url($url);

    if (!is_array($parts) || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)) {
        return '';
    }

    return $url;
}

function normalize_created_at($value): string
{
    $timestamp = strtotime((string) ($value ?? ''));

    if ($timestamp === false) {
        return gmdate('c');
    }

    return gmdate('c', $timestamp);
}

function phone_looks_valid(string $value): bool
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    $length = strlen($digits);

    return $length >= 10 && $length <= 15;
}

function save_backup(array $lead): void
{
    $dir = dirname(BACKUP_FILE);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create data directory');
    }
    $lock = fopen(BACKUP_FILE . '.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Could not open backup lock');
    }
    $temporaryFile = null;
    try {
        if (!flock($lock, LOCK_EX)) {
            throw new RuntimeException('Could not lock backup');
        }
        clearstatcache(true, BACKUP_FILE);
        $raw = is_file(BACKUP_FILE) ? file_get_contents(BACKUP_FILE) : '';
        if ($raw === false) {
            throw new RuntimeException('Could not read lead backup');
        }
        $backup = trim($raw) === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($backup)) {
            throw new RuntimeException('Invalid lead backup format');
        }
        $backup[] = $lead;
        $encoded = json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        $temporaryFile = tempnam($dir, 'lead-');
        if (!$temporaryFile || file_put_contents($temporaryFile, $encoded) !== strlen($encoded) || !rename($temporaryFile, BACKUP_FILE)) {
            throw new RuntimeException('Could not save lead backup');
        }
    } finally {
        if ($temporaryFile && is_file($temporaryFile)) {
            unlink($temporaryFile);
        }
        fclose($lock);
    }
}

function read_json_file(string $path)
{
    if (!is_file($path)) {
        return [];
    }

    $raw = file_get_contents($path);

    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);

    return $decoded ?? [];
}

function write_json_file(string $path, $data): void
{
    $dir = dirname($path);

    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create data directory');
    }

    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    if ($encoded === false) {
        throw new RuntimeException('Could not encode JSON file');
    }

    $file = fopen($path, 'c+');

    if ($file === false) {
        throw new RuntimeException('Could not open JSON file');
    }

    try {
        if (!flock($file, LOCK_EX)) {
            throw new RuntimeException('Could not lock JSON file');
        }

        ftruncate($file, 0);
        rewind($file);
        fwrite($file, $encoded);
        fflush($file);
        flock($file, LOCK_UN);
    } finally {
        fclose($file);
    }
}

function json_response(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
