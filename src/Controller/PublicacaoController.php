<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\PublicacaoService;

\App\Service\RequestSecurity::session();
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
            $receipt = \App\Service\ComprovanteService::atualizar(Conexao::getConexao(), $receipt);
            $_SESSION['registration_receipts'][$id] = $receipt;
            $receipts[] = ['id' => $id, 'eventId' => $receipt['eventId'], 'name' => $receipt['name'], 'reviewStatus' => $receipt['reviewStatus'] ?? 'approved'];
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
            $config = \App\Service\OrganizerAccess::config();
            if (!$config['password_hash']) responder(['message' => 'O acesso do organizador precisa ser configurado no servidor.'], 503);
            if (!\App\Service\OrganizerAccess::attempt($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
                header('Retry-After: 900');
                responder(['message' => 'Muitas tentativas. Aguarde 15 minutos para tentar novamente.'], 429);
            }
            $email = $config['email'];
            $validPassword = is_string($data['password'] ?? null) && strlen($data['password']) <= 1024
                && password_verify($data['password'], $config['password_hash']);
            if (!is_string($data['email'] ?? null) || $data['email'] !== $email || !$validPassword) {
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
        if ($action === 'review-registration') {
            foreach (['eventId', 'id', 'decision'] as $field) {
                if (!is_string($data[$field] ?? null) || $data[$field] === '') throw new InvalidArgumentException('Informe a inscrição e a ação.');
            }
            responder((new PublicacaoService(Conexao::getConexao()))->revisarInscricao($data['eventId'], $data['id'], $data['decision'], $_SESSION['publication_organizer']));
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
    if ($method === 'GET' && $action === 'dashboard') {
        if (!isset($_SESSION['publication_organizer'])) responder(['message' => 'Entre como organizador para continuar.'], 401);
        responder((new \App\Service\DashboardService(Conexao::getConexao()))->resumo($_SESSION['publication_organizer'], $_GET));
    }
    if ($method === 'GET' && $action === 'registrations') {
        if (!isset($_SESSION['publication_organizer'])) responder(['message' => 'Entre como organizador para continuar.'], 401);
        $service = new PublicacaoService(Conexao::getConexao());
        responder($service->listarInscricoes($_SESSION['publication_organizer']));
    }
    if ($method === 'GET' && $action === 'event') {
        $id = $_GET['id'] ?? '';
        $accessToken = $_GET['accessToken'] ?? '';
        if (!is_string($id) || !is_string($accessToken)) throw new InvalidArgumentException('Link de evento inválido.');
        responder((new PublicacaoService(Conexao::getConexao()))->eventoPublico($id, $accessToken));
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
