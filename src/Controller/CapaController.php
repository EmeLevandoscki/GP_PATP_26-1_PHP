<?php
require_once __DIR__ . '/../Config/runtime.php';
require_once __DIR__ . '/../../vendor/autoload.php';

\App\Service\RequestSecurity::session();
$owner = $_SESSION['publication_organizer'] ?? null;
// Imagens não bloqueiam as outras requisições da mesma sessão.
session_write_close();
header('Referrer-Policy: no-referrer');
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
    http_response_code(405); header('Allow: GET, HEAD'); exit;
}
try {
    $id = $_GET['id'] ?? ''; $token = $_GET['accessToken'] ?? ''; $width = $_GET['w'] ?? '640';
    if (!is_string($id) || !is_string($token) || !in_array($width, ['640','1280'], true)) {
        http_response_code(404); exit;
    }
    $result = (new \App\Service\CapaService(\App\Config\Conexao::getConexao()))->obter(
        $id, $token, is_string($owner) ? $owner : null, (int) $width, $_SERVER['HTTP_IF_NONE_MATCH'] ?? ''
    );
    http_response_code($result['status']);
    foreach ($result['headers'] as $name => $value) header($name . ': ' . $value);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') echo $result['body'];
} catch (Throwable $error) {
    error_log('CapaController: ' . get_class($error));
    http_response_code(503); header('Cache-Control: no-store');
}
