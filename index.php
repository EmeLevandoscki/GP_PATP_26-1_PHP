<?php
// Mantem os links antigos da raiz como acesso publico.
require_once __DIR__ . '/src/Config/runtime.php';
require_once __DIR__ . '/vendor/autoload.php';
\App\Service\RequestSecurity::session();
session_write_close();

$mostrarBotaoPainel = false;
$homePrefix = '';
require __DIR__ . '/src/View/Front/html/home.php';
