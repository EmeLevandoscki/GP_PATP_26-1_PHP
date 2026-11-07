<?php
namespace App\Service;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use PDO;

class PublicacaoService
{
    public function __construct(private PDO $con) {}

    public function listar(?string $organizador = null): array
    {
        // A disponibilidade é calculada no servidor a cada acesso: não depende
        // de uma aba aberta ou de um processo que altere o status na hora marcada.
        $sql = "SELECT dados, modo, publicar_em, UNIX_TIMESTAMP(criado_em) AS criado_timestamp,
                    (SELECT COUNT(*) FROM eventos_publicacoes_inscricoes i WHERE i.id_evento = eventos_publicacoes.id) AS inscritos,
                    (modo = 'published' OR (modo = 'automatic' AND publicar_em <= UTC_TIMESTAMP())) AS publicado
                FROM eventos_publicacoes WHERE ";
        $sql .= $organizador !== null ? 'organizador = :organizador'
            : "modo = 'published' OR (modo = 'automatic' AND publicar_em <= UTC_TIMESTAMP())";
        // Não mantém uma segunda cópia de todas as capas no buffer do MySQL.
        // Atividades são consultadas depois de consumir e fechar este cursor.
        $bufferAttribute = PHP_VERSION_ID >= 80400 ? \Pdo\Mysql::ATTR_USE_BUFFERED_QUERY : PDO::MYSQL_ATTR_USE_BUFFERED_QUERY;
        $buffered = $this->con->getAttribute($bufferAttribute);
        $this->con->setAttribute($bufferAttribute, false);
        $events = [];
        $stmt = null;
        try {
            $stmt = $this->con->prepare($sql);
            $stmt->execute($organizador !== null ? ['organizador' => $organizador] : []);
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $event = json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR);
                $event = $this->estado($event, $row['modo'], $row['publicar_em']);
                // Processa uma capa por vez em PHP, sem depender da reserialização JSON do banco.
                $event = CapaService::resumir($event);
                $event['createdAt'] = gmdate('Y-m-d\TH:i:s\Z', (int) $row['criado_timestamp']);
                $event['registrationCount'] = (int) $row['inscritos'];
                $event['date_begin'] = $event['date'];
                $event['date_end'] = $event['date'];
                $event['time_begin'] = $event['time'];
                $event['time_end'] = $event['time'];
                $events[] = $event;
            }
        } finally {
            $stmt?->closeCursor();
            $this->con->setAttribute($bufferAttribute, $buffered);
        }
        foreach ($events as &$event) $event = $this->comAtividades($event);
        unset($event);
        if ($organizador !== null) return $events;
        return array_values(array_map(fn ($event) => $this->dadosPublicos($event),
            array_filter($events, fn ($event) => $event['published'] && $event['listed'])));
    }

    public function eventoPublico(string $id, string $accessToken = ''): array
    {
        $stmt = $this->con->prepare("SELECT dados, modo, publicar_em,
            (SELECT COUNT(*) FROM eventos_publicacoes_inscricoes i WHERE i.id_evento = eventos_publicacoes.id) AS inscritos
            FROM eventos_publicacoes WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return [];
        $event = $this->estado(json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR), $row['modo'], $row['publicar_em']);
        if (!$event['published'] || (!$event['listed'] && !$this->temAcesso($event, $accessToken))) return [];
        $event['cover'] = CapaService::url($event['id'], hash('sha256', $event['cover'] ?? ''), $accessToken, 1280);
        $event['registrationCount'] = (int) $row['inscritos'];
        $event = $this->comAtividades($event);
        $event['date_begin'] = $event['date_end'] = $event['date'];
        $event['time_begin'] = $event['time_end'] = $event['time'];
        return [$this->dadosPublicos($event, $accessToken)];
    }

    private function comAtividades(array $event): array
    {
        $event = EventoConfiguracao::rotulos($event);
        $event['eventType'] ??= 'simple';
        $event['activities'] = $event['eventType'] === 'multiple' ? (new AtividadeService($this->con))->listar($event['id']) : [];
        return $event;
    }

    private function temAcesso(array $event, mixed $accessToken): bool
    {
        if (($event['accessMode'] ?? 'public') === 'public') return true;
        return is_string($accessToken) && preg_match('/^[a-f0-9]{64}$/D', $accessToken)
            && is_string($event['accessToken'] ?? null) && hash_equals($event['accessToken'], $accessToken);
    }

    private function dadosPublicos(array $event, string $accessToken = ''): array
    {
        $event['accessGranted'] = $this->temAcesso($event, $accessToken);
        unset($event['accessToken'], $event['allowedParticipants']);
        if (!$event['accessGranted']) unset($event['fields']);
        return EventoConfiguracao::publico($event);
    }

    public function salvar(array $event, string $organizador): array
    {
        $ownsTransaction = !$this->con->inTransaction();
        if ($ownsTransaction) $this->con->beginTransaction();
        try {
            $saved = $this->salvarEvento($event, $organizador);
            if ($ownsTransaction) $this->con->commit();
            return $saved;
        } catch (\Throwable $error) {
            if ($ownsTransaction) $this->con->rollBack();
            throw $error;
        }
    }

    private function salvarEvento(array $event, string $organizador): array
    {
        foreach (['title', 'institution', 'category', 'audience', 'date', 'time', 'cover'] as $field) {
            if (!is_string($event[$field] ?? null) || trim($event[$field]) === '') {
                throw new InvalidArgumentException('Preencha todos os campos obrigatórios e selecione uma imagem de capa.');
            }
            $event[$field] = trim($event[$field]);
        }
        foreach (['summary', 'description'] as $field) {
            $value = $event[$field] ?? '';
            if (!is_string($value)) {
                throw new InvalidArgumentException('Resumo e descrição devem ser textos.');
            }
            $event[$field] = trim($value);
        }
        $types = ['escola-ideau-santa-clara' => 'escola', 'faculdade-ideau' => 'faculdade'];
        if (!isset($types[$event['institution']])) throw new InvalidArgumentException('Selecione uma instituição válida.');
        $event['institutionType'] = $types[$event['institution']];
        $event['audience'] = $event['institutionType'] === 'escola' ? 'escola' : 'graduacao';
        // O texto de divulgação é livre; a instituição continua definindo os dados da inscrição.
        if (array_key_exists('audienceLabel', $event)) {
            if (!is_string($event['audienceLabel']) || trim($event['audienceLabel']) === '') {
                throw new InvalidArgumentException('Informe o público-alvo do evento.');
            }
            $event['audienceLabel'] = trim($event['audienceLabel']);
        }
        $event['fields'] = is_array($event['fields'] ?? null) ? $event['fields'] : [];
        if ($event['audience'] === 'escola') {
            $event['fields']['responsibleName'] = true;
            $event['fields']['studentName'] = true;
            $event['fields']['course'] = false;
            $event['fields']['community'] = false;
        } else {
            foreach (['responsibleCPF', 'responsibleName', 'relationship', 'studentName', 'studentClass'] as $field) {
                $event['fields'][$field] = false;
            }
        }
        if (!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D', $event['date']) || str_starts_with($event['date'], '0000-')) {
            throw new InvalidArgumentException('Informe uma data válida, com dia, mês e ano de 4 dígitos.');
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $event['date'] . ' ' . $event['time'], new DateTimeZone('America/Sao_Paulo'));
        if (!$date || $date->format('Y-m-d H:i') !== $event['date'] . ' ' . $event['time']) {
            throw new InvalidArgumentException('Informe data e horário válidos para o evento.');
        }
        $seats = $event['seats'] ?? -1;
        if (filter_var($seats, FILTER_VALIDATE_INT) === false || ((int) $seats !== -1 && (int) $seats < 1)) {
            throw new InvalidArgumentException('Informe um número positivo de vagas ou deixe o campo vazio.');
        }
        $event['seats'] = (int) $seats;
        $registrationEnd = $event['registrationEndAt'] ?? null;
        if ($registrationEnd !== null && $registrationEnd !== '') {
            $deadline = is_string($registrationEnd) ? DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z', $registrationEnd, new DateTimeZone('UTC')) : false;
            if (!$deadline || $deadline->format('Y-m-d\TH:i:s.v\Z') !== $registrationEnd) {
                throw new InvalidArgumentException('Informe uma data e horário válidos para encerrar as inscrições.');
            }
            $event['registrationEndAt'] = $registrationEnd;
        } else {
            $event['registrationEndAt'] = null;
        }
        $endAt = $event['endAt'] ?? null;
        if ($endAt !== null && $endAt !== '') {
            $end = is_string($endAt) ? DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z', $endAt, new DateTimeZone('UTC')) : false;
            if (!$end || $end->format('Y-m-d\TH:i:s.v\Z') !== $endAt) {
                throw new InvalidArgumentException('Informe uma data e horário válidos para o encerramento.');
            }
            if ($end <= new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
                throw new InvalidArgumentException('O limite para encerrar deve estar no futuro.');
            }
            $event['endAt'] = $end->format('Y-m-d\TH:i:s.v\Z');
        } else {
            $event['endAt'] = null;
        }
        $mode = $event['publicationMode'] ?? 'draft';
        if (!in_array($mode, ['published', 'draft', 'scheduled', 'automatic'], true)) {
            throw new InvalidArgumentException('Escolha uma opção de publicação válida.');
        }
        $publishAt = null;
        if ($mode === 'automatic') {
            $value = $event['publishAt'] ?? '';
            if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/D', $value)) {
                throw new InvalidArgumentException('Informe a data e o horário da publicação automática.');
            }
            $publishAt = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z', $value, new DateTimeZone('UTC'));
            if (!$publishAt || $publishAt->format('Y-m-d\TH:i:s.v\Z') !== $value) {
                throw new InvalidArgumentException('Informe uma data e horário válidos para a publicação.');
            }
            if ($publishAt <= new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
                throw new InvalidArgumentException('A publicação automática deve ser agendada para um horário futuro.');
            }
        }
        $id = $event['id'] ?? '';
        if (!is_string($id) || !preg_match('/^evt-[a-z0-9-]{1,96}$/D', $id)) {
            $id = 'evt-' . bin2hex(random_bytes(12));
        }
        $event['id'] = $id;
        $event['publicationMode'] = $mode;
        $event['published'] = $mode === 'published';
        $event['publishAt'] = $publishAt?->format('Y-m-d\TH:i:s\Z');
        if ($publishAt && !empty($event['registrationEndAt']) && $publishAt >= new DateTimeImmutable($event['registrationEndAt'])) {
            throw new InvalidArgumentException('A publicação deve ocorrer antes do limite das inscrições.');
        }
        $effectiveEnd = $this->limite($event);
        if ($publishAt && $effectiveEnd && $publishAt >= $effectiveEnd) {
            throw new InvalidArgumentException('A publicação deve ocorrer antes do encerramento.');
        }
        $owner = $this->con->prepare('SELECT organizador, dados, modo, publicar_em FROM eventos_publicacoes WHERE id = ? FOR UPDATE');
        $owner->execute([$id]);
        $existing = $owner->fetch(PDO::FETCH_ASSOC);
        if ($existing !== false && $existing['organizador'] !== $organizador) {
            throw new InvalidArgumentException('Este evento pertence a outro organizador.');
        }
        if ($existing && $this->estado(json_decode($existing['dados'], true), $existing['modo'], $existing['publicar_em'])['closed']) {
            throw new InvalidArgumentException('Este evento já foi encerrado e está no histórico. Atualize a página.');
        }
        $previous = $existing ? json_decode($existing['dados'], true, 512, JSON_THROW_ON_ERROR) : [];
        if ($existing && CapaService::referenciaValida($event['cover'], $id, $previous['cover'] ?? '')) {
            $event['cover'] = $previous['cover'];
        }
        if (!preg_match('#^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#D', $event['cover'], $image)) {
            throw new InvalidArgumentException('Selecione uma capa PNG, JPG ou WEBP.');
        }
        $bytes = base64_decode($image[2], true);
        $info = $bytes !== false ? @getimagesizefromstring($bytes) : false;
        if (!$info || !in_array($info['mime'], ['image/png', 'image/jpeg', 'image/webp'], true) || strlen($bytes) > 2 * 1024 * 1024) {
            throw new InvalidArgumentException('Selecione uma imagem válida de até 2 MB.');
        }
        $event = EventoConfiguracao::validar($event, $previous);
        if ($existing && (($event['modality'] !== ($previous['modality'] ?? 'presencial')) || $event['delivery']['allowChoice'] !== ($previous['delivery']['allowChoice'] ?? false))) {
            $count = $this->con->prepare('SELECT COUNT(*) FROM eventos_publicacoes_inscricoes WHERE id_evento = ?');
            $count->execute([$id]);
            if ($count->fetchColumn()) throw new InvalidArgumentException('A modalidade e a escolha de participação não podem mudar enquanto houver inscritos. As informações de acesso podem ser atualizadas.');
        }
        $event['eventType'] = $event['eventType'] ?? $previous['eventType'] ?? 'simple';
        if (!in_array($event['eventType'], ['simple', 'multiple'], true)) throw new InvalidArgumentException('Tipo de evento inválido.');
        if ($existing && $event['eventType'] !== ($previous['eventType'] ?? 'simple')) {
            $count = $this->con->prepare('SELECT COUNT(*) FROM eventos_publicacoes_inscricoes WHERE id_evento = ?');
            $count->execute([$id]);
            if ($count->fetchColumn()) throw new InvalidArgumentException('O tipo do evento não pode mudar após receber inscrições.');
        }
        $activities = $event['activities'] ?? null;
        unset($event['activities']);
        $sameSchedule = $existing && ($previous['date'] ?? '') === $event['date']
            && ($previous['time'] ?? '') === $event['time'] && $existing['modo'] === $mode;
        if (!$sameSchedule && $date <= new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'))) {
            throw new InvalidArgumentException('Escolha uma data e horário futuros para o evento (horário de Brasília).');
        }
        $event['accessMode'] = $event['accessMode'] ?? $previous['accessMode'] ?? 'public';
        if (!in_array($event['accessMode'], ['public', 'link'], true)) throw new InvalidArgumentException('Escolha uma opção de acesso válida.');
        $listed = $event['listed'] ?? $previous['listed'] ?? ($event['accessMode'] === 'public');
        if (!is_bool($listed)) throw new InvalidArgumentException('Informe se o evento aparece na página pública.');
        $event['listed'] = $event['accessMode'] === 'public' ? true : $listed;
        // Somente o servidor cria o segredo. Edições comuns preservam o link compartilhado.
        if ($event['accessMode'] === 'link') {
            $event['accessToken'] = ($previous['accessMode'] ?? 'public') === 'link' && !empty($previous['accessToken'])
                ? $previous['accessToken'] : bin2hex(random_bytes(32));
        } else {
            unset($event['accessToken']);
        }
        $event['targetCourse'] = $event['targetCourse'] ?? $previous['targetCourse'] ?? '';
        $event['recipientMode'] = $event['recipientMode'] ?? $previous['recipientMode'] ?? 'course';
        // Listas prévias antigas passam a exigir análise para novas inscrições.
        if ($event['recipientMode'] === 'selected') $event['recipientMode'] = 'manual';
        unset($event['allowedParticipants']);
        if ($event['accessMode'] === 'link' && $event['institutionType'] === 'faculdade') {
            if (!in_array($event['recipientMode'], ['anyone', 'course', 'manual'], true)) throw new InvalidArgumentException('Escolha quem pode se inscrever pelo link.');
            if ($event['recipientMode'] === 'anyone') {
                $event['targetCourse'] = '';
                $event['fields']['course'] = false;
            } else {
                if (!is_string($event['targetCourse']) || trim($event['targetCourse']) === '') throw new InvalidArgumentException('Informe o curso permitido para este evento.');
                $event['targetCourse'] = trim($event['targetCourse']);
                $event['fields']['cpf'] = $event['fields']['course'] = true;
                $event['fields']['community'] = false;
            }
        } else {
            $event['targetCourse'] = '';
            $event['recipientMode'] = 'course';
        }
        unset($event['accessGranted']);
        // O cliente não pode reabrir eventos nem definir o motivo do encerramento.
        unset($event['closedAt'], $event['closed'], $event['closeReason'], $event['effectiveEndAt']);
        $stmt = $this->con->prepare('INSERT INTO eventos_publicacoes (id, organizador, modo, publicar_em, dados)
            VALUES (:id, :organizador, :modo, :publicar_em, :dados)
            ON DUPLICATE KEY UPDATE modo = IF(organizador = VALUES(organizador), VALUES(modo), modo),
                publicar_em = IF(organizador = VALUES(organizador), VALUES(publicar_em), publicar_em),
                dados = IF(organizador = VALUES(organizador), VALUES(dados), dados)');
        $stmt->execute(['id' => $id, 'organizador' => $organizador, 'modo' => $mode,
            'publicar_em' => $publishAt?->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'dados' => json_encode($event, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
        if ($event['eventType'] === 'multiple' || ($previous['eventType'] ?? '') === 'multiple') {
            $activityService = new AtividadeService($this->con);
            $activityService->salvar($event, $activities ?? $activityService->listar($id));
        }
        return $this->comAtividades($this->estado($event, $mode, $publishAt?->format('Y-m-d H:i:s')));
    }

    private function limite(array $event): ?DateTimeImmutable
    {
        if (!empty($event['endAt'])) return new DateTimeImmutable($event['endAt']);
        return null;
    }

    public function estado(array $event, string $mode, ?string $publishAt): array
    {
        $event['accessMode'] = $event['accessMode'] ?? 'public';
        $event['listed'] = $event['listed'] ?? true;
        if (($event['recipientMode'] ?? '') === 'selected') $event['recipientMode'] = 'manual';
        unset($event['allowedParticipants']);
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $limit = $this->limite($event);
        $expired = $mode !== 'draft' && $limit !== null && $limit <= $now;
        $closedAt = $event['closedAt'] ?? ($expired ? $limit->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z') : null);
        $released = $mode === 'published' || ($mode === 'automatic' && $publishAt && new DateTimeImmutable($publishAt, new DateTimeZone('UTC')) <= $now);
        $event['closed'] = $closedAt !== null;
        $event['closedAt'] = $closedAt;
        $event['closeReason'] = $closedAt ? ($event['closeReason'] ?? 'automatic') : null;
        $event['effectiveEndAt'] = $limit?->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        $event['published'] = $released && !$event['closed'];
        $event['registrationClosed'] = !$event['published'] || (!empty($event['registrationEndAt']) && new DateTimeImmutable($event['registrationEndAt']) <= $now);
        $event['publicationMode'] = $released ? 'published' : $mode;
        $event['publishAt'] = $publishAt ? (new DateTimeImmutable($publishAt, new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z') : null;
        return $event;
    }

    public function excluir(string $id, string $organizador): void
    {
        $this->con->beginTransaction();
        try {
            $stmt = $this->con->prepare('SELECT id FROM eventos_publicacoes WHERE id = ? AND organizador = ? FOR UPDATE');
            $stmt->execute([$id, $organizador]);
            if (!$stmt->fetchColumn()) throw new InvalidArgumentException('Evento não encontrado para este organizador.');
            $this->con->prepare('DELETE FROM eventos_publicacoes_inscricoes WHERE id_evento = ?')->execute([$id]);
            if (CancelamentoEstatistica::disponivel($this->con)) {
                $this->con->prepare("DELETE FROM dashboard_cancelamentos WHERE origem = 'publicacao' AND id_evento = ?")->execute([$id]);
            }
            $this->con->prepare('DELETE FROM eventos_publicacoes WHERE id = ? AND organizador = ?')->execute([$id, $organizador]);
            $this->con->commit();
        } catch (\Throwable $error) {
            $this->con->rollBack();
            throw $error;
        }
    }

    public function encerrar(string $id, string $organizador): array
    {
        $this->con->beginTransaction();
        try {
            $stmt = $this->con->prepare('SELECT dados, modo, publicar_em FROM eventos_publicacoes WHERE id = ? AND organizador = ? FOR UPDATE');
            $stmt->execute([$id, $organizador]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) throw new InvalidArgumentException('Evento não encontrado para este organizador.');
            $event = $this->estado(json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR), $row['modo'], $row['publicar_em']);
            if (!$event['closed']) {
                $event['closedAt'] = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
                $event['closeReason'] = 'manual';
                $stmt = $this->con->prepare('UPDATE eventos_publicacoes SET dados = ? WHERE id = ? AND organizador = ?');
                $stmt->execute([json_encode($event, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $id, $organizador]);
            }
            $this->con->commit();
            return $this->estado($event, $row['modo'], $row['publicar_em']);
        } catch (\Throwable $error) {
            $this->con->rollBack();
            throw $error;
        }
    }

    public function listarInscricoes(string $organizador): array
    {
        $stmt = $this->con->prepare('SELECT i.dados FROM eventos_publicacoes_inscricoes i
            JOIN eventos_publicacoes e ON e.id = i.id_evento WHERE e.organizador = ?');
        $stmt->execute([$organizador]);
        return array_map(function ($json) {
            $registration = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            $registration['activities'] = !empty($registration['activityIds']) ? (new AtividadeService($this->con))->inscricoes($registration['id']) : [];
            return $registration;
        }, $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function revisarInscricao(string $eventId, string $id, string $action, string $organizador): array
    {
        if (!in_array($action, ['approve', 'reject', 'remove'], true)) throw new InvalidArgumentException('Escolha uma ação válida.');
        $this->con->beginTransaction();
        try {
            // Mesma ordem de bloqueio da inscrição/cancelamento: evento antes do aluno.
            $stmt = $this->con->prepare('SELECT id FROM eventos_publicacoes WHERE id = ? AND organizador = ? FOR UPDATE');
            $stmt->execute([$eventId, $organizador]);
            if (!$stmt->fetchColumn()) throw new InvalidArgumentException('Evento não encontrado para este organizador.');
            $stmt = $this->con->prepare('SELECT dados FROM eventos_publicacoes_inscricoes WHERE id = ? AND id_evento = ? FOR UPDATE');
            $stmt->execute([$id, $eventId]);
            $json = $stmt->fetchColumn();
            if (!$json) throw new InvalidArgumentException('Inscrição não encontrada. Atualize a lista.');
            $registration = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            if ($action === 'approve') {
                $registration['reviewStatus'] = 'approved';
                $registration['reviewedAt'] ??= gmdate('Y-m-d\TH:i:s\Z');
                $this->con->prepare('UPDATE eventos_publicacoes_inscricoes SET dados = ? WHERE id = ? AND id_evento = ?')
                    ->execute([json_encode($registration, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $id, $eventId]);
            } else {
                if ($action === 'reject' && ($registration['reviewStatus'] ?? 'approved') !== 'pending') throw new InvalidArgumentException('Esta inscrição já foi aprovada. Atualize a lista antes de remover.');
                CancelamentoEstatistica::registrar($this->con, false, $id, $eventId);
                if (!empty($registration['activityIds'])) (new AtividadeService($this->con))->cancelarTodas($id);
                $this->con->prepare('DELETE FROM eventos_publicacoes_inscricoes WHERE id = ? AND id_evento = ?')->execute([$id, $eventId]);
            }
            $this->con->commit();
            return ['success' => true];
        } catch (\Throwable $error) {
            if ($this->con->inTransaction()) $this->con->rollBack();
            throw $error;
        }
    }

    public function inscrever(array $registration): array
    {
        return $this->registrarInscricao($registration);
    }

    public function inscreverOrganizador(array $registration, string $organizador): array
    {
        // A identidade vem da sessao, nunca do email ou selo enviados pelo navegador.
        $registration = array_intersect_key($registration, array_flip([
            'eventId', 'name', 'cpf', 'phone', 'activityIds', 'participationMode'
        ]));
        $registration['email'] = ValidacaoDados::email($organizador, true);
        foreach (['name' => 255, 'phone' => 40] as $field => $limit) {
            $value = $registration[$field] ?? '';
            if (!is_string($value) || mb_strlen(trim($value)) > $limit) {
                throw new InvalidArgumentException('Informe um nome e telefone validos.');
            }
            $registration[$field] = trim($value);
        }
        return $this->registrarInscricao($registration, $organizador);
    }

    private function registrarInscricao(array $registration, ?string $organizador = null): array
    {
        unset($registration['isOrganizer'], $registration['organizerAccount']);
        if (!is_string($registration['eventId'] ?? null) || $registration['eventId'] === '') {
            throw new InvalidArgumentException('Informe o evento.');
        }
        $this->con->beginTransaction();
        try {
            $stmt = $this->con->prepare("SELECT dados, modo, publicar_em, organizador FROM eventos_publicacoes WHERE id = ?
                AND (modo = 'published' OR (modo = 'automatic' AND publicar_em <= UTC_TIMESTAMP())) FOR UPDATE");
            $stmt->execute([$registration['eventId'] ?? '']);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) throw new InvalidArgumentException('Este evento não está disponível para inscrição.');
            if ($organizador !== null && $row['organizador'] !== $organizador) {
                throw new InvalidArgumentException('Você só pode se inscrever como organizador nos seus próprios eventos.');
            }
            $event = $this->estado(json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR), $row['modo'], $row['publicar_em']);
            if (!$event['published']) throw new InvalidArgumentException('Este evento foi encerrado. As inscrições estão fechadas.');
            if ($organizador === null && !$this->temAcesso($event, $registration['accessToken'] ?? '')) throw new InvalidArgumentException('Use o link de acesso enviado pelo organizador para se inscrever neste evento.');
            if ($organizador === null && $event['accessMode'] === 'link' && !empty($event['targetCourse'])) {
                $course = $registration['course'] ?? '';
                if (!is_string($course) || mb_strtolower(trim($course), 'UTF-8') !== mb_strtolower($event['targetCourse'], 'UTF-8') || ($registration['participantType'] ?? '') !== 'aluno') throw new InvalidArgumentException('Este evento permite inscrições apenas para o curso informado na divulgação.');
            }
            unset($registration['accessToken']);
            if ($event['registrationClosed']) throw new InvalidArgumentException('O prazo para inscrição neste evento terminou. Consulte sua inscrição pelo link Consultar minha inscrição.');
            $required = $event['audience'] === 'escola' ? ['responsibleName', 'studentName'] : ['name'];
            foreach (['cpf', 'email', 'phone', 'relationship', 'studentClass'] as $field) {
                if ($event['fields'][$field] ?? false) $required[] = $field;
            }
            if ($event['fields']['responsibleCPF'] ?? false) $required[] = 'responsibleCpf';
            if (($event['fields']['course'] ?? false) && ($registration['participantType'] ?? '') !== 'comunidade') $required[] = 'course';
            if ($organizador !== null) {
                // O proprio organizador informa seus dados, inclusive em eventos escolares.
                $required = ['name', 'email'];
                if (!empty($event['fields']['cpf'])) $required[] = 'cpf';
                if (!empty($event['fields']['phone'])) $required[] = 'phone';
                $registration['isOrganizer'] = true;
                $registration['organizerAccount'] = $organizador;
                $registration['participantType'] = 'organizador';
            }
            foreach ($required as $field) {
                if (!is_string($registration[$field] ?? null) || trim($registration[$field]) === '') {
                    throw new InvalidArgumentException('Preencha todos os campos obrigatórios da inscrição.');
                }
            }
            foreach (['cpf', 'responsibleCpf'] as $field) {
                $registration[$field] = ValidacaoDados::cpf($registration[$field] ?? null, in_array($field, $required, true));
            }
            $registration['email'] = ValidacaoDados::email($registration['email'] ?? null, in_array('email', $required, true));
            // O bloqueio do evento serializa tentativas e evita inscrições duplicadas.
            $stmt = $this->con->prepare('SELECT dados FROM eventos_publicacoes_inscricoes WHERE id_evento = ?');
            $stmt->execute([$event['id']]);
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($rows as $json) {
                $existing = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
                $ownRegistration = $organizador !== null && ($existing['isOrganizer'] ?? false) === true
                    && ($existing['organizerAccount'] ?? null) === $organizador;
                if ($ownRegistration || $this->mesmoParticipante($existing, $registration, $organizador !== null ? 'graduacao' : $event['audience'])) {
                    if ($organizador !== null && !$ownRegistration) {
                        if (mb_strtolower(trim((string) ($existing['email'] ?? ''))) !== mb_strtolower($registration['email'])) {
                            throw new InvalidArgumentException('Já existe uma inscrição com esses dados e outro e-mail. Confira a lista de inscritos.');
                        }
                        $existing['isOrganizer'] = true;
                        $existing['organizerAccount'] = $organizador;
                        $existing['participantType'] = 'organizador';
                        $existing['reviewStatus'] = 'approved';
                        $this->con->prepare('UPDATE eventos_publicacoes_inscricoes SET dados = ? WHERE id = ? AND id_evento = ?')
                            ->execute([json_encode($existing, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $existing['id'], $event['id']]);
                    }
                    $this->con->commit();
                    if ($organizador !== null) {
                        return array_replace(ComprovanteService::resposta($this->comprovante($existing, $event)),
                            ['alreadyRegistered' => true, 'message' => 'Você já está inscrito como organizador.']);
                    }
                    return ComprovanteService::resposta($this->comprovante($existing, $event), true);
                }
            }
            if ($event['seats'] !== -1 && count($rows) >= $event['seats']) {
                throw new InvalidArgumentException('As vagas deste evento estão esgotadas.');
            }
            $registration = EventoConfiguracao::inscricao($registration, $event);
            $registration['activityIds'] = ($event['eventType'] ?? 'simple') === 'multiple'
                ? (new AtividadeService($this->con))->selecionar($event['id'], $registration['activityIds'] ?? null) : [];
            unset($registration['activities']);
            $registration['reviewStatus'] = $organizador === null && $event['accessMode'] === 'link' && ($event['recipientMode'] ?? 'course') === 'manual' ? 'pending' : 'approved';
            unset($registration['reviewedAt']);
            $registration['id'] = 'reg-' . bin2hex(random_bytes(12));
            $registration['createdAt'] = gmdate('Y-m-d\TH:i:s\Z');
            $registration['audience'] = $event['audience'];
            $registration['responsiblecpf'] = $registration['responsibleCpf'] ?? '';
            $registration['name'] = $organizador === null && $event['audience'] === 'escola' ? $registration['studentName'] : $registration['name'];
            $stmt = $this->con->prepare('INSERT INTO eventos_publicacoes_inscricoes (id, id_evento, dados) VALUES (?, ?, ?)');
            $stmt->execute([$registration['id'], $event['id'], json_encode($registration, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
            if ($registration['activityIds']) (new AtividadeService($this->con))->inscrever($registration['id'], $registration['activityIds']);
            $this->con->commit();
            return ComprovanteService::resposta($this->comprovante($registration, $event));
        } catch (\Throwable $error) {
            if ($this->con->inTransaction()) $this->con->rollBack();
            throw $error;
        }
    }
    private function mesmoParticipante(array $a, array $b, string $audience): bool
    {
        $normal = static fn ($value) => mb_strtolower(preg_replace('/\s+/u', ' ', trim((string) $value)), 'UTF-8');
        if ($audience !== 'escola' && !empty($a['cpf'])) {
            return preg_replace('/\D/', '', $a['cpf']) === preg_replace('/\D/', '', $b['cpf'] ?? '');
        }
        $name = $audience === 'escola' ? 'studentName' : 'name';
        if ($normal($a[$name] ?? $a['name'] ?? '') !== $normal($b[$name] ?? '')) return false;
        $identity = $audience === 'escola' ? ['responsibleCpf', 'cpf', 'email', 'phone', 'responsibleName'] : ['cpf', 'email', 'phone'];
        foreach ($identity as $field) {
            $old = $a[$field] ?? ($field === 'responsibleCpf' ? ($a['responsiblecpf'] ?? '') : '');
            if (trim((string) $old) !== '') return $normal($old) === $normal($b[$field] ?? '');
        }
        // Eventos que solicitam somente o nome identificam por esse dado.
        return true;
    }

    private function comprovante(array $registration, array $event): array
    {
        return ['protocol' => $registration['id'], 'eventId' => $event['id'],
            'reviewStatus' => $registration['reviewStatus'] ?? 'approved',
            'name' => $registration['name'] ?? $registration['studentName'],
            'eventTitle' => $event['title'], 'date' => substr(ComprovanteService::data($event['date']), 0, 10),
            'time' => $event['time'], 'location' => $event['location'],
            'registeredAt' => ComprovanteService::data($registration['createdAt'])];
    }
}
