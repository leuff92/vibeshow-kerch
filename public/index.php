<?php
$target = __DIR__ . '/index.html';

if (is_file($target)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($target);
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=UTF-8');
echo 'index.html not found in site root';

