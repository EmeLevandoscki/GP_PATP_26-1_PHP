<?php
// Tabelas temporárias isolam os testes dos eventos reais do banco local.
require __DIR__ . '/../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\PublicacaoService;

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function invalid(callable $operation): void {
    try { $operation(); } catch (InvalidArgumentException) { return; }
    throw new RuntimeException('Uma entrada inválida foi aceita.');
}

$db = Conexao::getConexao();
foreach (['eventos_publicacoes', 'eventos_publicacoes_inscricoes'] as $table) {
    $ddl = $db->query('SHOW CREATE TABLE ' . $table)->fetch(PDO::FETCH_ASSOC)['Create Table'];
    $ddl = preg_replace('/^CREATE TABLE/', 'CREATE TEMPORARY TABLE', $ddl);
    $ddl = preg_replace('/,\n  CONSTRAINT [^\n]+/', '', $ddl);
    $db->exec($ddl);
}
$service = new PublicacaoService($db);
$owner = 'test-' . bin2hex(random_bytes(8));
$fixture = [
    'title' => 'Teste de publicação', 'institution' => 'escola-ideau-santa-clara',
    'category' => 'academico', 'audience' => 'escola', 'date' => '2099-12-31', 'time' => '18:00',
    'location' => 'Auditório', 'summary' => 'Resumo', 'description' => 'Descrição', 'seats' => -1,
    'city' => '', 'fields' => ['responsibleCPF' => true],
    'cover' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
];
$db->beginTransaction();
try {
    $ids = [];
    foreach (['draft', 'scheduled', 'automatic', 'published'] as $mode) {
        $event = $service->salvar($fixture + ['publicationMode' => $mode, 'publishAt' => '2099-12-30T12:00:00.000Z'], $owner);
        $ids[$mode] = $event['id'];
    }
    $publicIds = array_column($service->listar(), 'id');
    check(in_array($ids['published'], $publicIds), 'Publicado deve aparecer.');
    foreach (['draft', 'scheduled', 'automatic'] as $mode) {
        check(!in_array($ids[$mode], $publicIds), "$mode não pode aparecer ao público antes da liberação.");
    }
    check(count($service->listar($owner)) === 4, 'Organizador deve ver todos os estados.');
    check($service->listar('outro-organizador') === [], 'Outro organizador não pode acessar os rascunhos.');
    $stmt = $db->prepare('UPDATE eventos_publicacoes SET publicar_em = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE id = ?');
    $stmt->execute([$ids['automatic']]);
    // Uma nova instância representa um acesso posterior, sem nenhum temporizador do navegador.
    $public = (new PublicacaoService($db))->listar();
    check(in_array($ids['automatic'], array_column($public, 'id')), 'O servidor deve liberar após o horário.');
    check(!in_array($ids['scheduled'], array_column($public, 'id')), 'Agendamento manual deve continuar oculto.');
    $manual = $service->salvar($fixture + ['id' => $ids['scheduled'], 'publicationMode' => 'published'], $owner);
    check($manual['publishAt'] === null, 'Publicação manual deve limpar o horário automático.');
    check(in_array($ids['scheduled'], array_column($service->listar(), 'id')), 'Publicar agora deve liberar o evento.');
    $service->salvar($fixture + ['id' => $ids['scheduled'], 'publicationMode' => 'draft'], $owner);
    check(!in_array($ids['scheduled'], array_column($service->listar(), 'id')), 'Voltar a rascunho deve ocultar o evento.');
    invalid(fn () => $service->salvar($fixture + ['publicationMode' => 'automatic'], $owner));
    invalid(fn () => $service->salvar($fixture + ['publicationMode' => 'automatic', 'publishAt' => '2000-01-01T00:00:00.000Z'], $owner));
    invalid(fn () => $service->salvar($fixture + ['publicationMode' => 'automatic', 'publishAt' => '2099-02-30T00:00:00.000Z'], $owner));
    invalid(fn () => $service->salvar($fixture + ['id' => $ids['published'], 'publicationMode' => 'published'], 'outro-organizador'));
    invalid(fn () => $service->salvar(array_replace($fixture, ['title' => '   ']), $owner));
    invalid(fn () => $service->salvar(array_replace($fixture, ['cover' => 'data:image/png;base64,YWJj']), $owner));
    echo "OK: quatro estados, horário do servidor, publicação manual, cancelamento, permissões e validação.\n";
} finally {
    $db->rollBack();
}

