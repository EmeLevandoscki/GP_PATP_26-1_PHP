<?php
namespace App\Service;

final class RequestSecurity
{
    public static function session(): void
    {
        ini_set('display_errors', '0');
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start(['use_strict_mode' => true, 'cookie_httponly' => true,
                'cookie_samesite' => 'Lax', 'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
        }
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
    }

    public static function deny(string $message, int $status): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function organizer(): void
    {
        if (empty($_SESSION['publication_organizer'])) self::deny('Entre como organizador para continuar.', 401);
    }

    public static function csrf(): void
    {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? '';
        if (!is_string($token) || empty($_SESSION['publication_csrf']) || !hash_equals($_SESSION['publication_csrf'], $token)) {
            self::deny('Atualize a página e tente novamente.', 403);
        }
    }
}
