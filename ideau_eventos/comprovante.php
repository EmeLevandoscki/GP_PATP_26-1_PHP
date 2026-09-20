<?php
require_once __DIR__ . '/../vendor/autoload.php';
use App\Service\ComprovanteService;
use App\Config\Conexao;
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
$id = is_string($_GET['id'] ?? null) ? $_GET['id'] : '';
$receipt = $_SESSION['registration_receipts'][$id] ?? null;
$error = '';
$cancelled = isset($_SESSION['cancelled_receipts'][$id]);
$_SESSION['receipt_csrf'] ??= bin2hex(random_bytes(32));
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['receipt_csrf'], $_POST['csrf'])) {
        http_response_code(403);
        $error = 'Não foi possível confirmar a solicitação. Atualize a página e tente novamente.';
    } elseif (($_POST['confirm_cancel'] ?? '') !== '1' || !$receipt) {
        http_response_code(422);
        $error = 'Confirme que deseja cancelar esta inscrição.';
    } else {
        try {
            ComprovanteService::cancelar(Conexao::getConexao(), $id);
            header('Location: comprovante.php?id=' . urlencode($id), true, 303);
            exit;
        } catch (Throwable $exception) {
            error_log('Cancelamento de inscrição: ' . $exception->getMessage());
            http_response_code(500);
            $error = 'Não foi possível cancelar agora. Sua inscrição foi mantida. Tente novamente.';
        }
    }
}
if ($receipt) {
    try {
        if (!ComprovanteService::ativa(Conexao::getConexao(), $receipt)) {
            unset($_SESSION['registration_receipts'][$id]);
            $_SESSION['cancelled_receipts'][$id] = true;
            $receipt = null;
            $cancelled = true;
        }
    } catch (Throwable $exception) {
        http_response_code(503);
        exit('Não foi possível consultar a inscrição. Tente novamente em instantes.');
    }
}
if (!$receipt && !$cancelled && !$error) http_response_code(404);
if ($receipt && !$error && $_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['download'])) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="comprovante-inscricao.pdf"');
    echo ComprovanteService::pdf($receipt);
    exit;
}
function escapeReceipt(string $text): string { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comprovante de inscrição — IDEAU Eventos</title>
  <link rel="stylesheet" href="assets/css/inscricao.css">
  <link rel="stylesheet" href="assets/css/comprovante.css?v=4">
</head>
<body><main class="receipt-page"><header class="receipt-nav"><a class="receipt-brand" href="../index.php"><img src="assets/img/logo__ideau.png" alt="Logo IDEAU"><span>IDEAU <b>Eventos</b></span></a><a class="receipt-back" href="../index.php#eventos">← Voltar aos eventos</a></header><section class="receipt">
<?php if ($error): ?><p role="alert"><?= escapeReceipt($error) ?></p><?php endif; ?>
<?php if ($receipt): ?>
  <header class="receipt-heading"><span class="receipt-status"><span aria-hidden="true">✓</span> Inscrição confirmada</span><h1>Seu comprovante</h1><p>Sua inscrição está garantida. Confira os detalhes do evento abaixo.</p></header>
  <div class="receipt-ticket"><div class="receipt-ticket-main"><div class="receipt-event"><span>IDEAU EVENTOS · COMPROVANTE DE INSCRIÇÃO</span><h2><?= escapeReceipt((string) $receipt['eventTitle']) ?></h2></div>
  <dl class="receipt-data">
  <?php foreach (['name' => 'Participante', 'date' => 'Data do evento', 'time' => 'Horário', 'location' => 'Local', 'registeredAt' => 'Data da inscrição', 'protocol' => 'Protocolo'] as $field => $label): ?>
    <div class="receipt-field <?= $field === 'name' || $field === 'protocol' ? 'receipt-field-wide' : '' ?>"><dt><?= $label ?></dt><dd><?= escapeReceipt((string) $receipt[$field]) ?></dd></div>
  <?php endforeach; ?>
  </dl>
  <p class="receipt-note">Este comprovante confirma a inscrição e não substitui o certificado de presença.</p>
  </div><aside class="receipt-ticket-side" aria-label="Gerenciar inscrição">
  <div class="receipt-document-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></div>
  <h2>Leve com você</h2><p>Baixe o PDF e tenha os dados da sua inscrição sempre à mão.</p>
  <div class="receipt-actions"><a class="btn-primary" href="?id=<?= escapeReceipt($id) ?>&amp;download=1">Baixar comprovante em PDF</a><a class="btn-secondary" href="../index.php#eventos">Ver eventos</a></div>
  <details class="cancel-registration" id="cancelar-inscricao" <?= isset($_GET['cancel']) ? 'open' : '' ?>>
    <summary>Cancelar minha inscrição</summary>
    <p>Você deixará de estar inscrito neste evento e sua vaga será liberada. Para participar depois, será necessário fazer uma nova inscrição, se houver vagas disponíveis.</p>
    <form method="post" action="comprovante.php?id=<?= escapeReceipt($id) ?>">
      <input type="hidden" name="csrf" value="<?= escapeReceipt($_SESSION['receipt_csrf']) ?>">
      <label><input type="checkbox" name="confirm_cancel" value="1" required> Confirmo que quero cancelar minha inscrição.</label>
      <button type="submit">Confirmar cancelamento</button>
    </form>
  </details>
  </aside></div>
<?php elseif ($cancelled): ?>
  <h1>Inscrição cancelada</h1><p>Você não está mais inscrito neste evento. O comprovante anterior não é mais válido.</p>
  <div class="receipt-actions"><a class="btn-primary" href="../index.php#eventos">Voltar aos eventos</a></div>
<?php else: ?>
  <h1>Comprovante indisponível nesta sessão</h1><p>Volte ao evento e informe os mesmos dados da inscrição para recuperar seu comprovante. Isso não cria uma nova inscrição.</p><a class="btn-primary" href="../index.php#eventos">Voltar aos eventos</a>
<?php endif; ?>
</section></main></body></html>