$event = $service->salvar(array_replace($fixture, ['seats' => 1, 'publicationMode' => 'scheduled']), $owner);
$registration = ['eventId' => $event['id'], 'responsibleName' => 'Responsável de teste',
    'responsibleCpf' => '12345678901', 'studentName' => 'Educando de teste'];
invalid(fn () => $service->inscrever($registration));
$service->salvar(array_replace($event, ['publicationMode' => 'published']), $owner);
invalid(fn () => $service->inscrever(array_replace($registration, ['responsibleName' => ''])));
$firstReceipt = $service->inscrever($registration);
check($firstReceipt['success'] && !$firstReceipt['alreadyRegistered'], 'Inscrição deve emitir comprovante.');
$retry = $service->inscrever($registration);
check($retry['alreadyRegistered'] && $retry['receiptUrl'] === $firstReceipt['receiptUrl'], 'Repetição com evento lotado deve recuperar o mesmo comprovante.');
invalid(fn () => $service->inscrever(array_replace($registration, ['studentName' => 'Outro educando'])));
$receiptId = substr($firstReceipt['receiptUrl'], strpos($firstReceipt['receiptUrl'], '=') + 1);
$receipt = $_SESSION['registration_receipts'][$receiptId];
check($receipt['name'] === $registration['studentName'], 'Comprovante deve identificar o educando.');
$pdf = \App\Service\ComprovanteService::pdf($receipt);
check(str_starts_with($pdf, '%PDF-1.4') && str_contains($pdf, 'startxref'), 'Download deve ser um PDF.');
check(!str_contains($pdf, $registration['responsibleCpf']), 'PDF não deve expor CPF.');
check(count($service->listarInscricoes($owner)) === 1, 'Inscrição deve ficar disponível ao organizador.');
check($service->listarInscricoes('outro-organizador') === [], 'Inscrições não podem vazar para outro organizador.');
check($service->listar($owner)[0]['registrationCount'] === 1, 'Contagem de vagas deve acompanhar a inscrição.');
echo "OK: inscrição após publicação, responsável obrigatório, limite de vagas e privacidade.\n";

// Encerrar preserva dados e inscrições, sem permitir reabertura por formulários antigos.
invalid(fn () => $service->encerrar($event['id'], 'outro-organizador'));
$closed = $service->encerrar($event['id'], $owner);
check($closed['closed'] && !$closed['published'], 'Encerrado deve sair do ar.');
check($closed['closeReason'] === 'manual', 'Deve identificar o encerramento manual.');
check(!in_array($event['id'], array_column($service->listar(), 'id')), 'Histórico não é público.');
check(count($service->listarInscricoes($owner)) === 1, 'Encerrar não pode apagar inscrições.');
check($service->listar($owner)[0]['registrationCount'] === 1, 'Relatórios mantêm a contagem após encerrar.');
check($service->encerrar($event['id'], $owner)['closedAt'] === $closed['closedAt'], 'Encerrar duas vezes mantém a data original.');
invalid(fn () => $service->inscrever($registration));
invalid(fn () => $service->salvar(array_replace($event, ['publicationMode' => 'published', 'closedAt' => null]), $owner));

$timed = $service->salvar(array_replace($fixture, ['publicationMode' => 'published', 'endAt' => '2099-12-31T20:00:00.000Z']), $owner);
check($timed['published'], 'Evento com prazo futuro deve ficar disponível.');
$db->prepare("UPDATE eventos_publicacoes SET dados = JSON_SET(dados, '$.endAt', '2000-01-01T12:00:00.000Z') WHERE id = ?")->execute([$timed['id']]);
$history = array_column((new PublicacaoService($db))->listar($owner), null, 'id');
check($history[$timed['id']]['closed'], 'Prazo passado deve encerrar mesmo em uma nova instância.');
check($history[$timed['id']]['closeReason'] === 'automatic', 'Deve identificar o encerramento automático.');
check(!in_array($timed['id'], array_column($service->listar(), 'id')), 'Prazo vencido deve ocultar o evento público.');
invalid(fn () => $service->inscrever(array_replace($registration, ['eventId' => $timed['id']])));
invalid(fn () => $service->salvar(array_replace($timed, ['endAt' => '2099-12-31T22:00:00.000Z']), $owner));
invalid(fn () => $service->salvar(array_replace($fixture, ['endAt' => '2000-01-01T12:00:00.000Z']), $owner));
invalid(fn () => $service->salvar(array_replace($fixture, ['endAt' => '2099-02-30T12:00:00.000Z']), $owner));
invalid(fn () => $service->salvar(array_replace($fixture, ['publicationMode' => 'automatic', 'publishAt' => '2099-12-31T20:00:00.000Z', 'endAt' => '2099-12-31T19:00:00.000Z']), $owner));

