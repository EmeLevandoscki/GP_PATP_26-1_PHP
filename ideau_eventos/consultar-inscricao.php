<?php
require_once __DIR__ . '/../vendor/autoload.php';
use App\Config\Conexao;
use App\Service\ConsultaInscricaoService;
use App\Service\ComprovanteService;
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
$_SESSION['consulta_csrf'] ??= bin2hex(random_bytes(32));
$error = ''; $message = ''; $email = ''; $receipts = [];
if (isset($_GET['token'])) {
    if (is_string($_GET['token']) && preg_match('/^[a-f0-9]{64}$/D', $_GET['token'])) {
        $_SESSION['consulta_pending'] = $_GET['token'];
        // Leitores de e-mail podem abrir links automaticamente. Apenas POST consome o acesso.
        header('Location: consultar-inscricao.php', true, 303); exit;
    }
    http_response_code(400); $error = 'Link inválido. Solicite um novo link abaixo.';
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['consulta_csrf'], $_POST['csrf'])) {
            http_response_code(403); throw new InvalidArgumentException('Atualize a página e tente novamente.');
        }
        $action = $_POST['action'] ?? '';
        if ($action === 'confirm') {
            $service = new ConsultaInscricaoService(Conexao::getConexao(), static fn () => false, '');
            $verified = $service->confirmar($_SESSION['consulta_pending'] ?? '');
            session_regenerate_id(true);
            $_SESSION['consulta_verified'] = ['email' => $verified, 'expires' => time() + 1800];
            unset($_SESSION['consulta_pending']);
            header('Location: consultar-inscricao.php', true, 303); exit;
        } elseif ($action === 'request') {
            $email = is_string($_POST['email'] ?? null) ? trim($_POST['email']) : '';
            $service = ConsultaInscricaoService::configurado(Conexao::getConexao());
            $message = $service->solicitar($email, $_SERVER['REMOTE_ADDR'] ?? 'unknown');
            unset($_SESSION['consulta_pending']);
        } elseif ($action === 'reset') {
            unset($_SESSION['consulta_pending'], $_SESSION['consulta_verified']);
            header('Location: consultar-inscricao.php', true, 303); exit;
        } else { throw new InvalidArgumentException('Solicitação inválida.'); }
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
        if (($_POST['action'] ?? '') === 'confirm') unset($_SESSION['consulta_pending']);
    } catch (RuntimeException $exception) {
        // Falhas de infraestrutura não devem exibir consultas SQL nem configurações.
        $error = $exception instanceof PDOException ? 'Não foi possível acessar a consulta. Tente novamente mais tarde.' : $exception->getMessage();
        http_response_code(503);
    } catch (Throwable $exception) {
        http_response_code(503); $error = 'Não foi possível acessar a consulta. Tente novamente mais tarde.';
    }
}
$verified = $_SESSION['consulta_verified'] ?? null;
if ($verified && $verified['expires'] <= time()) { unset($_SESSION['consulta_verified']); $verified = null; }
if ($verified && !isset($_SESSION['consulta_pending'])) {
    try {
        $service = new ConsultaInscricaoService(Conexao::getConexao(), static fn () => false, '');
        foreach ($service->inscricoes($verified['email']) as $receipt) {
            $receipt['url'] = ComprovanteService::resposta($receipt, true)['receiptUrl'];
            $receipts[] = $receipt;
        }
    } catch (Throwable) { http_response_code(503); $error = 'Não foi possível consultar suas inscrições agora. Tente novamente.'; }
}
function consultaEscape(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html><html lang="pt-BR" data-theme="dark"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Consultar minha inscrição — IDEAU Eventos</title>
<link rel="icon" href="assets/img/logo__ideau.png"><link rel="stylesheet" href="assets/css/inscricao.css">
<link rel="stylesheet" href="assets/css/comprovante.css?v=4"><link rel="stylesheet" href="assets/css/consulta-inscricao.css?v=1">
</head><body><main class="consult-page">
<header class="receipt-nav"><a class="receipt-brand" href="../index.php"><img src="assets/img/logo__ideau.png" alt="Logo IDEAU"><span>IDEAU <b>Eventos</b></span></a><a class="receipt-back" href="../index.php#eventos">← Voltar aos eventos</a></header>
<div class="consult-layout"><section class="consult-intro"><span class="consult-eyebrow">SUA PARTICIPAÇÃO</span><h1>Já se inscreveu?<br>Consulte por aqui.</h1><p>Mesmo em outro navegador ou celular, você pode acessar sua inscrição com o e-mail usado no cadastro.</p><ul><li>Confira se sua inscrição está ativa</li><li>Baixe seu comprovante em PDF</li><li>Cancele sua inscrição, se precisar</li></ul><p class="consult-help">Não informou um e-mail na inscrição? Entre em contato com o organizador do evento.</p></section>
<section class="consult-card" aria-label="Consultar minha inscrição">
<?php if ($error): ?><div class="consult-feedback error" role="alert"><?= consultaEscape($error) ?></div><?php endif; ?>
<?php if (isset($_SESSION['consulta_pending'])): ?>
<span class="consult-symbol" aria-hidden="true">✓</span><h2>Abra sua inscrição</h2><p>Confirme abaixo para consultar as inscrições vinculadas ao e-mail que recebeu este link.</p>
<form method="post"><input type="hidden" name="csrf" value="<?= consultaEscape($_SESSION['consulta_csrf']) ?>"><input type="hidden" name="action" value="confirm"><button class="consult-submit">Consultar minha inscrição</button></form>
<?php elseif ($verified): ?>
<span class="consult-eyebrow">ACESSO CONFIRMADO</span><h2>Sua inscrição</h2><p class="consult-email"><?= consultaEscape($verified['email']) ?></p>
<?php if (!$error && !$receipts): ?><div class="consult-feedback">Nenhuma inscrição ativa encontrada para este e-mail. Confira se utilizou outro endereço ou se a inscrição foi cancelada.</div><?php endif; ?>
<?php foreach ($receipts as $receipt): ?>
<article class="consult-result"><span class="receipt-status">✓ Inscrição ativa</span><h3><?= consultaEscape($receipt['eventTitle']) ?></h3><p><?= consultaEscape($receipt['name']) ?><br><?= consultaEscape($receipt['date']) ?> · <?= consultaEscape($receipt['time']) ?></p><div class="consult-result-actions"><a href="<?= consultaEscape($receipt['url']) ?>">Ver comprovante →</a><a class="consult-cancel" href="<?= consultaEscape($receipt['url']) ?>&amp;cancel=1#cancelar-inscricao">Cancelar inscrição</a></div></article>
<?php endforeach; ?>
<form method="post"><input type="hidden" name="csrf" value="<?= consultaEscape($_SESSION['consulta_csrf']) ?>"><button class="consult-reset" name="action" value="reset">Consultar outro e-mail</button></form>
<?php else: ?>
<span class="consult-symbol" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></svg></span><h2>Consultar minha inscrição</h2><p>Enviaremos um link pessoal para você acessar os dados da sua inscrição.</p>
<?php if ($message): ?><div class="consult-feedback" role="status"><?= consultaEscape($message) ?></div><?php endif; ?>
<form method="post" class="consult-form"><input type="hidden" name="csrf" value="<?= consultaEscape($_SESSION['consulta_csrf']) ?>"><input type="hidden" name="action" value="request"><label for="consultaEmail">E-mail usado na inscrição</label><input id="consultaEmail" name="email" type="email" required maxlength="254" autocomplete="email" placeholder="seuemail@exemplo.com" value="<?= consultaEscape($email) ?>"><button class="consult-submit">Receber link por e-mail <span aria-hidden="true">→</span></button></form><small class="consult-footnote">O link expira em 20 minutos. Não é necessário fazer uma nova inscrição.</small>
<?php endif; ?>
</section></div></main></body></html>
