<?php
namespace App\Service;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use PDO;

/** Somente metadados e agregações: nunca carrega capas ou cadastros pessoais. */
final class DashboardService
{
    public function __construct(private PDO $db) {}

    private function rows(string $sql, array $params = []): array
    {
        $stmt = $this->db->prepare($sql); $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function resumo(string $owner, array $input = []): array
    {
        $zone = new DateTimeZone('America/Sao_Paulo');
        $today = new DateTimeImmutable('today', $zone);
        $period = $input['period'] ?? 'all';
        if (!in_array($period, ['all','today','7','30','custom'], true)) throw new InvalidArgumentException('Período inválido.');
        $from = null; $until = null;
        if ($period === 'custom') {
            $parse = static function ($value) use ($zone): DateTimeImmutable {
                $d = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value, $zone) : false;
                if (!$d || $d->format('Y-m-d') !== $value) throw new InvalidArgumentException('Informe datas válidas.');
                return $d;
            };
            $from = $parse($input['from'] ?? null); $end = $parse($input['to'] ?? null);
            if ($end < $from || $from->diff($end)->days > 365) throw new InvalidArgumentException('Escolha um intervalo de até 366 dias, com início antes do fim.');
            $until = $end->modify('+1 day');
        } elseif ($period !== 'all') {
            $from = $today->modify('-' . (($period === 'today' ? 1 : (int) $period) - 1) . ' days');
            $until = $today->modify('+1 day');
        }
        $audience = $input['audience'] ?? 'all';
        $scope = $input['scope'] ?? 'all';
        if (!in_array($audience, ['all','escola','faculdade','unknown'], true) || !in_array($scope, ['all','current','history'], true)) throw new InvalidArgumentException('Filtro inválido.');
        foreach (['event','institution'] as $key) {
            if (isset($input[$key]) && (!is_string($input[$key]) || strlen($input[$key]) > 150)) throw new InvalidArgumentException('Filtro inválido.');
        }
        $lineFrom = $from ?? $today->modify('-29 days');
        $lineUntil = $until ?? $today->modify('+1 day');
        $tracking = CancelamentoEstatistica::disponivel($this->db);
        $events = $this->events($owner);
        $options = array_map(static fn ($e) => array_intersect_key($e, array_flip(['id','title','institution','institutionName'])), $events);
        $events = array_filter($events, static fn ($e) =>
            (empty($input['event']) || $e['id'] === $input['event']) &&
            (empty($input['institution']) || $e['institution'] === $input['institution']) &&
            ($scope === 'all' || ($scope === 'history' ? $e['closed'] : !$e['closed'])));
        $map = []; foreach ($events as $e) $map[$e['key']] = $e + ['active'=>0,'cancelled'=>0,'totalActive'=>0];
        // Agregação por evento, público e dia. Datas anteriores ao gráfico são consolidadas.
        // UNIX_TIMESTAMP converte TIMESTAMP sem depender do fuso configurado no MySQL.
        $base = $this->registrationSql($tracking);
        $inPeriod = $from ? 'registered >= ' . $from->getTimestamp() . ' AND registered < ' . $until->getTimestamp() : '1=1';
        // Usa as transições do PHP, sem exigir tabelas de fuso instaladas no MySQL.
        $transitions = $zone->getTransitions($lineFrom->getTimestamp(), $lineUntil->getTimestamp());
        $offset = (string) $transitions[0]['offset'];
        foreach (array_slice($transitions, 1) as $transition) {
            $offset = 'CASE WHEN registered >= ' . $transition['ts'] . ' THEN ' . $transition['offset'] . ' ELSE (' . $offset . ') END';
        }
        $day = "DATE(DATE_ADD('1970-01-01', INTERVAL (registered + ($offset)) SECOND))";
        $lineRange = 'registered >= ' . $lineFrom->getTimestamp() . ' AND registered < ' . $lineUntil->getTimestamp();
        $buckets = $this->rows("SELECT event_key, audience, cancelled,
            CASE WHEN $lineRange THEN $day ELSE '' END AS day,
            SUM(CASE WHEN $inPeriod THEN 1 ELSE 0 END) AS selected_count, COUNT(*) AS total_count
            FROM ($base) r GROUP BY event_key,audience,cancelled,day", [$owner]);
        $daily = []; for ($d = $lineFrom; $d < $lineUntil; $d = $d->modify('+1 day')) $daily[$d->format('Y-m-d')] = 0;
        $audiences = ['escola'=>0,'faculdade'=>0,'unknown'=>0];
        foreach ($buckets as $b) {
            if (!isset($map[$b['event_key']])) continue;
            $e = &$map[$b['event_key']];
            if (!(int) $b['cancelled']) $e['totalActive'] += (int) $b['total_count'];
            if ($audience !== 'all' && $audience !== $b['audience']) { unset($e); continue; }
            $count = (int) $b['selected_count'];
            $e[(int) $b['cancelled'] ? 'cancelled' : 'active'] += $count;
            if (!(int) $b['cancelled']) $audiences[$b['audience']] = ($audiences[$b['audience']] ?? 0) + $count;
            if (isset($daily[$b['day']])) $daily[$b['day']] += $count;
            unset($e);
        }
        $events = array_values(array_filter($map, static fn ($e) =>
            (!$from || $e['active'] + $e['cancelled'] > 0) &&
            ($audience === 'all' || $e['audience'] === $audience || $e['active'] + $e['cancelled'] > 0)));
        usort($events, static fn ($a,$b) => $b['createdAt'] <=> $a['createdAt'] ?: strcmp($b['id'],$a['id']));
        $institutions = []; $occupancy = []; $available = 0;
        foreach ($events as &$e) {
            $e['occupancy'] = $e['seats'] > 0 ? round($e['totalActive'] / $e['seats'] * 100, 1) : null;
            if ($e['occupancy'] !== null) $occupancy[] = $e['occupancy'];
            if ($e['published'] && empty($e['registrationClosed']) && $e['seats'] > 0) $available += max(0, $e['seats'] - $e['totalActive']);
            if ($e['active']) {
                $institutions[$e['institution']] ??= ['id'=>$e['institution'],'name'=>$e['institutionName'],'count'=>0];
                $institutions[$e['institution']]['count'] += $e['active'];
            }
        }
        unset($e);
        $metrics = [
            'events'=>count($events), 'current'=>count(array_filter($events, fn ($e)=>!$e['closed'])),
            'closed'=>count(array_filter($events, fn ($e)=>$e['closed'])),
            'published'=>count(array_filter($events, fn ($e)=>$e['published'])),
            'active'=>array_sum(array_column($events,'active')),
            'cancelled'=>$tracking ? array_sum(array_column($events,'cancelled')) : null,
            'institutions'=>count(array_filter($institutions, fn ($i)=>$i['id'] !== 'unknown')),
            'occupancy'=>$occupancy ? round(array_sum($occupancy)/count($occupancy),1) : null,
            'available'=>$available,
            'unlimited'=>count(array_filter($events, fn ($e)=>$e['seats'] === -1))
        ];
        $latest = [];
        if ($events) {
            $keys = array_column($events,'key');
            $where = 'event_key IN (' . implode(',',array_fill(0,count($keys),'?')) . ')';
            $params = [$owner];
            array_push($params, ...$keys);
            if ($audience !== 'all') { $where .= ' AND audience=?'; $params[]=$audience; }
            $latest = $this->rows("SELECT event_key,registered FROM ($base) r WHERE cancelled=0 AND ($inPeriod) AND $where ORDER BY registered DESC,event_key LIMIT 6", $params);
            foreach ($latest as &$r) { $r = ['title'=>$map[$r['event_key']]['title'], 'date'=>gmdate('Y-m-d\TH:i:s\Z',(int)$r['registered'])]; } unset($r);
        }
        return ['events'=>$events,'options'=>$options,'metrics'=>$metrics,'institutions'=>array_values($institutions),
            'audiences'=>$audiences,'daily'=>array_map(fn ($date,$count)=>['date'=>$date,'count'=>$count],array_keys($daily),array_values($daily)),
            'latest'=>$latest,'cancellationTracking'=>$tracking,'generatedAt'=>gmdate('c'),
            'period'=>['from'=>$from?->format('Y-m-d'),'to'=>$until?->modify('-1 day')->format('Y-m-d')]];
    }

    private function events(string $owner): array
    {
        $rows = $this->rows("SELECT id,modo,publicar_em,UNIX_TIMESTAMP(criado_em) AS created,
            JSON_OBJECT('title',JSON_EXTRACT(dados,'$.title'),'institution',JSON_EXTRACT(dados,'$.institution'),
            'institutionType',JSON_EXTRACT(dados,'$.institutionType'),'date',JSON_EXTRACT(dados,'$.date'),
            'seats',JSON_EXTRACT(dados,'$.seats'),'endAt',JSON_EXTRACT(dados,'$.endAt'),
            'closedAt',JSON_EXTRACT(dados,'$.closedAt'),'registrationEndAt',JSON_EXTRACT(dados,'$.registrationEndAt')) AS metadata
            FROM eventos_publicacoes WHERE organizador=?", [$owner]);
        $service = new PublicacaoService($this->db); $events = [];
        $names = ['escola-ideau-santa-clara'=>'Escola IDEAU Santa Clara','faculdade-ideau'=>'Faculdade IDEAU'];
        foreach ($rows as $r) {
            $e = $service->estado(json_decode($r['metadata'],true,512,JSON_THROW_ON_ERROR),$r['modo'],$r['publicar_em']);
            $institution = $e['institution'] ?: 'unknown';
            $events[] = ['key'=>'p:'.$r['id'],'id'=>(string)$r['id'],'title'=>$e['title'],
                'institution'=>$institution,'institutionName'=>$names[$institution] ?? ($institution === 'unknown' ? 'Não informada' : $institution),
                'audience'=>$e['institutionType'] ?: 'unknown','date'=>$e['date'],'seats'=>(int)($e['seats'] ?? -1),
                'createdAt'=>(int)$r['created'],'closed'=>$e['closed'],'published'=>$e['published'],
                'registrationClosed'=>$e['registrationClosed'],'mode'=>$e['publicationMode'],'publishAt'=>$e['publishAt']];
        }
        $columns = array_column($this->rows('SHOW COLUMNS FROM eventos'),'Field');
        $institution = in_array('id_instituicao',$columns,true);
        $audience = in_array('publico_alvo',$columns,true) ? 'e.publico_alvo' : "'unknown'";
        $legacy = $this->rows("SELECT e.id,e.titulo,e.data_inicio,e.id_status,UNIX_TIMESTAMP(e.criado_em) AS created,
            $audience AS audience," . ($institution ? 'i.nome AS institution_name,i.tipo AS institution_type,i.id AS institution_id,' : 'NULL AS institution_name,NULL AS institution_type,NULL AS institution_id,') . "
            CASE WHEN a.capacity IS NULL OR a.unlimited>0 THEN -1 ELSE a.capacity END AS seats
            FROM eventos e " . ($institution ? 'LEFT JOIN instituicoes i ON i.id=e.id_instituicao ' : '') . "
            LEFT JOIN (SELECT id_evento,SUM(vagas) AS capacity,SUM(CASE WHEN vagas IS NULL OR vagas<=0 THEN 1 ELSE 0 END) AS unlimited FROM atividades GROUP BY id_evento) a ON a.id_evento=e.id");
        foreach ($legacy as $e) {
            $type = $e['institution_type'] ?: $e['audience'];
            $key = $e['institution_id'] ? 'legacy:'.$e['institution_id'] : 'unknown';
            // As duas instituições do formulário usam slugs, o cadastro legado usa IDs.
            $slug = array_search($e['institution_name'], $names, true);
            if ($slug !== false) $key = $slug;
            $events[] = ['key'=>'l:'.$e['id'],'id'=>(string)$e['id'],'title'=>$e['titulo'],
                'institution'=>$key,'institutionName'=>$e['institution_name'] ?: 'Não informada',
                'audience'=>in_array($type,['escola','faculdade'],true) ? $type : 'unknown',
                'date'=>substr($e['data_inicio'],0,10),'seats'=>(int)$e['seats'],'createdAt'=>(int)$e['created'],
                'closed'=>(int)$e['id_status']!==1,'published'=>(int)$e['id_status']===1,
                'mode'=>'published','publishAt'=>null];
        }
        return $events;
    }

    private function registrationSql(bool $tracking): string
    {
        $columns = array_column($this->rows('SHOW COLUMNS FROM eventos'),'Field');
        $facts = "SELECT 'p' COLLATE utf8mb4_unicode_ci AS origin,CONVERT(i.id_evento USING utf8mb4) COLLATE utf8mb4_unicode_ci AS event_id,UNIX_TIMESTAMP(i.criado_em) AS registered,'unknown' COLLATE utf8mb4_unicode_ci AS audience,0 AS cancelled
            FROM eventos_publicacoes_inscricoes i
            UNION ALL SELECT 'l',a.id_evento,UNIX_TIMESTAMP(i.inscrito_em),
            CASE WHEN i.id_responsavel IS NOT NULL THEN 'escola' ELSE 'unknown' END,0
            FROM inscricoes i JOIN atividades a ON a.id=i.id_atividade";
        if ($tracking) $facts .= " UNION ALL SELECT CASE origem WHEN 'legado' THEN 'l' ELSE 'p' END,id_evento,
            TIMESTAMPDIFF(SECOND,'1970-01-01',registrado_em),publico,1 FROM dashboard_cancelamentos";
        $legacyType = in_array('publico_alvo',$columns,true) ? "WHEN l.publico_alvo IN ('escola','faculdade') THEN l.publico_alvo" : '';
        return "SELECT CONCAT(r.origin,':',r.event_id) AS event_key,r.registered,r.cancelled,
            CASE WHEN r.origin='p' THEN CASE JSON_UNQUOTE(JSON_EXTRACT(e.dados,'$.institutionType'))
                WHEN 'escola' THEN 'escola' WHEN 'faculdade' THEN 'faculdade' ELSE 'unknown' END
            $legacyType WHEN r.audience IN ('escola','faculdade') THEN r.audience ELSE 'unknown' END AS audience
            FROM ($facts) r LEFT JOIN eventos_publicacoes e ON r.origin='p' AND e.id=r.event_id
            LEFT JOIN eventos l ON r.origin='l' AND l.id=r.event_id
            WHERE (r.origin='p' AND e.organizador=?) OR (r.origin='l' AND l.id IS NOT NULL)";
    }
}
