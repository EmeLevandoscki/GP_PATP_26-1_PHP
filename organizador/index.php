<?php
require_once __DIR__ . '/../src/Config/runtime.php';
require_once __DIR__ . '/../vendor/autoload.php';
\App\Service\RequestSecurity::organizerPage('../ideau_eventos/login.html?retorno=organizador');

// O HTML so e enviado depois da validacao da sessao existente.
$mostrarBotaoPainel = true;
$homePrefix = '../';
require __DIR__ . '/../src/View/Front/html/home.php';
