<?php
declare(strict_types=1);

$root = __DIR__;
$path = (string)($_GET['path'] ?? '');
if ($path === '') $path = 'index.html';
$path = str_replace('\\', '/', rawurldecode($path));
if (str_contains($path, '..') || str_starts_with($path, '/') || !preg_match('/^[a-zA-Z0-9_ .\/-]+\.html$/', $path)) {
    http_response_code(404);
    exit('Page not found.');
}
$file = realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path));
$realRoot = realpath($root);
if (!$file || !$realRoot || !str_starts_with($file, $realRoot . DIRECTORY_SEPARATOR) || !is_file($file)) {
    http_response_code(404);
    exit('Page not found.');
}

$publicPages = [
    'login.html', 'cadastro.html', 'recuperarsenha.html', 'redefinirsenha.html',
    'cliente/logincliente.html', 'cliente/cadastrocliente.html',
    'loja/loginloja.html', 'loja/cadastroloja.html',
    'cliente/Termos de Uso.html', 'cliente/Privacidade.html',
];
$config = require $root . '/api/config.php';
session_name($config['session_name']);
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/p4/page.php')), '/') . '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

if (!in_array($path, $publicPages, true)) {
    $user = $_SESSION['agendly_user'] ?? null;
    if (!is_array($user) || empty($user['id']) || !in_array($user['tipo'] ?? '', ['cliente', 'loja'], true)) {
        $login = str_starts_with($path, 'loja/') ? 'loja/loginloja.html' : 'cliente/logincliente.html';
        header('Location: ' . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/p4/page.php')), '/') . '/' . $login, true, 302);
        exit;
    }
    try {
        $pdo = new PDO($config['dsn'], $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $check = $pdo->prepare('SELECT tipo FROM usuarios WHERE id=? AND ativo=1');
        $check->execute([(int)$user['id']]);
        $account = $check->fetch();
    } catch (Throwable $error) {
        error_log('Agendly page guard: ' . $error->getMessage());
        http_response_code(503);
        exit('Service temporarily unavailable. Please try again later.');
    }
    if (!$account || $account['tipo'] !== $user['tipo']) {
        $_SESSION = [];
        session_destroy();
        $login = str_starts_with($path, 'loja/') ? 'loja/loginloja.html' : 'cliente/logincliente.html';
        header('Location: ' . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/p4/page.php')), '/') . '/' . $login, true, 302);
        exit;
    }
    if (str_starts_with($path, 'loja/') && $account['tipo'] !== 'loja') {
        header('Location: ' . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/p4/page.php')), '/') . '/cliente/logincliente.html', true, 302);
        exit;
    }
    if (str_starts_with($path, 'cliente/') && $account['tipo'] !== 'cliente') {
        header('Location: ' . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/p4/page.php')), '/') . '/loja/loginloja.html', true, 302);
        exit;
    }
}

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');
readfile($file);
