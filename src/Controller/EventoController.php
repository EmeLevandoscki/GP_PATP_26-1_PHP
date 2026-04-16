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
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['editar'])) {
        var_dump($_POST);
        $service->editarEvento($_POST);

        $_SESSION['sucesso'] = 'Evento editado com sucesso!';
        header('Location: ../../public/index.php');
        exit();
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['excluir'])) {
        $service->excluirEvento($_POST['id']);

        $_SESSION['sucesso'] = 'Evento excluído com sucesso!';
        header('Location: ../../public/index.php');
        exit();
    }
?>