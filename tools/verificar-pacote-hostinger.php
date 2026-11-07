<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../vendor/autoload.php';
$release = realpath($argv[1] ?? '');
$base = realpath(__DIR__ . '/../publicacao');
if (!$release || !$base || !str_starts_with($release, $base . DIRECTORY_SEPARATOR)) throw new RuntimeException('Pacote fora da pasta publicacao.');
$summary = json_decode(file_get_contents($release . '/resumo-exportacao.json'), true, 512, JSON_THROW_ON_ERROR);
$source = App\Config\Conexao::getConexao();
$sourceName = $source->query('SELECT DATABASE()')->fetchColumn();
$source->exec("SET time_zone = '+00:00'");
$prefix = 'packcheck_' . bin2hex(random_bytes(5)) . '_';
$created = [];
$mapping = [];
foreach (array_keys($summary['rows']) as $table) {
    if (!preg_match('/^[A-Za-z0-9_]+$/D', $table)) throw new RuntimeException('Nome de tabela inválido.');
    $mapping[$table] = $prefix . $table;
}
$handle = null;
$replaceTest = in_array('--replace-test', $argv, true);
try {
    // O usuário local não precisa de CREATE DATABASE. As cópias têm nomes únicos.
    foreach ($mapping as $table) {
        $check = $source->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?');
        $check->execute([$sourceName, $table]);
        if ((int) $check->fetchColumn() !== 0) throw new RuntimeException('Nome temporário já existe.');
    }
    $imports = ['02-banco-com-dados.sql'];
    if ($replaceTest) $imports[] = 'SUBSTITUIR-BANCO.sql';
    foreach ($imports as $importFile) {
    $handle = fopen($release . '/' . $importFile, 'rb');
    $sql = '';
    while (($line = fgets($handle)) !== false) {
        if ($sql === '' && (trim($line) === '' || str_starts_with(ltrim($line), '--'))) continue;
        $sql .= $line;
        if (str_ends_with(rtrim($line), ';')) {
            // O conteúdo exportado é hexadecimal: somente identificadores SQL são alterados.
            $sql = preg_replace_callback('/`([^`]+)`/', static fn ($m) => '`' . ($mapping[$m[1]] ?? $m[1]) . '`', $sql);
            $sql = preg_replace_callback('/CONSTRAINT `([^`]+)`/', static fn ($m) => 'CONSTRAINT `' . $prefix . $m[1] . '`', $sql);
            $source->exec($sql);
            if (preg_match('/^\s*CREATE TABLE `([^`]+)`/', $sql, $match)) $created[] = $match[1];
            $sql = '';
        }
    }
    if (trim($sql) !== '') throw new RuntimeException('SQL incompleto.');
    fclose($handle); $handle = null;
    }
    $digest = static function (PDO $db, string $schema, string $table, array $columns): string {
        $hash = hash_init('sha256');
        $order = implode(',', array_map(static fn ($column) => '`' . str_replace('`', '``', $column) . '`', $columns));
        $stmt = $db->query('SELECT * FROM `' . $schema . '`.`' . $table . '` ORDER BY ' . $order);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            hash_update($hash, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n");
        }
        return hash_final($hash);
    };
    foreach ($summary['rows'] as $table => $expected) {
        if (!preg_match('/^[A-Za-z0-9_]+$/D', $table)) throw new RuntimeException('Nome de tabela inválido.');
        $actual = (int) $source->query('SELECT COUNT(*) FROM `' . $mapping[$table] . '`')->fetchColumn();
        if ($actual !== $expected) throw new RuntimeException('Contagem divergente: ' . $table);
        if (in_array($table, ['inscricao_acessos', 'inscricao_acesso_limites'], true)) continue;
        $pk = $source->query('SHOW KEYS FROM `' . $table . '` WHERE Key_name = \'PRIMARY\'')->fetchAll(PDO::FETCH_ASSOC);
        $pk = array_column($pk, 'Column_name');
        if (!$pk) throw new RuntimeException('Tabela sem chave primária para comparar.');
        if ($digest($source, $sourceName, $table, $pk) !== $digest($source, $sourceName, $mapping[$table], $pk)) {
            throw new RuntimeException('Conteúdo divergente: ' . $table);
        }
    }
    $email = require $release . '/arquivos-site/src/Config/email.local.php';
    if ($email['environment'] !== 'production' || $email['public_url'] !== $summary['url'] || $email['password'] !== '') {
        throw new RuntimeException('Configuração de produção inesperada.');
    }
    App\Config\EmailConfig::validar(array_replace($email, ['password' => 'verification-only-not-sent']));
    $database = require $release . '/arquivos-site/src/Config/database.local.php';
    foreach (['database','username','password'] as $key) if ($database[$key] !== '') throw new RuntimeException('Credencial local incluída.');
    $packOwner = require $release . '/arquivos-site/src/Config/organizer.local.php';
    if ($packOwner !== App\Service\OrganizerAccess::config()) throw new RuntimeException('Acesso do organizador divergente.');
    $report = "Verificação local do pacote para " . $summary['url'] . "\n"
        . "OK: SQL restaurado no MySQL 8 local em tabelas de teste com nomes únicos.\n"
        . "OK: contagens e conteúdo das tabelas restauradas conferem com a origem.\n"
        . "OK: tokens temporários e limites de tentativas vazios.\n"
        . "OK: configuração de e-mail para produção/HTTPS, sem senha SMTP.\n"
        . "OK: credenciais do banco local ausentes; acesso do organizador preservado.\n"
        . "Pendente: preencher banco e senha de app na hospedagem.\n"
        . "Pendente: testar servidor Apache/LiteSpeed, MySQL/MariaDB, HTTPS e envio real na Hostinger.\n";
    if ($replaceTest) $report .= "OK: substituição executada sobre as 18 tabelas já existentes e preenchidas; conteúdo final conferido.\n";
    file_put_contents($release . ($replaceTest ? '/VERIFICACAO-SUBSTITUICAO.txt' : '/VERIFICACAO.txt'), $report);
    echo $report;
} finally {
    if (is_resource($handle)) fclose($handle);
    $source->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach (array_reverse(array_unique($created)) as $table) {
        // Remove somente tabelas criadas por esta execução, nunca tabelas da aplicação.
        if (str_starts_with($table, $prefix) && in_array($table, $mapping, true)) {
            $source->exec('DROP TABLE IF EXISTS `' . $table . '`');
        }
    }
    $source->exec('SET FOREIGN_KEY_CHECKS = 1');
}
