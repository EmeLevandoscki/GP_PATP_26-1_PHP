<?php
namespace App\Service;

use PDO;
use InvalidArgumentException;

/** Todas as mutações ocorrem na transação que bloqueou o evento principal. */
final class AtividadeService
{
    public function __construct(private PDO $db) {}

    public function listar(string $eventId, bool $history = false): array
    {
        $stmt = $this->db->prepare('SELECT a.id, a.dados, a.excluida_em,
            (SELECT COUNT(*) FROM eventos_publicacoes_atividade_inscricoes i
             WHERE i.id_atividade = a.id AND i.cancelado_em IS NULL AND i.id_inscricao IS NOT NULL) AS inscritos
            FROM eventos_publicacoes_atividades a WHERE a.id_evento = ?' . ($history ? '' : ' AND a.excluida_em IS NULL'));
        $stmt->execute([$eventId]);
        $rows = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $a = json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR);
            $a['id'] = $row['id'];
            $a['registrationCount'] = (int) $row['inscritos'];
            $a['remaining'] = max(0, $a['seats'] - $a['registrationCount']);
            $a['deleted'] = $row['excluida_em'] !== null;
            $rows[] = $a;
        }
        usort($rows, fn ($a, $b) => strcmp($a['startAt'], $b['startAt']));
        return $rows;
    }

    public static function validar(array $input): array
    {
        $result = [];
        foreach (['name' => 200, 'description' => 10000, 'location' => 255, 'speaker' => 255] as $key => $max) {
            $value = $input[$key] ?? '';
            if (!is_string($value) || mb_strlen($value) > $max || ($key === 'name' && trim($value) === '')) {
                throw new InvalidArgumentException('Informe os dados válidos da atividade (nome obrigatório).');
            }
            $result[$key] = trim($value);
        }
        $result['type'] = $input['type'] ?? 'outro';
        if (!is_string($result['type']) || !isset(EventoConfiguracao::tipos()[$result['type']])) throw new InvalidArgumentException('Tipo de atividade inválido.');
        $result['customType'] = $result['type'] === 'outro' ? EventoConfiguracao::texto($input['customType'] ?? '', 'tipo personalizado da atividade', 100) : '';
        foreach (['startAt', 'endAt'] as $key) {
            $value = $input[$key] ?? null;
            $date = is_string($value) ? \DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $value, new \DateTimeZone('America/Sao_Paulo')) : false;
            if (!$date || $date->format('Y-m-d\TH:i') !== $value || substr($value, 0, 4) === '0000') throw new InvalidArgumentException('Informe data e horário válidos para a atividade.');
            $result[$key] = $value;
        }
        if ($result['endAt'] <= $result['startAt']) throw new InvalidArgumentException('O término da atividade deve ser posterior ao início.');
        $seats = filter_var($input['seats'] ?? null, FILTER_VALIDATE_INT);
        if ($seats === false || $seats < 1 || $seats > 1000000) throw new InvalidArgumentException('Informe de 1 a 1000000 vagas por atividade.');
        $hours = $input['hours'] ?? 0;
        if (!is_numeric($hours) || !is_finite((float) $hours) || $hours < 0 || $hours > 10000) throw new InvalidArgumentException('Carga horária inválida.');
        $result['seats'] = $seats;
        $result['hours'] = (float) $hours;
        return $result;
    }

    public function salvar(array $event, mixed $input): void
    {
        if (!is_array($input) || !array_is_list($input) || count($input) > 100) throw new InvalidArgumentException('Informe até 100 atividades.');
        $old = array_column($this->listar($event['id']), null, 'id');
        if ($event['eventType'] === 'multiple' && !$input) throw new InvalidArgumentException('Adicione pelo menos uma atividade.');
        if ($event['eventType'] === 'simple' && $input) throw new InvalidArgumentException('Eventos simples não possuem atividades.');
        $seen = [];
        foreach ($input as $item) {
            if (!is_array($item)) throw new InvalidArgumentException('Atividade inválida.');
            $a = self::validar($item);
            $id = $item['id'] ?? '';
            if (!is_string($id) || ($id !== '' && !isset($old[$id])) || isset($seen[$id]) && $id !== '') throw new InvalidArgumentException('Atividade inválida ou repetida neste evento.');
            if ($id === '') $id = 'act-' . bin2hex(random_bytes(12));
            $seen[$id] = true;
            if ($a['startAt'] < $event['date'] . 'T' . $event['time']) throw new InvalidArgumentException('A atividade não pode começar antes do evento.');
            if (!empty($event['endAt']) && new \DateTimeImmutable($a['endAt'], new \DateTimeZone('America/Sao_Paulo')) > new \DateTimeImmutable($event['endAt'])) throw new InvalidArgumentException('A atividade deve terminar antes do encerramento do evento.');
            if (isset($old[$id]) && $old[$id]['registrationCount'] > 0) {
                if ($a['seats'] < $old[$id]['registrationCount']) throw new InvalidArgumentException('As vagas não podem ser menores que o número de inscritos.');
                if ($a['startAt'] !== $old[$id]['startAt'] || $a['endAt'] !== $old[$id]['endAt']) throw new InvalidArgumentException('Cancele as inscrições da atividade antes de alterar seus horários.');
            }
            $this->db->prepare('INSERT INTO eventos_publicacoes_atividades (id, id_evento, dados) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE dados = VALUES(dados)')->execute([$id, $event['id'], json_encode($a, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
        }
        foreach ($old as $id => $a) {
            if (isset($seen[$id])) continue;
            if ($a['registrationCount'] > 0) throw new InvalidArgumentException('Cancele as inscrições da atividade antes de excluí-la.');
            $this->db->prepare('UPDATE eventos_publicacoes_atividades SET excluida_em = UTC_TIMESTAMP() WHERE id = ?')->execute([$id]);
        }
    }

    public function selecionar(string $eventId, mixed $ids): array
    {
        if (!is_array($ids) || !array_is_list($ids) || !$ids || count($ids) > 100) throw new InvalidArgumentException('Selecione pelo menos uma atividade.');
        $available = array_column($this->listar($eventId), null, 'id');
        $selected = [];
        foreach ($ids as $id) {
            if (!is_string($id) || !isset($available[$id]) || isset($selected[$id])) throw new InvalidArgumentException('Seleção de atividades inválida ou repetida.');
            $a = $available[$id];
            if (!$a['remaining']) throw new InvalidArgumentException('Sem vagas na atividade: ' . $a['name']);
            foreach ($selected as $other) {
                if ($a['startAt'] < $other['endAt'] && $other['startAt'] < $a['endAt']) throw new InvalidArgumentException('Conflito de horários entre ' . $a['name'] . ' e ' . $other['name'] . '. Escolha atividades em horários diferentes.');
            }
            $selected[$id] = $a;
        }
        return array_keys($selected);
    }

    public function inscrever(string $registrationId, array $ids): void
    {
        $stmt = $this->db->prepare('INSERT INTO eventos_publicacoes_atividade_inscricoes (id_atividade, id_inscricao, protocolo) VALUES (?, ?, ?)');
        foreach ($ids as $id) $stmt->execute([$id, $registrationId, $registrationId]);
    }

    public function inscricoes(string $registrationId): array
    {
        $stmt = $this->db->prepare('SELECT a.id, a.dados, i.cancelado_em, i.presente FROM eventos_publicacoes_atividade_inscricoes i
            JOIN eventos_publicacoes_atividades a ON a.id = i.id_atividade WHERE i.id_inscricao = ? ORDER BY a.id');
        $stmt->execute([$registrationId]);
        return array_map(static function ($row) {
            return array_merge(json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR), ['id' => $row['id'], 'cancelledAt' => $row['cancelado_em'], 'present' => $row['presente'] === null ? null : (bool) $row['presente']]);
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function cancelarTodas(string $registrationId): void
    {
        $this->db->prepare('UPDATE eventos_publicacoes_atividade_inscricoes SET cancelado_em = COALESCE(cancelado_em, UTC_TIMESTAMP()) WHERE id_inscricao = ?')->execute([$registrationId]);
    }

    public function cancelar(string $eventId, string $registrationId, string $activityId, ?string $organizer = null, ?array $receipt = null): void
    {
        if ($organizer === null && (!$receipt || ($receipt['protocol'] ?? '') !== $registrationId || ($receipt['eventId'] ?? '') !== $eventId)) throw new InvalidArgumentException('Inscrição não autorizada.');
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT organizador FROM eventos_publicacoes WHERE id = ? FOR UPDATE');
            $stmt->execute([$eventId]); $owner = $stmt->fetchColumn();
            if (!$owner || ($organizer !== null && $owner !== $organizer)) throw new InvalidArgumentException('Evento não autorizado.');
            $stmt = $this->db->prepare('SELECT i.id FROM eventos_publicacoes_atividade_inscricoes i
                JOIN eventos_publicacoes_atividades a ON a.id = i.id_atividade
                JOIN eventos_publicacoes_inscricoes r ON r.id = i.id_inscricao
                WHERE a.id_evento = ? AND r.id_evento = ? AND i.id_inscricao = ? AND i.id_atividade = ? FOR UPDATE');
            $stmt->execute([$eventId, $eventId, $registrationId, $activityId]);
            $id = $stmt->fetchColumn();
            if (!$id) throw new InvalidArgumentException('Atividade não encontrada nesta inscrição.');
            $this->db->prepare('UPDATE eventos_publicacoes_atividade_inscricoes SET cancelado_em = COALESCE(cancelado_em, UTC_TIMESTAMP()) WHERE id = ?')->execute([$id]);
            $this->db->commit();
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }
}
