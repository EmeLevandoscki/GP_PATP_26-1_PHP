<?php
// Isola a auditoria: testes nunca escrevem no histórico real de cancelamentos.
$db->exec(str_replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE IF NOT EXISTS',
    file_get_contents(__DIR__ . '/../db/dashboard_cancelamentos.sql')));
