<?php
    namespace App\Controller;
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    use App\Service\EventoService;
    require_once __DIR__ . '/../../vendor/autoload.php';

    session_start();

    try {
    $service = new EventoService();

    if($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['salvar'])) {
        $service->cadastrarEvento($_POST);
        
        $_SESSION['sucesso'] = 'Evento cadastrado com sucesso!';
        header('Location: ../../public/index.php');
        exit();
    }  else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['editar'])) {
        $service->editarEvento($_POST);

        $_SESSION['sucesso'] = 'Evento editado com sucesso!';
        header('Location: ../../public/index.php');
        exit();
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['excluir'])) {
        $service->excluirEvento($_POST['id']);

        $_SESSION['sucesso'] = 'Evento excluído com sucesso!';
        header('Location: ../../public/index.php');
        exit();
    } else if($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['reservar'])) {
        $service->realizarReserva($_POST);
        
        $_SESSION['sucesso'] = 'Reserva realizada com sucesso!';
        header('Location: ../../public/index.php');
        exit();
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inscrever'])) {
        header('Content-Type: application/json');
        try {
            echo json_encode($service->realizarInscricao($_POST), JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
        exit();
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'eventos':
                $admin = ($_GET['scope'] ?? '') === 'admin';
                if ($admin && !isset($_SESSION['publication_organizer'])) {
                    http_response_code(401);
                    echo json_encode(['message' => 'Entre como organizador para consultar o histórico.']);
                    exit();
                }
                $eventos = $service->listarEventos($admin);
        
                echo json_encode($eventos);
                exit();
                break;
            case 'detalhes':
                $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
                $evento = $service->retornaDetalhesEvento($id);

                echo json_encode($evento);
                exit();
                break;
            case 'categorias':
                $categorias = $service->listarCategorias();
                
                echo json_encode($categorias);
                exit();
                break;
            case 'qtdAtivos':
                $ativos = $service->retornaQtdAtivos();

                echo json_encode($ativos);
                exit();
                break;
            case 'inscricoes_evento':
                $inscricoes = $service->listarInscricoes((int) $_GET['id']);

                echo json_encode($inscricoes);
                exit();
                break;
            case 'qtd_inscricoes_evento':
                $qtdInscricoes = $service->retornaQtdInscricoes((int) $_GET['id']);

                echo json_encode(['count' => $qtdInscricoes]);
                exit();
                break;
            default:
                echo '';
                exit();
                break;
        }
    }
    } catch (\Throwable $e) {
        error_log('EventoController erro: ' . $e->getMessage());

        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => true,
                'message' => 'Erro ao acessar os dados. Tente novamente mais tarde.'
            ]);
            exit();
        }

        $_SESSION['erro'] = 'Ocorreu um erro ao processar sua solicitação.';
        header('Location: ../../public/index.php');
        exit();
    }
?>
