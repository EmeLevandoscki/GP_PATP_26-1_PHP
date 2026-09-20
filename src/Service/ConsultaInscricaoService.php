<?php
namespace App\Service;

use PDO;
use InvalidArgumentException;

final class ConsultaInscricaoService
{
    public const MESSAGE = 'Se o endereço estiver correto, você receberá um link para consultar sua inscrição. Confira também a caixa de spam. Aguarde alguns minutos antes de pedir outro link.';

    public function __construct(private PDO $db, private \Closure $send, private string $baseUrl) {}

    public static function configurado(PDO $db): self
    {
        $config = \App\Config\EmailConfig::carregar();
        return new self($db, static function (string $email, string $link) use ($config): bool {
            return EmailService::mensagem($config, $email, $link)->send();
        }, $config['public_url']);
    }

    public function solicitar(string $email, string $ip): string
    {
        $email = strtolower(trim($email));
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
            throw new InvalidArgumentException('Informe um e-mail válido.');
        }
        $now = time();
        $this->db->beginTransaction();
        try {
            $allowed = true;
            foreach (['email:' . $email => 3, 'ip:' . $ip => 10] as $value => $limit) {
                $key = hash('sha256', $value);
                $this->db->prepare('INSERT IGNORE INTO inscricao_acesso_limites (chave, tentativas, expira_em) VALUES (?, 0, ?)')->execute([$key, $now + 900]);
                $stmt = $this->db->prepare('SELECT tentativas, expira_em FROM inscricao_acesso_limites WHERE chave = ? FOR UPDATE');
                $stmt->execute([$key]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $count = (int) $row['expira_em'] <= $now ? 1 : (int) $row['tentativas'] + 1;
                $expires = (int) $row['expira_em'] <= $now ? $now + 900 : (int) $row['expira_em'];
                $this->db->prepare('UPDATE inscricao_acesso_limites SET tentativas = ?, expira_em = ? WHERE chave = ?')->execute([$count, $expires, $key]);
                if ($count > $limit) $allowed = false;
            }
            if (!$allowed) { $this->db->commit(); return self::MESSAGE; }
            $token = bin2hex(random_bytes(32));
            $hash = hash('sha256', $token);
            $this->db->prepare('INSERT INTO inscricao_acessos (token_hash, email, expira_em) VALUES (?, ?, ?)')->execute([$hash, $email, $now + 1200]);
            $this->db->prepare('DELETE FROM inscricao_acessos WHERE expira_em < ?')->execute([$now]);
            $this->db->prepare('DELETE FROM inscricao_acesso_limites WHERE expira_em < ?')->execute([$now]);
            $this->db->commit();
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
        // Envia para qualquer endereço válido: a resposta não revela se alguém se inscreveu.
        try { $sent = ($this->send)($email, $this->baseUrl . '/ideau_eventos/consultar-inscricao.php?token=' . $token); }
        catch (\Throwable) { $sent = false; }
        if (!$sent) {
            $this->db->prepare('DELETE FROM inscricao_acessos WHERE token_hash = ?')->execute([$hash]);
            throw new \RuntimeException('Não foi possível enviar o e-mail agora. Tente novamente mais tarde.');
        }
        return self::MESSAGE;
    }

    public function confirmar(string $token): string
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) throw new InvalidArgumentException('Link inválido ou expirado. Solicite um novo link.');
        $this->db->beginTransaction();
        try {
            $hash = hash('sha256', $token);
            $stmt = $this->db->prepare('SELECT email, expira_em FROM inscricao_acessos WHERE token_hash = ? FOR UPDATE');
            $stmt->execute([$hash]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || (int) $row['expira_em'] <= time()) throw new InvalidArgumentException('Link inválido ou expirado. Solicite um novo link.');
            $this->db->prepare('DELETE FROM inscricao_acessos WHERE token_hash = ?')->execute([$hash]);
            $this->db->commit();
            return $row['email'];
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function inscricoes(string $email): array
    {
        $result = [];
        $stmt = $this->db->prepare("SELECT i.id, i.dados, e.dados AS evento FROM eventos_publicacoes_inscricoes i
            JOIN eventos_publicacoes e ON e.id = i.id_evento
            WHERE LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(i.dados, '$.email')))) = ?");
        $stmt->execute([strtolower(trim($email))]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $reg = json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR);
            $event = json_decode($row['evento'], true, 512, JSON_THROW_ON_ERROR);
            $result[] = ['protocol' => $row['id'], 'eventId' => $event['id'], 'name' => $reg['name'] ?? $reg['studentName'] ?? '',
                'eventTitle' => $event['title'], 'date' => substr(ComprovanteService::data($event['date']), 0, 10),
                'time' => $event['time'], 'location' => $event['location'], 'registeredAt' => ComprovanteService::data($reg['createdAt'])];
        }
        $stmt = $this->db->prepare('SELECT i.id, i.id_usuario, i.id_atividade, i.inscrito_em, a.nome AS evento, a.data_ini, a.local_atv
            FROM inscricoes i JOIN usuarios titular ON titular.id = COALESCE(i.id_responsavel, i.id_usuario)
            JOIN atividades a ON a.id = i.id_atividade WHERE LOWER(TRIM(titular.email)) = ?');
        $stmt->execute([strtolower(trim($email))]);
        $legacy = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $names = [];
        if ($legacy) {
            $ids = array_unique(array_column($legacy, 'id_usuario'));
            $stmt = $this->db->prepare('SELECT id, nome FROM usuarios WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
            $stmt->execute(array_values($ids));
            $names = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        }
        foreach ($legacy as $row) {
            $result[] = ['protocol' => 'IDEAU-' . $row['id'], 'eventId' => (string) $row['id_atividade'], 'name' => $names[$row['id_usuario']] ?? '',
                'eventTitle' => $row['evento'], 'date' => substr(ComprovanteService::data($row['data_ini']), 0, 10),
                'time' => substr($row['data_ini'], 11, 5), 'location' => $row['local_atv'], 'registeredAt' => ComprovanteService::data($row['inscrito_em'])];
        }
        return $result;
    }
}
