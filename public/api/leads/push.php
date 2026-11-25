<?php
declare(strict_types=1);

const LEAD_DATA_DIR = __DIR__ . '/data';
const LEAD_PRIVATE_DIR = __DIR__ . '/../../../vibeshow-private';
const LEAD_PUSH_DEVICES = LEAD_PRIVATE_DIR . '/push-devices.json';
const LEAD_PUSH_AUTOLOAD = __DIR__ . '/vendor/autoload.php';
const LEAD_APP_ORIGIN = 'https://vibeshow-kerch.ru';

function lead_push_settings(): ?array
{
    $path = LEAD_PRIVATE_DIR . '/leads.ini';
    if (!is_file($path)) {
        return null;
    }
    $settings = @parse_ini_file($path, false, INI_SCANNER_RAW);
    if (!is_array($settings)
        || !preg_match('/\A[a-f0-9]{64}\z/', $settings['PASSWORD_HASH'] ?? '')
        || !lead_push_key($settings['VAPID_PUBLIC_KEY'] ?? null, 65)
        || !lead_push_key($settings['VAPID_PRIVATE_KEY'] ?? null, 32)) {
        return null;
    }

    return $settings;
}

function lead_push_key($value, int $length): bool
{
    if (!is_string($value) || strlen($value) !== (int) ceil($length * 8 / 6)
        || !preg_match('/\A[A-Za-z0-9_-]+\z/', $value)) {
        return false;
    }
    $decoded = base64_decode(strtr($value, '-_', '+/'), true);
    return $decoded !== false && strlen($decoded) === $length && ($length !== 65 || $decoded[0] === "\x04");
}

function lead_push_ready(): bool
{
    return PHP_VERSION_ID >= 80200 && is_file(LEAD_PUSH_AUTOLOAD)
        && extension_loaded('curl') && extension_loaded('openssl') && extension_loaded('mbstring');
}

function lead_push_endpoint($url): bool
{
    if (!is_string($url) || strlen($url) > 2048
        || !preg_match('#\Ahttps://[a-z0-9.-]+/[A-Za-z0-9._~/!$&\'()*+,;=:@%?\[\]-]+\z#Di', $url)) {
        return false;
    }
    $host = parse_url($url, PHP_URL_HOST);
    return is_string($host) && (preg_match('/\A(?:[a-z0-9-]+\.)+push\.apple\.com\z/i', $host)
        || in_array(strtolower($host), ['fcm.googleapis.com', 'updates.push.services.mozilla.com'], true));
}

function lead_read_json(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $contents = file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException('Could not read lead storage');
    }
    $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException('Invalid lead storage');
    }
    return $data;
}

function lead_update_json(string $path, callable $update)
{
    $dir = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create private lead storage');
    }
    $lock = fopen($path . '.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Could not open lead storage lock');
    }
    $temp = null;
    try {
        if (!flock($lock, LOCK_EX)) {
            throw new RuntimeException('Could not lock lead storage');
        }
        clearstatcache(true, $path);
        $data = lead_read_json($path);
        $result = $update($data);
        $json = json_encode($data, JSON_THROW_ON_ERROR);
        $temp = tempnam($dir, 'lead-');
        if (!$temp || file_put_contents($temp, $json) !== strlen($json) || !rename($temp, $path)) {
            throw new RuntimeException('Could not update lead storage');
        }
        return $result;
    } finally {
        if ($temp && is_file($temp)) {
            unlink($temp);
        }
        fclose($lock);
    }
}

function lead_send_push(array $settings, ?string $onlyEndpoint = null): int
{
    if (!lead_push_ready()) {
        return 0;
    }
    $devices = lead_read_json(LEAD_PUSH_DEVICES);
    if ($onlyEndpoint !== null) {
        $devices = array_intersect_key($devices, [hash('sha256', $onlyEndpoint) => true]);
    }
    if (!$devices) {
        return 0;
    }

    require_once LEAD_PUSH_AUTOLOAD;
    $push = new \Minishlink\WebPush\WebPush([
        'VAPID' => [
            'subject' => LEAD_APP_ORIGIN,
            'publicKey' => $settings['VAPID_PUBLIC_KEY'],
            'privateKey' => $settings['VAPID_PRIVATE_KEY'],
        ],
    ], ['TTL' => 3600, 'urgency' => 'high'], 4, ['allow_redirects' => false, 'connect_timeout' => 2]);

    // Only the generic notification type leaves the site, never lead data.
    $payload = $onlyEndpoint === null ? '{"type":"lead"}' : '{"type":"test"}';
    foreach ($devices as $device) {
        if (lead_push_endpoint($device['endpoint'] ?? null)) {
            $push->queueNotification(\Minishlink\WebPush\Subscription::create($device), $payload);
        }
    }

    $accepted = 0;
    $expired = [];
    foreach ($push->flush() as $report) {
        if ($report->isSuccess()) {
            $accepted++;
        } elseif ($report->isSubscriptionExpired()) {
            $expired[] = hash('sha256', $report->getEndpoint());
        } else {
            $status = $report->getResponse() ? $report->getResponse()->getStatusCode() : 0;
            error_log('Lead push not accepted. HTTP status: ' . $status);
        }
    }
    if ($expired) {
        lead_update_json(LEAD_PUSH_DEVICES, function (array &$current) use ($expired, $devices) {
            foreach ($expired as $key) {
                if (($current[$key] ?? null) === ($devices[$key] ?? null)) {
                    unset($current[$key]);
                }
            }
        });
    }
    return $accepted;
}
