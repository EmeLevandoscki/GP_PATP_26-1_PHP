<?php
// Uso: php tools/preparar-hostinger.php https://seu-dominio.com
// Gera uma pasta nova; não altera configurações nem registros do ambiente local.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../vendor/autoload.php';

$root = dirname(__DIR__);
$url = rtrim($argv[1] ?? '', '/');
$parts = parse_url($url);
if (!filter_var($url, FILTER_VALIDATE_URL) || ($parts['scheme'] ?? '') !== 'https'
    || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) {
    fwrite(STDERR, "Informe a URL HTTPS do site.\n"); exit(1);
}
$release = $root . '/publicacao/hostinger-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
$site = $release . '/arquivos-site';
if (!mkdir($site, 0700, true)) throw new RuntimeException('Não foi possível criar o pacote.');
function writeRelease(string $path, string $content): void {
    if (!is_dir(dirname($path))) mkdir(dirname($path), 0700, true);
    if (file_put_contents($path, $content) !== strlen($content)) throw new RuntimeException('Falha ao gravar o pacote.');
}
function phpConfig(array $config): string { return "<?php\nreturn " . var_export($config, true) . ";\n"; }
function copyRelease(string $source, string $target): void {
    if (!is_dir(dirname($target))) mkdir(dirname($target), 0700, true);
    if (!copy($source, $target)) throw new RuntimeException('Falha ao copiar arquivo do site.');
}
foreach (['css', 'js', 'ideau_eventos', 'organizador', 'participantes', 'src', 'uploads', 'vendor'] as $dir) {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/' . $dir, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->isLink()) continue;
        $relative = str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1));
        if (preg_match('~(?:^|/)(?:\.git|\.env[^/]*|error_log[^/]*)(?:/|$)|\.local\.php|\.(?:log|sql|zip|bak|pem|key)$~i', $relative)) continue;
        if ($relative === 'organizador/diagnostico.php') continue;
        copyRelease($file->getPathname(), $site . '/' . $relative);
    }
}
foreach (['.htaccess', '.user.ini', 'index.php', 'favicon.png', 'logo__ideau.png', 'composer.json', 'composer.lock'] as $name) {
    copyRelease($root . '/' . $name, $site . '/' . $name);
}
writeRelease($site . '/.user.ini', file_get_contents($site . '/.user.ini') . "\n; Este pacote usa exclusivamente HTTPS.\nsession.cookie_secure = 1\n");
writeRelease($site . '/src/Config/database.local.php', phpConfig([
    'host' => 'localhost', 'port' => 3306, 'database' => '', 'username' => '', 'password' => '',
]));
// A senha SMTP local nunca é transportada automaticamente.
$mail = is_file($root . '/src/Config/email.local.php') ? require $root . '/src/Config/email.local.php' : [];
$mailEnv = ['from'=>'IDEAU_MAIL_FROM','host'=>'IDEAU_SMTP_HOST','port'=>'IDEAU_SMTP_PORT',
    'encryption'=>'IDEAU_SMTP_ENCRYPTION','username'=>'IDEAU_SMTP_USERNAME'];
foreach ($mailEnv as $key => $env) { if (getenv($env) !== false) $mail[$key] = getenv($env); }
writeRelease($site . '/src/Config/email.local.php', "<?php\n// Preencha password com a senha de app do Gmail diretamente na hospedagem.\nreturn " . var_export([
    'environment' => 'production', 'public_url' => $url, 'transport' => 'smtp',
    'host' => $mail['host'] ?? 'smtp.gmail.com', 'port' => (int) ($mail['port'] ?? 465),
    'encryption' => $mail['encryption'] ?? 'ssl', 'from' => $mail['from'] ?? '',
    'username' => $mail['username'] ?? '', 'password' => '',
], true) . ";\n");
$organizer = App\Service\OrganizerAccess::config();
if (!filter_var($organizer['email'], FILTER_VALIDATE_EMAIL)
    || empty(password_get_info($organizer['password_hash'])['algo'])) throw new RuntimeException('Configure o organizador local antes de empacotar.');
writeRelease($site . '/src/Config/organizer.local.php', phpConfig($organizer));

// Uma transação consistente preserva o conjunto de eventos e inscrições.
// Tokens temporários e contadores de tentativas começam vazios no novo ambiente.
$db = App\Config\Conexao::getConexao();
$db->exec("SET time_zone = '+00:00'");
$tables = $db->query('SHOW TABLE STATUS')->fetchAll(PDO::FETCH_ASSOC);
foreach ($tables as $table) {
    if (!preg_match('/^[A-Za-z0-9_]+$/D', $table['Name']) || $table['Engine'] !== 'InnoDB') {
        throw new RuntimeException('A exportação exige tabelas InnoDB com nomes simples.');
    }
}
$sqlPath = $release . '/02-banco-com-dados.sql';
$handle = fopen($sqlPath, 'xb');
if (!$handle) throw new RuntimeException('Falha ao abrir a exportação.');
$write = static function (string $sql) use ($handle): void {
    if (fwrite($handle, $sql) !== strlen($sql)) throw new RuntimeException('Falha ao exportar o banco.');
};
$counts = [];
$write("-- IDEAU Eventos: importar somente em um BANCO VAZIO selecionado no phpMyAdmin.\n");
$write("-- Contém dados de participantes. Não enviar este SQL para public_html.\n");
$write("SET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n");
$db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
$db->beginTransaction();
try {
    foreach ($tables as $table) {
        $name = $table['Name'];
        $ddl = $db->query('SHOW CREATE TABLE `' . $name . '`')->fetch(PDO::FETCH_NUM)[1];
        // MariaDB da hospedagem também aceita utf8mb4_unicode_ci.
        $ddl = str_replace('utf8mb4_0900_ai_ci', 'utf8mb4_unicode_ci', $ddl);
        $write("\n" . $ddl . ";\n");
        $counts[$name] = 0;
        if (in_array($name, ['inscricao_acessos', 'inscricao_acesso_limites'], true)) continue;
        $stmt = $db->query('SELECT * FROM `' . $name . '`');
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $columns = array_map(static fn ($column) => '`' . str_replace('`', '``', $column) . '`', array_keys($row));
            // Literais hexadecimais evitam ambiguidades de aspas, barras e quebras de linha.
            $values = array_map(static fn ($value) => $value === null ? 'NULL'
                : "CONVERT(X'" . bin2hex((string) $value) . "' USING utf8mb4)", array_values($row));
            $write('INSERT INTO `' . $name . '` (' . implode(',', $columns) . ') VALUES (' . implode(',', $values) . ");\n");
            $counts[$name]++;
        }
    }
    $db->commit();
    $write("\nSET FOREIGN_KEY_CHECKS = 1;\n");
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
} finally { fclose($handle); }
copyRelease($root . '/docs/PUBLICAR_HOSTINGER.md', $release . '/LEIA-ME.md');
writeRelease($release . '/resumo-exportacao.json', json_encode([
    'url' => $url, 'created_at_utc' => gmdate('c'), 'rows' => $counts,
    'temporary_access_tokens_exported' => false, 'database_password_exported' => false,
    'smtp_password_exported' => false, 'organizer_login_preserved' => true,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
echo $release . PHP_EOL;
