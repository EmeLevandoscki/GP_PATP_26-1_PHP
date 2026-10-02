<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Service\ComprovanteService;
function ensureSecurity(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$_SESSION = [];
$receipt = ['protocol' => 'reg-security', 'eventId' => 'evt-security', 'name' => 'Pessoa fictícia', 'reviewStatus' => 'approved'];
$first = ComprovanteService::resposta($receipt);
ensureSecurity(isset($_SESSION['registration_receipts'][hash('sha256', $receipt['protocol'])]), 'Nova inscrição autoriza a sessão criadora.');
ensureSecurity(ComprovanteService::resposta($receipt, true)['receiptUrl'] === $first['receiptUrl'], 'Repetição na própria sessão continua funcionando.');
foreach (['reg-security', 'IDEAU-999', 'reg-pending'] as $protocol) {
    $_SESSION = [];
    $foreign = ComprovanteService::resposta(array_replace($receipt, ['protocol' => $protocol]), true);
    ensureSecurity(($foreign['verificationRequired'] ?? false) && !isset($foreign['receiptUrl'], $foreign['reviewStatus']), 'Outra sessão precisa confirmar e-mail.');
    ensureSecurity(empty($_SESSION['registration_receipts']), 'Repetir dados não autoriza a sessão.');
    $db = (new ReflectionClass(PDO::class))->newInstanceWithoutConstructor();
    try {
        ComprovanteService::cancelar($db, hash('sha256', $protocol));
        throw new RuntimeException('Cancelamento não autorizado aceito.');
    } catch (InvalidArgumentException) {}
}
echo "OK: comprovantes modernos/legados, sessão original e cancelamento sem autorização.\n";
