<?php
namespace App\Service;

/** Histórico estatístico sem nome, contato, CPF ou protocolo do participante. */
final class CancelamentoEstatistica
{
    public static function disponivel(\PDO $db): bool
    {
        try { $db->query('SELECT 1 FROM dashboard_cancelamentos LIMIT 0'); return true; }
        catch (\PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1146) return false;
            throw $e;
        }
    }

    // Chamado dentro da transação e depois de bloquear o evento pai.
    public static function registrar(\PDO $db, bool $legacy, string $id, string $eventId): void
    {
        if (!self::disponivel($db)) return; // Compatível com hospedagens ainda sem o SQL aditivo.
        $sql = $legacy
            ? "SELECT a.id_evento AS event_id, UNIX_TIMESTAMP(i.inscrito_em) AS registered,
                 CASE WHEN i.id_responsavel IS NOT NULL THEN 'escola' ELSE 'unknown' END AS audience
               FROM inscricoes i JOIN atividades a ON a.id=i.id_atividade WHERE i.id=? AND i.id_atividade=?"
            : "SELECT i.id_evento AS event_id, UNIX_TIMESTAMP(i.criado_em) AS registered,
                 COALESCE(JSON_UNQUOTE(JSON_EXTRACT(e.dados,'$.institutionType')), 'unknown') AS audience
               FROM eventos_publicacoes_inscricoes i JOIN eventos_publicacoes e ON e.id=i.id_evento WHERE i.id=? AND i.id_evento=?";
        $stmt = $db->prepare($sql); $stmt->execute([$id, $eventId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return;
        $stmt = $db->prepare('INSERT INTO dashboard_cancelamentos (origem,id_evento,publico,registrado_em,cancelado_em) VALUES (?,?,?,?,UTC_TIMESTAMP())');
        $stmt->execute([$legacy ? 'legado' : 'publicacao', $row['event_id'], $row['audience'], gmdate('Y-m-d H:i:s', (int) $row['registered'])]);
    }
}