$past = $service->salvar(array_replace($fixture, ['date' => '2000-01-01', 'publicationMode' => 'published']), $owner);
check(!$past['closed'] && $past['published'], 'Evento sem limite explícito deve continuar no ar mesmo com data passada.');
check($past['effectiveEndAt'] === null, 'Não deve inventar um prazo de encerramento.');
check(in_array($past['id'], array_column($service->listar(), 'id')), 'Evento antigo sem limite deve continuar na lista pública.');
check($service->inscrever(array_replace($registration, ['eventId' => $past['id']]))['success'], 'Evento sem limite deve continuar aceitando inscrições.');
$service->encerrar($past['id'], $owner);
invalid(fn () => $service->inscrever(array_replace($registration, ['eventId' => $past['id']])));
$draft = $service->salvar(array_replace($fixture, ['date' => '2000-01-01', 'publicationMode' => 'draft']), $owner);
check(!$draft['closed'], 'Rascunhos não devem ir automaticamente ao histórico.');
echo "OK: encerramento manual e automático, preservação de inscrições, histórico privado, datas e bloqueio de reabertura.\n";

$siblingsEvent = $service->salvar(array_replace($fixture, ['publicationMode' => 'published']), $owner);
$child = array_replace($registration, ['eventId' => $siblingsEvent['id']]);
check(!$service->inscrever($child)['alreadyRegistered'], 'Primeiro irmão deve se inscrever.');
check(!$service->inscrever(array_replace($child, ['studentName' => 'Segundo irmão']))['alreadyRegistered'], 'Mesmo responsável pode inscrever outro filho.');
check($service->inscrever(array_replace($child, ['studentName' => '  EDUCANDO  DE TESTE  ']))['alreadyRegistered'], 'Espaços e caixa não devem duplicar inscrição.');
echo "OK: comprovantes, repetição sem duplicação, vagas, irmãos, normalização e PDF sem CPF.\n";

// O comprovante da sessão é a autorização; nunca aceitar IDs arbitrários do cliente.
$beforeCancel = count($service->listarInscricoes($owner));
$childReceipt = $service->inscrever($child);
$childReceiptId = substr($childReceipt['receiptUrl'], strpos($childReceipt['receiptUrl'], '=') + 1);
$originalReceipt = $_SESSION['registration_receipts'][$childReceiptId];
invalid(fn () => \App\Service\ComprovanteService::cancelar($db, 'comprovante-de-outra-sessao'));
check(count($service->listarInscricoes($owner)) === $beforeCancel, 'Sem autorização não deve remover registros.');
\App\Service\ComprovanteService::cancelar($db, $childReceiptId);
check(!isset($_SESSION['registration_receipts'][$childReceiptId]), 'Cancelamento deve limpar o comprovante da sessão.');
check(!\App\Service\ComprovanteService::ativa($db, $originalReceipt), 'Comprovante antigo não pode continuar ativo em outra sessão.');
check(count($service->listarInscricoes($owner)) === $beforeCancel - 1, 'Deve remover somente a inscrição escolhida.');
$afterCancel = array_column($service->listar($owner), null, 'id');
check($afterCancel[$siblingsEvent['id']]['registrationCount'] === 1, 'Contagem deve liberar uma vaga.');
$againReceipt = $service->inscrever($child);
check(!$againReceipt['alreadyRegistered'] && $againReceipt['receiptUrl'] !== $childReceipt['receiptUrl'], 'Nova inscrição deve gerar outro protocolo.');
echo "OK: cancelamento autorizado, isolamento, vaga liberada, comprovante invalidado e reinscrição.\n";
