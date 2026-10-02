<?php
// Uso por terminal; nunca permite configuração pela web.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$password = rtrim(stream_get_contents(STDIN), "\r\n");
if (strlen($password) < 12 || strlen($password) > 72) {
    fwrite(STDERR, "Use uma senha exclusiva de 12 a 72 bytes.\n"); exit(1);
}
$email = $argv[1] ?? 'organizador@ideau.edu.br';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { fwrite(STDERR, "E-mail inválido.\n"); exit(1); }
$config = ['email' => $email, 'password_hash' => password_hash($password, PASSWORD_DEFAULT)];
$file = __DIR__ . '/../src/Config/organizer.local.php';
if (file_put_contents($file, "<?php\nreturn " . var_export($config, true) . ";\n", LOCK_EX) === false) exit(1);
@chmod($file, 0600);
fwrite(STDOUT, "Configuração salva em src/Config/organizer.local.php. Senha não exibida.\n");
