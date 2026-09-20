<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\PublicacaoService;

session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function responder(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

try {
    $action = $_GET['action'] ?? 'events';
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET' && $action === 'session') {
        $_SESSION['publication_csrf'] ??= bin2hex(random_bytes(32));
        $receipts = [];
        foreach ($_SESSION['registration_receipts'] ?? [] as $id => $receipt) {
            if (!\App\Service\ComprovanteService::ativa(Conexao::getConexao(), $receipt)) {
                unset($_SESSION['registration_receipts'][$id]);
                $_SESSION['cancelled_receipts'][$id] = true;
                continue;
            }
            $receipts[] = ['id' => $id, 'eventId' => $receipt['eventId'], 'name' => $receipt['name']];
        }
        responder(['authenticated' => isset($_SESSION['publication_organizer']), 'csrf' => $_SESSION['publication_csrf'], 'receipts' => $receipts]);
    }
    if ($method === 'POST') {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!isset($_SESSION['publication_csrf']) || !hash_equals($_SESSION['publication_csrf'], $token)) {
            responder(['message' => 'Sua sessão expirou. Entre novamente.'], 403);
        }
        $raw = file_get_contents('php://input', false, null, 0, 3 * 1024 * 1024 + 1);
        if (strlen($raw) > 3 * 1024 * 1024) responder(['message' => 'O arquivo enviado é muito grande.'], 413);
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($data)) responder(['message' => 'Dados inválidos.'], 422);
        if ($action === 'login') {
            // Mantém o acesso de demonstração já usado pelo painel. O servidor
            // também permite configurar essas credenciais por ambiente.
            $email = getenv('IDEAU_ORGANIZER_EMAIL') ?: 'organizador@ideau.edu.br';
            $password = getenv('IDEAU_ORGANIZER_PASSWORD') ?: 'ideau2026';
            if (($data['email'] ?? '') !== $email || !hash_equals($password, (string) ($data['password'] ?? ''))) {
                responder(['message' => 'E-mail ou senha incorretos.'], 401);
            }
            session_regenerate_id(true);
            $_SESSION['publication_organizer'] = $email;
            responder(['authenticated' => true]);
        }
        if ($action === 'register') {
            $service = new PublicacaoService(Conexao::getConexao());
            responder($service->inscrever($data));
        }
        if (!isset($_SESSION['publication_organizer'])) responder(['message' => 'Entre como organizador para salvar.'], 401);
        if ($action === 'logout') {
            unset($_SESSION['publication_organizer']);
            responder(['success' => true]);
        }
        if ($action === 'save') {
            $service = new PublicacaoService(Conexao::getConexao());
            responder($service->salvar($data, $_SESSION['publication_organizer']));
        }
        if ($action === 'close') {
            if (!is_string($data['id'] ?? null)) throw new InvalidArgumentException('Informe o evento.');
            if (ctype_digit($data['id'])) {
                (new \App\Service\EventoService())->encerrarEvento((int) $data['id']);
                responder(['success' => true]);
            }
            $service = new PublicacaoService(Conexao::getConexao());
            responder($service->encerrar($data['id'], $_SESSION['publication_organizer']));
        }
    }
    if ($method === 'GET' && $action === 'registrations') {
        if (!isset($_SESSION['publication_organizer'])) responder(['message' => 'Entre como organizador para continuar.'], 401);
        $service = new PublicacaoService(Conexao::getConexao());
        responder($service->listarInscricoes($_SESSION['publication_organizer']));
    }
    if ($method === 'GET' && $action === 'events') {
        $organizer = null;
        if (($_GET['scope'] ?? '') === 'admin') {
            if (!isset($_SESSION['publication_organizer'])) responder(['message' => 'Entre como organizador para continuar.'], 401);
            $organizer = $_SESSION['publication_organizer'];
        }
        $service = new PublicacaoService(Conexao::getConexao());
        responder($service->listar($organizer));
    }
    responder(['message' => 'Requisição inválida.'], 400);
} catch (InvalidArgumentException | JsonException $error) {
    responder(['message' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('PublicacaoController: ' . $error->getMessage());
    responder(['message' => 'Não foi possível acessar as publicações. Tente novamente.'], 500);
}
