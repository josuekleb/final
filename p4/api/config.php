<?php
declare(strict_types=1);

$environment = strtolower(trim((string)(getenv('AGENDLY_ENV') ?: '')));
$host = strtolower(preg_replace('/:\\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost')));
$isLocalHost = in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true);
$production = !$isLocalHost || ($environment !== '' && $environment !== 'local');
$dsn = getenv('AGENDLY_DB_DSN') ?: ($production ? '' : 'mysql:host=127.0.0.1;port=3307;dbname=agendly_p4;charset=utf8mb4');
$user = getenv('AGENDLY_DB_USER') ?: ($production ? '' : 'root');
$password = getenv('AGENDLY_DB_PASSWORD') ?: '';
$baseUrl = getenv('AGENDLY_BASE_URL') ?: '';
$mailFrom = getenv('AGENDLY_MAIL_FROM') ?: ($production ? '' : 'no-reply@localhost');
if ($production && ($dsn === '' || $user === '' || $password === '')) {
    throw new RuntimeException('Configure AGENDLY_DB_DSN, AGENDLY_DB_USER and AGENDLY_DB_PASSWORD for production.');
}
if ($production && (parse_url($baseUrl, PHP_URL_SCHEME) !== 'https' || !filter_var($baseUrl, FILTER_VALIDATE_URL))) {
    throw new RuntimeException('Configure AGENDLY_BASE_URL with the official HTTPS URL.');
}
if ($production && !filter_var($mailFrom, FILTER_VALIDATE_EMAIL)) {
    throw new RuntimeException('Configure AGENDLY_MAIL_FROM with a valid address on your domain.');
}

return [
    'dsn' => $dsn,
    'user' => $user,
    'password' => $password,
    'session_name' => 'agendly_session',
    'base_url' => $baseUrl,
    'mail_from' => $mailFrom,
];