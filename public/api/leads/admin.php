<?php
declare(strict_types=1);

require_once __DIR__ . '/push.php';

const LEAD_SESSION_NAME = 'VibeLeads';
const LEAD_SESSION_LIFETIME = 604800;
const LEAD_PAGE_SIZE = 30;

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['GET', 'POST'], true)) {
        lead_admin_response(405, 'method');
    }
    $config = lead_push_settings();
    if ($config === null) {
        lead_admin_response(503, 'not_configured');
    }
    $post = $method === 'POST' ? lead_admin_post() : [];
    $action = $post['action'] ?? '';

    if ($action === 'login') {
        if (!lead_admin_allow_login()) {
            lead_admin_response(429, 'too_many_attempts');
        }
        $password = $post['password'] ?? null;
        if (!is_string($password) || strlen($password) > 120
            || !hash_equals($config['PASSWORD_HASH'], hash('sha256', $password))) {
            lead_admin_response(401, 'invalid_password');
        }
        lead_admin_session();
        if (!session_regenerate_id(true)) {
            throw new RuntimeException('Could not renew lead session');
        }
        $_SESSION = ['until' => time() + LEAD_SESSION_LIFETIME, 'account' => $config['PASSWORD_HASH']];
        lead_admin_response(200);
    }

    if (!isset($_COOKIE[LEAD_SESSION_NAME])) {
        lead_admin_response(401, 'unauthorized');
    }
    lead_admin_session();
    if (($_SESSION['until'] ?? 0) < time() || ($_SESSION['account'] ?? '') !== $config['PASSWORD_HASH']) {
        lead_admin_clear_session();
        lead_admin_response(401, 'unauthorized');
    }

    if ($method === 'GET') {
        session_write_close();
        $before = filter_var($_GET['before'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => PHP_INT_MAX]]);
        lead_admin_response(200, '', lead_admin_list($before === false ? null : $before) + [
            'pushKey' => lead_push_ready() ? $config['VAPID_PUBLIC_KEY'] : null,
        ]);
    }

    $endpoint = $post['endpoint'] ?? null;
    if ($action === 'logout') {
        if (lead_push_endpoint($endpoint)) {
            lead_admin_remove_device($endpoint);
        }
        lead_admin_clear_session();
        lead_admin_response(200);
    }
    if (!lead_push_endpoint($endpoint)) {
        lead_admin_response(400, 'invalid_device');
    }
    if ($action === 'device_status') {
        session_write_close();
        lead_admin_response(200, '', ['registered' => isset(lead_read_json(LEAD_PUSH_DEVICES)[hash('sha256', $endpoint)])]);
    }
    if ($action === 'unsubscribe') {
        session_write_close();
        lead_admin_remove_device($endpoint);
        lead_admin_response(200);
    }
    if (!lead_push_ready()) {
        lead_admin_response(503, 'push_unavailable');
    }
    if ($action === 'subscribe') {
        session_write_close();
        $keys = $post['keys'] ?? null;
        if (!is_array($keys) || !lead_push_key($keys['p256dh'] ?? null, 65) || !lead_push_key($keys['auth'] ?? null, 16)) {
            lead_admin_response(400, 'invalid_device');
        }
        $added = lead_update_json(LEAD_PUSH_DEVICES, function (array &$devices) use ($endpoint, $keys) {
            $id = hash('sha256', $endpoint);
            if (count($devices) >= 4 && !isset($devices[$id])) {
                return false;
            }
            $devices[$id] = [
                'endpoint' => $endpoint,
                'keys' => ['p256dh' => $keys['p256dh'], 'auth' => $keys['auth']],
                'contentEncoding' => 'aes128gcm',
            ];
            return true;
        });
        lead_admin_response($added ? 200 : 409, $added ? '' : 'device_limit');
    }
    if ($action === 'test') {
        if (($_SESSION['lastTest'] ?? 0) > time() - 20) {
            lead_admin_response(429, 'test_limit');
        }
        $_SESSION['lastTest'] = time();
        session_write_close();
        $sent = lead_send_push($config, $endpoint) > 0;
        lead_admin_response($sent ? 200 : 502, $sent ? '' : 'push_failed');
    }
    lead_admin_response(400, 'invalid_action');
} catch (Throwable $error) {
    error_log('Lead cabinet request failed (' . get_class($error) . ')');
    lead_admin_response(500, 'server_error');
}

