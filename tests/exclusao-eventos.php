<?php
// Usa as tabelas temporarias dos testes de publicacao, sem excluir dados reais.
require __DIR__ . '/publicacao.php';

$base = array_replace($fixture, ['institution' => 'faculdade-ideau', 'publicationMode' => 'published',
    'accessMode' => 'link', 'recipientMode' => 'anyone', 'listed' => false, 'fields' => []]);
$example = $service->salvar(array_replace($base, ['id' => '', 'title' => 'exemplo']), $owner);
$other = $service->salvar(array_replace($base, ['id' => '', 'title' => 'Preservar']), $owner);
$service->inscrever(['eventId' => $example['id'], 'name' => 'Participante teste', 'accessToken' => $example['accessToken']]);
$service->inscrever(['eventId' => $other['id'], 'name' => 'Outro participante', 'accessToken' => $other['accessToken']]);
$stat = $db->prepare("INSERT INTO dashboard_cancelamentos (origem,id_evento,publico,registrado_em,cancelado_em) VALUES (?,?,'unknown',UTC_TIMESTAMP(),UTC_TIMESTAMP())");
$stat->execute(['publicacao', $example['id']]);
$stat->execute(['legado', $example['id']]);
invalid(fn () => $service->excluir($example['id'], 'outro-organizador'));
check(count($service->eventoPublico($example['id'], $example['accessToken'])) === 1, 'Outro organizador nao pode excluir o evento.');
$service->encerrar($example['id'], $owner);
$service->excluir($example['id'], $owner);
check(!in_array($example['id'], array_column($service->listar($owner), 'id')), 'Evento encerrado deve desaparecer do historico.');
check($service->eventoPublico($example['id'], $example['accessToken']) === [], 'Link excluido deixa de funcionar.');
check(!in_array($example['id'], array_column($service->listarInscricoes($owner), 'eventId')), 'Inscricoes excluidas nao aparecem em relatorios.');
check(in_array($other['id'], array_column($service->listarInscricoes($owner), 'eventId')), 'Inscricoes de outro evento devem permanecer.');
$count = $db->prepare('SELECT COUNT(*) FROM dashboard_cancelamentos WHERE origem = ? AND id_evento = ?');
$count->execute(['publicacao', $example['id']]);
check((int) $count->fetchColumn() === 0, 'Estatisticas do evento excluido devem ser removidas.');
$count->execute(['legado', $example['id']]);
check((int) $count->fetchColumn() === 1, 'Origem diferente nao pode ser removida.');
invalid(fn () => $service->excluir($example['id'], $owner));
$draftToDelete = $service->salvar(array_replace($base, ['id' => '', 'publicationMode' => 'draft']), $owner);
$service->excluir($draftToDelete['id'], $owner);
check(!in_array($draftToDelete['id'], array_column($service->listar($owner), 'id')), 'Rascunhos tambem podem ser excluidos.');

foreach (['eventos (id INT PRIMARY KEY)', 'atividades (id INT PRIMARY KEY, id_evento INT)',
    'inscricoes (id INT PRIMARY KEY, id_atividade INT)', 'usuarios (id INT PRIMARY KEY)'] as $ddl) {
    $db->exec('CREATE TEMPORARY TABLE ' . $ddl . ' ENGINE=InnoDB');
}
$db->exec('INSERT INTO eventos VALUES (101), (102)');
$db->exec('INSERT INTO atividades VALUES (201,101), (202,102)');
$db->exec('INSERT INTO inscricoes VALUES (301,201), (302,202)');
$db->exec('INSERT INTO usuarios VALUES (401), (402)');
$stat->execute(['legado', '101']);
$stat->execute(['publicacao', '101']);
$legacyService = new \App\Service\EventoService();
$legacyService->excluirEvento(101);
check($db->query('SELECT id FROM eventos')->fetchAll(PDO::FETCH_COLUMN) == [102], 'Exclusao legada deve afetar somente o evento selecionado.');
check($db->query('SELECT id FROM atividades')->fetchAll(PDO::FETCH_COLUMN) == [202], 'Somente atividades do evento devem ser excluidas.');
check($db->query('SELECT id FROM inscricoes')->fetchAll(PDO::FETCH_COLUMN) == [302], 'Somente inscricoes do evento devem ser excluidas.');
check((int) $db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() === 2, 'Cadastros de pessoas nao podem ser apagados.');
$count->execute(['legado', '101']);
check((int) $count->fetchColumn() === 0, 'Estatisticas legadas devem ser removidas.');
$count->execute(['publicacao', '101']);
check((int) $count->fetchColumn() === 1, 'Publicacao com mesmo identificador deve ser preservada.');
invalid(fn () => $legacyService->excluirEvento(101));

// Falha depois de excluir filhos deve desfazer toda a operacao, nos dois modelos.
$db->exec('ALTER TABLE dashboard_cancelamentos DROP COLUMN id_evento');
try { $service->excluir($other['id'], $owner); throw new RuntimeException('Falha esperada nao ocorreu.'); }
catch (PDOException) {}
check(in_array($other['id'], array_column($service->listar($owner), 'id')), 'Falha deve preservar o evento.');
check(in_array($other['id'], array_column($service->listarInscricoes($owner), 'eventId')), 'Falha deve restaurar inscricoes.');
try { $legacyService->excluirEvento(102); throw new RuntimeException('Falha esperada nao ocorreu.'); }
catch (PDOException) {}
check((int) $db->query('SELECT COUNT(*) FROM eventos')->fetchColumn() === 1, 'Falha deve preservar evento legado.');
check((int) $db->query('SELECT COUNT(*) FROM atividades')->fetchColumn() === 1, 'Falha deve restaurar atividades.');
check((int) $db->query('SELECT COUNT(*) FROM inscricoes')->fetchColumn() === 1, 'Falha deve restaurar inscricoes legadas.');
check(!$db->inTransaction(), 'Nenhuma transacao pode permanecer aberta.');
echo "OK: exclusao no banco, historico, rascunhos, permissao do dono, isolamento, estatisticas e rollback.\n";
