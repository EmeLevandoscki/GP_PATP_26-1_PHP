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
        $stmt = $this->con->prepare($sql);
        $stmt->execute($organizador !== null ? ['organizador' => $organizador] : []);
        $events = array_map(function ($row) {
            $event = json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR);
            $event = $this->estado($event, $row['modo'], $row['publicar_em']);
            $event['createdAt'] = gmdate('Y-m-d\TH:i:s\Z', (int) $row['criado_timestamp']);
            $event['registrationCount'] = (int) $row['inscritos'];
            $event['date_begin'] = $event['date'];
            $event['date_end'] = $event['date'];
            $event['time_begin'] = $event['time'];
            $event['time_end'] = $event['time'];
            return $event;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
        return $organizador !== null ? $events : array_values(array_filter($events, fn ($event) => $event['published']));
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
        foreach (['title', 'institution', 'category', 'audience', 'date', 'time', 'location', 'cover'] as $field) {
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
        $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $event['date'] . ' ' . $event['time']);
        if (!$date || $date->format('Y-m-d H:i') !== $event['date'] . ' ' . $event['time']) {
            throw new InvalidArgumentException('Informe data e horário válidos para o evento.');
        }
        $seats = $event['seats'] ?? -1;
        if (filter_var($seats, FILTER_VALIDATE_INT) === false || ((int) $seats !== -1 && (int) $seats < 1)) {
            throw new InvalidArgumentException('Informe um número positivo de vagas ou deixe o campo vazio.');
        }
        $event['seats'] = (int) $seats;
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
        if (!preg_match('#^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#D', $event['cover'], $image)) {
            throw new InvalidArgumentException('Selecione uma capa PNG, JPG ou WEBP.');
        }
        $bytes = base64_decode($image[2], true);
        $info = $bytes !== false ? @getimagesizefromstring($bytes) : false;
        if (!$info || !in_array($info['mime'], ['image/png', 'image/jpeg', 'image/webp'], true) || strlen($bytes) > 2 * 1024 * 1024) {
            throw new InvalidArgumentException('Selecione uma imagem válida de até 2 MB.');
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
        return $this->estado($event, $mode, $publishAt?->format('Y-m-d H:i:s'));
    }

    private function limite(array $event): ?DateTimeImmutable
    {
        if (!empty($event['endAt'])) return new DateTimeImmutable($event['endAt']);
        return null;
    }

    private function estado(array $event, string $mode, ?string $publishAt): array
    {
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
        $event['publicationMode'] = $released ? 'published' : $mode;
        $event['publishAt'] = $publishAt ? (new DateTimeImmutable($publishAt, new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z') : null;
        return $event;
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
        return array_map(fn ($json) => json_decode($json, true, 512, JSON_THROW_ON_ERROR), $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function inscrever(array $registration): array
    {
        $this->con->beginTransaction();
        try {
            $stmt = $this->con->prepare("SELECT dados, modo, publicar_em FROM eventos_publicacoes WHERE id = ?
                AND (modo = 'published' OR (modo = 'automatic' AND publicar_em <= UTC_TIMESTAMP())) FOR UPDATE");
            $stmt->execute([$registration['eventId'] ?? '']);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) throw new InvalidArgumentException('Este evento não está disponível para inscrição.');
            $event = $this->estado(json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR), $row['modo'], $row['publicar_em']);
            if (!$event['published']) throw new InvalidArgumentException('Este evento foi encerrado. As inscrições estão fechadas.');
            $required = $event['audience'] === 'escola' ? ['responsibleName', 'studentName'] : ['name'];
            foreach (['cpf', 'email', 'phone', 'relationship', 'studentClass'] as $field) {
                if ($event['fields'][$field] ?? false) $required[] = $field;
            }
            if ($event['fields']['responsibleCPF'] ?? false) $required[] = 'responsibleCpf';
            if (($event['fields']['course'] ?? false) && ($registration['participantType'] ?? '') !== 'comunidade') $required[] = 'course';
            foreach ($required as $field) {
                if (!is_string($registration[$field] ?? null) || trim($registration[$field]) === '') {
                    throw new InvalidArgumentException('Preencha todos os campos obrigatórios da inscrição.');
                }
            }
            foreach (['cpf', 'responsibleCpf'] as $field) {
                if (in_array($field, $required, true) && !preg_match('/^\d{11}$/D', $registration[$field])) {
                    throw new InvalidArgumentException('Informe o CPF com 11 números.');
                }
            }
            if (in_array('email', $required, true) && !filter_var($registration['email'], FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Informe um e-mail válido.');
            }
            // O bloqueio do evento serializa tentativas e evita inscrições duplicadas.
            $stmt = $this->con->prepare('SELECT dados FROM eventos_publicacoes_inscricoes WHERE id_evento = ?');
            $stmt->execute([$event['id']]);
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($rows as $json) {
                $existing = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
                if ($this->mesmoParticipante($existing, $registration, $event['audience'])) {
                    $this->con->commit();
                    return ComprovanteService::resposta($this->comprovante($existing, $event), true);
                }
            }
            if ($event['seats'] !== -1 && count($rows) >= $event['seats']) {
                throw new InvalidArgumentException('As vagas deste evento estão esgotadas.');
            }
            $registration['id'] = 'reg-' . bin2hex(random_bytes(12));
            $registration['createdAt'] = gmdate('Y-m-d\TH:i:s\Z');
            $registration['audience'] = $event['audience'];
            $registration['responsiblecpf'] = $registration['responsibleCpf'] ?? '';
            $registration['name'] = $event['audience'] === 'escola' ? $registration['studentName'] : $registration['name'];
            $stmt = $this->con->prepare('INSERT INTO eventos_publicacoes_inscricoes (id, id_evento, dados) VALUES (?, ?, ?)');
            $stmt->execute([$registration['id'], $event['id'], json_encode($registration, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
            $this->con->commit();
            return ComprovanteService::resposta($this->comprovante($registration, $event));
        } catch (\Throwable $error) {
            $this->con->rollBack();
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
            'name' => $registration['name'] ?? $registration['studentName'],
            'eventTitle' => $event['title'], 'date' => substr(ComprovanteService::data($event['date']), 0, 10),
            'time' => $event['time'], 'location' => $event['location'],
            'registeredAt' => ComprovanteService::data($registration['createdAt'])];
    }
}
