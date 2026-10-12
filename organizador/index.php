<?php
require_once __DIR__ . '/../src/Config/runtime.php';

// A autenticação continua sendo exigida pelo painel e pelas APIs.
header('Location: ../ideau_eventos/login.html', true, 302);
exit;
