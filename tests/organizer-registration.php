<?php
// publicacao.php cria tabelas temporarias: nenhum inscrito real e alterado.
require __DIR__ . '/publicacao.php';

$organizer = 'Owner@example.test';
$base = array_replace($fixture, ['institution' => 'faculdade-ideau', 'publicationMode' => 'published',
    'fields' => ['email' => true], 'seats' => 1]);
$event = $service->salvar($base, $organizer);
$data = ['eventId' => $event['id'], 'name' => 'Organizadora do evento', 'email' => 'forjado@example.test',
    'isOrganizer' => false, 'organizerAccount' => 'outra-conta'];
invalid(fn() => $service->inscreverOrganizador($data, 'other@example.test'));
invalid(fn() => $service->inscreverOrganizador(array_replace($data, ['name' => ' ']), $organizer));
$result = $service->inscreverOrganizador($data, $organizer);
check($result['success'] && !$result['alreadyRegistered'], 'Autoincricao confirmada.');
$rows = $service->listarInscricoes($organizer);
check(count($rows) === 1 && $rows[0]['isOrganizer'] === true, 'Selo salvo no banco e devolvido na lista.');
check($rows[0]['email'] === $organizer && $rows[0]['organizerAccount'] === $organizer, 'Identidade nao vem do payload.');
check($rows[0]['reviewStatus'] === 'approved', 'O proprio organizador fica confirmado.');
$protocol = $rows[0]['id'];
$_SESSION = [];
$duplicate = $service->inscreverOrganizador(array_replace($data, ['name' => 'Outro nome digitado']), $organizer);
check($duplicate['alreadyRegistered'] && count($service->listarInscricoes($organizer)) === 1, 'Nova sessao e reenvio nao duplicam a vaga.');
check(array_column($service->listar($organizer), null, 'id')[$event['id']]['registrationCount'] === 1, 'Organizador ocupa uma vaga.');
invalid(fn() => $service->inscrever(['eventId' => $event['id'], 'name' => 'Aluno', 'email' => 'aluno@example.test']));
$service->revisarInscricao($event['id'], $protocol, 'remove', $organizer);
$service->inscrever(['eventId' => $event['id'], 'name' => 'Aluno', 'email' => 'aluno@example.test',
    'isOrganizer' => true, 'organizerAccount' => $organizer]);
$guest = $service->listarInscricoes($organizer)[0];
check(!isset($guest['isOrganizer'], $guest['organizerAccount']), 'Participante nao pode forjar o selo.');
invalid(fn() => $service->inscreverOrganizador($data, $organizer));

$private = $service->salvar(array_replace($base, ['accessMode' => 'link', 'listed' => false,
    'recipientMode' => 'manual', 'targetCourse' => 'Direito']), $organizer);
$service->inscreverOrganizador(['eventId' => $private['id'], 'name' => 'Organizadora', 'cpf' => '12345678909'], $organizer);
$privateRow = array_values(array_filter($service->listarInscricoes($organizer), fn($r) => $r['eventId'] === $private['id']))[0];
check($privateRow['isOrganizer'] && $privateRow['reviewStatus'] === 'approved', 'Dono pode se inscrever no proprio evento privado.');

$school = $service->salvar(array_replace($base, ['institution' => 'escola-ideau-santa-clara']), $organizer);
$service->inscreverOrganizador(['eventId' => $school['id'], 'name' => 'Professor organizador'], $organizer);
$schoolRow = array_values(array_filter($service->listarInscricoes($organizer), fn($r) => $r['eventId'] === $school['id']))[0];
check($schoolRow['name'] === 'Professor organizador' && empty($schoolRow['studentName']), 'Organizador escolar inscreve a si proprio, nao um educando ficticio.');

$existingEvent = $service->salvar($base, $organizer);
$existingData = ['eventId' => $existingEvent['id'], 'name' => 'Conta existente', 'email' => strtolower($organizer)];
$service->inscrever($existingData);
$service->inscreverOrganizador($existingData, $organizer);
$existingRows = array_values(array_filter($service->listarInscricoes($organizer), fn($r) => $r['eventId'] === $existingEvent['id']));
check(count($existingRows) === 1 && $existingRows[0]['isOrganizer'], 'Inscricao previa da mesma conta ganha selo sem duplicar.');
$collision = $service->salvar($base, $organizer);
$service->inscrever(['eventId' => $collision['id'], 'name' => 'Aluno', 'cpf' => '12345678909', 'email' => 'aluno@example.test']);
invalid(fn() => $service->inscreverOrganizador(['eventId' => $collision['id'], 'name' => 'Organizador', 'cpf' => '12345678909'], $organizer));

$draft = $service->salvar(array_replace($base, ['publicationMode' => 'draft']), $organizer);
invalid(fn() => $service->inscreverOrganizador(['eventId' => $draft['id'], 'name' => 'Organizador'], $organizer));
$closed = $service->salvar($base, $organizer);
$service->encerrar($closed['id'], $organizer);
invalid(fn() => $service->inscreverOrganizador(['eventId' => $closed['id'], 'name' => 'Organizador'], $organizer));
$deadline = $service->salvar($base, $organizer);
$deadline['registrationEndAt'] = '2000-01-01T00:00:00.000Z';
$db->prepare('UPDATE eventos_publicacoes SET dados = ? WHERE id = ?')->execute([json_encode($deadline), $deadline['id']]);
invalid(fn() => $service->inscreverOrganizador(['eventId' => $deadline['id'], 'name' => 'Organizador'], $organizer));

$sql = str_replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE IF NOT EXISTS', file_get_contents(__DIR__ . '/../db/multiplas_atividades.sql'));
$sql = preg_replace('/,\s*CONSTRAINT\s+\w+\s+FOREIGN KEY\s*\([^)]+\)\s+REFERENCES\s+\w+\([^)]+\)\s+ON DELETE (?:CASCADE|SET NULL)/', '', $sql);
$db->exec($sql);
$activity = ['name' => 'Palestra', 'type' => 'palestra', 'startAt' => '2099-12-31T18:00', 'endAt' => '2099-12-31T19:00', 'seats' => 2, 'hours' => 1];
$multiple = $service->salvar(array_replace($base, ['eventType' => 'multiple', 'activities' => [$activity],
    'modality' => 'hibrido', 'delivery' => ['allowChoice' => true, 'platform' => 'Meet', 'accessUrl' => 'https://example.test/sala']]), $organizer);
$multiData = ['eventId' => $multiple['id'], 'name' => 'Organizadora', 'participationMode' => 'online'];
invalid(fn() => $service->inscreverOrganizador($multiData, $organizer));
$multiData['activityIds'] = [$multiple['activities'][0]['id']];
$service->inscreverOrganizador($multiData, $organizer);
$multiRow = array_values(array_filter($service->listarInscricoes($organizer), fn($r) => $r['eventId'] === $multiple['id']))[0];
check($multiRow['isOrganizer'] && count($multiRow['activities']) === 1 && $multiRow['participationMode'] === 'online', 'Atividades e modalidade continuam respeitadas.');
echo "OK: autoincricao do dono, selo persistente, antifraude, idempotencia, vagas, prazos, escola, eventos privados e atividades.\n";
