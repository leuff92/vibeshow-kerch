<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/(?:\.|api/leads/(?:data|vendor)(?:/|$))#', $path)) {
    http_response_code(403);
    exit;
}
if ($path === '/leads/app.webmanifest') {
    header('Content-Type: application/manifest+json');
    readfile($_SERVER['DOCUMENT_ROOT'] . '/leads/app.webmanifest');
    return true;
}
return false;
