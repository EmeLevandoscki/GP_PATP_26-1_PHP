<?php
    namespace App\Controller;
    use App\Service\EventoService;
    require_once __DIR__ . '/../../vendor/autoload.php';

    session_start();

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
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'];
        
        switch ($action) {
            case 'eventos':
                $eventos = $service->listarEventos();
        
                echo json_encode($eventos);
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
            default:
                echo '';
                exit();
                break;
        }
    }
?>