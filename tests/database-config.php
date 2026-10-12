<?php
require __DIR__ . '/../vendor/autoload.php';

use App\Config\DatabaseConfig;

$valid = ['host' => 'localhost', 'port' => 3306, 'database' => 'test_events',
    'username' => 'test_user', 'password' => 'test-only-password'];
if (DatabaseConfig::validar($valid) !== $valid) throw new RuntimeException('Configuração válida alterada.');
foreach ([['host' => 'localhost;dbname=other'], ['database' => 'test;charset=latin1'],
    ['port' => 0], ['port' => 65536], ['password' => ''], ['username' => ''],
    ['password' => []], ['host' => "local\0host"]] as $change) {
    try { DatabaseConfig::validar(array_replace($valid, $change)); }
    catch (RuntimeException $error) {
        if (str_contains($error->getMessage(), $valid['password'])) throw new RuntimeException('Erro expõe senha.');
        continue;
    }
    throw new RuntimeException('Configuração inválida aceita.');
}
foreach (['host' => 'IDEAU_DB_HOST', 'port' => 'IDEAU_DB_PORT', 'database' => 'IDEAU_DB_NAME',
    'username' => 'IDEAU_DB_USER', 'password' => 'IDEAU_DB_PASSWORD'] as $key => $env) {
    putenv($env . '=' . $valid[$key]);
}
if (DatabaseConfig::carregar() !== $valid) throw new RuntimeException('Ambiente não tem precedência.');
putenv('IDEAU_DB_PASSWORD=');
try { DatabaseConfig::carregar(); }
catch (RuntimeException) {
    echo "OK: configuração do banco, precedência do ambiente, DSN protegida e senha ausente recusada.\n";
    exit(0);
}
throw new RuntimeException('Senha ausente usou credencial local implicitamente.');
