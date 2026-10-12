<?php
// Carregar antes de autoload, sessões ou saída HTML em todas as entradas web.
// Erros de inicialização/sintaxe exigem também .user.ini ou php.ini no servidor.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
ini_set('zend.exception_ignore_args', '1');
ini_set('error_log_mode', '0600');

// Preserva o destino privado configurado pelo administrador no PHP.
// Sem destino explícito, evita criar error_log dentro da pasta pública.
if (trim((string) ini_get('error_log')) === '') {
    ini_set('error_log', 'syslog');
}
