<?php

namespace App\Controller;

use App\Service\UsuarioService;

require_once __DIR__ . '/../../vendor/autoload.php';

header('Content-Type: application/json');

\App\Service\RequestSecurity::session();
// As operações antigas de usuários são exclusivamente administrativas.
\App\Service\RequestSecurity::organizer();
if ($_SERVER['REQUEST_METHOD'] === 'POST') \App\Service\RequestSecurity::csrf();

    try {
        $service = new UsuarioService();
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['salvar'])) {
            $service->cadastrarUsuario($_POST);

            echo json_encode([
                'success' => true,
                'message' => 'Usuário cadastrado com sucesso!'
            ]);

            exit();
        } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
            $user = $service->realizarLogin($_POST['emailCPF'], $_POST['senha']);

            echo json_encode([
                'success' => true,
                'message' => 'Login realizado com sucesso!',
                'user' => $user
            ]);

            exit();
        } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['editar'])) {
            $service->editarUsuario($_POST);

            echo json_encode([
                'success' => true,
                'message' => 'Usuário cadastrado com sucesso!'
            ]);

            exit();
        } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['excluir'])) {
            $service->excluirUsuario($_POST['id']);

            echo json_encode([
                'success' => true,
                'message' => 'Usuário cadastrado com sucesso!'
            ]);
            
            exit();
        }

        echo json_encode([
            'success' => false,
            'message' => 'Requisição inválida.'
        ]);

    } catch (\Exception $e) {

        echo json_encode([
            'success' => false,
            'message' => 'Não foi possível processar a solicitação.'
        ]);
    }
?>