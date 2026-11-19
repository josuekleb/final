<?php
declare(strict_types=1);
date_default_timezone_set('America/Sao_Paulo');
$config = require __DIR__ . '/config.php';
session_name($config['session_name']);
$basePath = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/p4/api/index.php')), '/');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => ($basePath !== '' ? $basePath : '') . '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
function db(): PDO {
    global $config;
    $pdo = new PDO($config['dsn'], $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '-03:00'");
    return $pdo;
}
function out(array $value, int $status = 200): never { http_response_code($status); echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit; }
function error_out(int $status, string $message): never { out(['error' => $message], $status); }
function method_is(string $method): void { if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) error_out(405, 'Method not allowed.'); }
function me(): ?array { return $_SESSION['agendly_user'] ?? null; }
function need_user(?string $type = null): array { $user = me(); if (!$user) error_out(401, 'Sign in to continue.'); if ($type && $user['tipo'] !== $type) error_out(403, 'Your account is not allowed to perform this action.'); return $user; }
function sign_in(array $user): void { session_regenerate_id(true); $_SESSION['agendly_user'] = ['id' => (int)$user['id'], 'tipo' => $user['tipo'], 'nome' => $user['nome'], 'email' => $user['email']]; $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); }
function require_csrf(): void { $sent = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''); $known = (string)($_SESSION['csrf_token'] ?? ''); if ($sent === '' || $known === '' || !hash_equals($known, $sent)) error_out(403, 'Session expired. Reload the page and try again.'); }
function public_store(array $row): array { $store = isset($row['vitrine']) ? $row['vitrine'] : (json_decode($row['vitrine_json'] ?? '{}', true) ?: []); if(is_array($store['profile']??null)){foreach(['avatar','banner'] as $imageField)if(!valid_store_image($store['profile'][$imageField]??''))$store['profile'][$imageField]=''; if(isset($row['email'])&&mb_strtolower(trim((string)($store['profile']['email']??'')))===mb_strtolower((string)$row['email']))$store['profile']['email']='';} $profile = $store['profile'] ?? []; return ['id' => (int)$row['id'], 'name' => $row['nome'] ?? ($profile['name'] ?? ''), 'category' => $row['categoria'] ?? ($profile['category'] ?? ''), 'description' => $row['descricao'] ?? ($profile['tagline'] ?? ''), 'address' => $row['endereco'] ?? ($profile['location'] ?? ''), 'phone' => $row['telefone'] ?? ($profile['phone'] ?? ''), 'published' => (bool)($row['publicado'] ?? true), 'store' => $store]; }
function active_professionals(array $store): array {
    $professionals = [];
    foreach ((is_array($store['blocks'] ?? null) ? $store['blocks'] : []) as $block) {
        if (!is_array($block)) continue;
        if (($block['type'] ?? '') !== 'team' || empty($block['active'])) continue;
        foreach ((is_array($block['items'] ?? null) ? $block['items'] : []) as $item) {
            if (!is_array($item)) continue;
            $name = mb_substr(trim((string)($item['name'] ?? '')), 0, 160);
            if (empty($item['active']) || $name === '') continue;
            $professionals[mb_strtolower($name)] = $name;
        }
    }
    return array_values($professionals);
}
function resolve_professional(array $store, string $requested): string {
    $available = active_professionals($store);
    if (!$available) {
        if ($requested !== '' && mb_strtolower($requested) !== mb_strtolower('Equipe do estabelecimento')) {
            error_out(422, 'Profissional indisponível. Atualize a página e tente novamente.');
        }
        return 'Equipe do estabelecimento';
    }
    foreach ($available as $name) {
        if (mb_strtolower(trim($requested)) === mb_strtolower($name)) return $name;
    }
    error_out(422, 'Escolha um profissional ativo para este estabelecimento.');
}
function valid_store_image(mixed $value): bool {
    return is_string($value)
        && strlen($value) <= 1700000
        && ($value === '' || preg_match('/^data:image\/jpeg;base64,[A-Za-z0-9+\/]+={0,2}$/D', $value) === 1);
}
function parse_schedule_time(mixed $value): ?int {
    if (!is_string($value) || preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $value) !== 1) return null;
    [$hour, $minute] = array_map('intval', explode(':', $value));
    return $hour * 60 + $minute;
}
function business_hours_for_date(array $store, string $date): ?array {
    $hours = null;
    foreach ((is_array($store['blocks'] ?? null) ? $store['blocks'] : []) as $block) {
        if (is_array($block) && ($block['type'] ?? '') === 'hours' && !empty($block['active'])) {
            $hours = $block;
            break;
        }
    }
    if (!$hours || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date) || !checkdate((int)substr($date, 5, 2), (int)substr($date, 8, 2), (int)substr($date, 0, 4))) return null;
    $schedule = is_array($hours['schedule'] ?? null) ? $hours['schedule'] : [];
    foreach ((is_array($schedule['closures'] ?? null) ? $schedule['closures'] : []) as $closure) {
        if (is_array($closure) && ($closure['date'] ?? '') === $date) return null;
    }
    $dayIndex = (int)(new DateTimeImmutable($date))->format('w');
    $days = is_array($schedule['days'] ?? null) ? $schedule['days'] : [];
    $day = $days[(string)$dayIndex] ?? $days[$dayIndex] ?? null;
    if (!is_array($day) || !empty($day['closed'])) return null;
    $open = parse_schedule_time($day['open'] ?? null);
    $close = parse_schedule_time($day['close'] ?? null);
    if ($open === null || $close === null || $open >= $close) return null;
    $rawBreakStart = $day['breakStart'] ?? '';
    $rawBreakEnd = $day['breakEnd'] ?? '';
    $breakStart = parse_schedule_time($rawBreakStart);
    $breakEnd = parse_schedule_time($rawBreakEnd);
    if (($rawBreakStart !== '' && $breakStart === null) || ($rawBreakEnd !== '' && $breakEnd === null)) return null;
    if (($breakStart === null) !== ($breakEnd === null)) return null;
    if ($breakStart !== null && ($breakStart < $open || $breakEnd > $close || $breakStart >= $breakEnd)) return null;
    return ['open' => $open, 'close' => $close, 'breakStart' => $breakStart, 'breakEnd' => $breakEnd];
}
function valid_operating_slot(array $store, string $date, string $startTime, string $endTime): bool {
    $hours = business_hours_for_date($store, $date);
    $start = parse_schedule_time($startTime);
    $end = parse_schedule_time($endTime);
    if (!$hours || $start === null || $end === null || $start < $hours['open'] || $end > $hours['close'] || $start >= $end) return false;
    if (($start - $hours['open']) % 30 !== 0) return false;
    return $hours['breakStart'] === null || $start >= $hours['breakEnd'] || $end <= $hours['breakStart'];
}
function valid_future_slot(string $date, string $time): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time)) return false;
    $value = $date . ' ' . $time;
    $slot = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $value);
    $errors = DateTimeImmutable::getLastErrors();
    return $slot !== false
        && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))
        && $slot->format('Y-m-d H:i') === $value
        && $slot > new DateTimeImmutable();
}
function enforce_api_rate_limit(PDO $pdo, string $action, int $limit, int $windowSeconds): void {
    global $config;
    $key = (string)($config['password'] ?: 'agendly-local-rate-limit');
    $client = hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), $key);
    $windowSeconds = max(60, $windowSeconds);
    $q = $pdo->prepare(
        'INSERT INTO api_rate_limits (action, client_hash, window_started_at, attempts) VALUES (?, ?, NOW(), 1)
         ON DUPLICATE KEY UPDATE
           attempts = IF(window_started_at < DATE_SUB(NOW(), INTERVAL ' . $windowSeconds . ' SECOND), 1, LEAST(attempts + 1, 65535)),
           window_started_at = IF(window_started_at < DATE_SUB(NOW(), INTERVAL ' . $windowSeconds . ' SECOND), NOW(), window_started_at)'
    );
    $q->execute([$action, $client]);
    $q = $pdo->prepare('SELECT attempts FROM api_rate_limits WHERE action=? AND client_hash=?');
    $q->execute([$action, $client]);
    if ((int)$q->fetchColumn() > $limit) error_out(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    if (random_int(1, 100) === 1) {
        $pdo->exec('DELETE FROM api_rate_limits WHERE window_started_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
    }
}
function valid_document(string $document, string $type): bool {
    if ($type === 'cliente') { if (strlen($document) !== 11 || preg_match('/^(\d)\1{10}$/', $document)) return false; for ($turn = 9; $turn < 11; $turn++) { $sum = 0; for ($i = 0; $i < $turn; $i++) $sum += (int)$document[$i] * ($turn + 1 - $i); $digit = ($sum * 10) % 11; if ($digit === 10) $digit = 0; if ($digit !== (int)$document[$turn]) return false; } return true; }
    if (strlen($document) !== 14 || preg_match('/^(\d)\1{13}$/', $document)) return false;
    $weights = [[5,4,3,2,9,8,7,6,5,4,3,2],[6,5,4,3,2,9,8,7,6,5,4,3,2]];
    for ($turn = 12; $turn < 14; $turn++) { $sum = 0; foreach ($weights[$turn - 12] as $index => $weight) $sum += (int)$document[$index] * $weight; $remainder = $sum % 11; $digit = $remainder < 2 ? 0 : 11 - $remainder; if ($digit !== (int)$document[$turn]) return false; }
    return true;
}
