const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function run(authenticated, extra = '', env = {}) {
  return execFileSync('php', [], {
    cwd: root, encoding: 'utf8', env: { ...process.env, ...env },
    input: `<?php
      session_start();
      register_shutdown_function(function () { session_destroy(); echo "\\nHTTP=" . (http_response_code() ?: 200); });
      $_SERVER['REQUEST_METHOD'] = 'GET';
      ${authenticated ? "$_SESSION['publication_organizer'] = 'diagnostic-readonly-test';" : ''}
      require 'organizador/diagnostico.php';
      ${extra}
    `
  });
}
const denied = run(false);
assert.match(denied, /HTTP=401/);
assert.doesNotMatch(denied, /PHP:|Banco configurado|Conexao MySQL/);

const invalidConfig = run(true, '', { IDEAU_DB_NAME: '' });
assert.match(invalidConfig, /Configuracao: FALHOU/);
assert.doesNotMatch(invalidConfig, /Conexao MySQL: OK/);

const result = run(true, `
  foreach ([1044, 1045, 1049, 1054, 1142, 1146, 2002, 2005, 2006, 9999] as $number) {
    $error = new PDOException('SENSITIVE_TEST_PASSWORD');
    $error->errorInfo = ['HY000', $number, 'SENSITIVE_TEST_PASSWORD'];
    echo "\\nTEST=" . diagnosticoErro($error);
  }
  $error = new PDOException('SENSITIVE_TEST_PASSWORD');
  $error->errorInfo = ['SENSITIVE_TEST_PASSWORD', 1045];
  echo "\\nTEST=" . diagnosticoErro($error);
`);
assert.match(result, /Conexao MySQL: OK/);
assert.match(result, /Publicacoes: consulta OK/);
assert.match(result, /Eventos antigos: consulta OK/);
assert.match(result, /MySQL 1045/);
assert.match(result, /SQLSTATE indisponivel/);
assert.doesNotMatch(result, /SENSITIVE_TEST_PASSWORD/);
console.log('OK: acesso exige organizador, configuracao invalida identificada, consultas locais somente leitura e erros sem credenciais.');