function lead_admin_response(int $status, string $reason = '', array $data = []): void
{
    http_response_code($status);
    echo json_encode(['ok' => $status < 400, 'error' => $reason] + $data, JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

function lead_admin_post(): array
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $isLocal = PHP_SAPI === 'cli-server' && preg_match('#\Ahttp://(?:localhost|127\.0\.0\.1):[0-9]+\z#', $origin)
        && $origin === 'http://' . ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== LEAD_APP_ORIGIN && !$isLocal) {
        lead_admin_response(403, 'invalid_origin');
    }
    $type = explode(';', $_SERVER['CONTENT_TYPE'] ?? '', 2)[0];
    if (trim(strtolower($type)) !== 'application/json') {
        lead_admin_response(415, 'invalid_type');
    }
    $body = file_get_contents('php://input', false, null, 0, 8193);
    $decoded = is_string($body) && strlen($body) <= 8192 ? json_decode($body, true) : null;
    if (!is_array($decoded)) {
        lead_admin_response(400, 'invalid_body');
    }
    return $decoded;
}

function lead_admin_allow_login(): bool
{
    $ip = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return lead_update_json(LEAD_PRIVATE_DIR . '/login-limits.json', function (array &$attempts) use ($ip) {
        $now = time();
        $attempts = array_filter($attempts, static function (array $entry) use ($now) {
            return $entry['until'] > $now;
        });
        $attempt = $attempts[$ip] ?? ['count' => 0, 'until' => $now + 900];
        if ($attempt['count'] >= 8) {
            return false;
        }
        $attempt['count']++;
        $attempts[$ip] = $attempt;
        return true;
    });
}

function lead_admin_session(): void
{
    $dir = LEAD_PRIVATE_DIR . '/sessions';
    if (!is_dir($dir) && !@mkdir($dir, 0700) && !is_dir($dir)) {
        throw new RuntimeException('Could not create session directory');
    }
    session_name(LEAD_SESSION_NAME);
    session_cache_limiter('');
    if (!session_start([
        'save_path' => $dir,
        'use_strict_mode' => true,
        'use_only_cookies' => true,
        'gc_maxlifetime' => LEAD_SESSION_LIFETIME,
        'cookie_lifetime' => LEAD_SESSION_LIFETIME,
        'cookie_path' => '/api/leads/',
        'cookie_secure' => true,
        'cookie_httponly' => true,
        'cookie_samesite' => 'Strict',
    ])) {
        throw new RuntimeException('Could not start lead session');
    }
}

function lead_admin_clear_session(): void
{
    $_SESSION = [];
    session_destroy();
    setcookie(LEAD_SESSION_NAME, '', [
        'expires' => time() - 3600, 'path' => '/api/leads/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict',
    ]);
}

function lead_admin_remove_device(string $endpoint): void
{
    lead_update_json(LEAD_PUSH_DEVICES, function (array &$devices) use ($endpoint) {
        unset($devices[hash('sha256', $endpoint)]);
    });
}

function lead_admin_list(?int $before): array
{
    $fields = array_fill_keys(['programName', 'parentName', 'parentPhone', 'date', 'time', 'childrenCount', 'comment', 'savedAt', 'createdAt'], true);
    $backup = array_values(lead_read_json(LEAD_DATA_DIR . '/leads-backup.json'));
    $end = $before === null ? count($backup) : min($before, count($backup));
    $start = max(0, $end - LEAD_PAGE_SIZE);
    $rows = [];
    for ($i = $end - 1; $i >= $start; $i--) {
        if (is_array($backup[$i])) {
            $rows[] = ['key' => $i] + array_intersect_key($backup[$i], $fields);
        }
    }
    return ['leads' => $rows, 'next' => $start > 0 ? $start : null];
}
