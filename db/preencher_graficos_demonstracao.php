<?php
// Somente CLI. --check valida e desfaz; --apply persiste. Sem argumentos: apenas resumo.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\DashboardService;
use App\Service\OrganizerAccess;
use App\Service\PublicacaoService;

$db = Conexao::getConexao();
$owner = OrganizerAccess::config()['email'];
$dashboard = new DashboardService($db);
$mode = $argv[1] ?? '';
if (!in_array($mode, ['--check', '--apply'], true)) {
    echo json_encode(['atual'=>$dashboard->resumo($owner)['metrics'],
        'planejado'=>['eventos'=>7,'inscricoesAtivas'=>249,'cancelamentos'=>21],
        'uso'=>'--check valida sem persistir; --apply adiciona somente os exemplos ausentes.'], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
    exit;
}

// O histórico usa a estrutura já fornecida pelo dashboard; não cria um esquema paralelo.
if (!App\Service\CancelamentoEstatistica::disponivel($db)) {
    throw new RuntimeException('Instale db/dashboard_cancelamentos.sql antes de preencher os exemplos.');
}
$zone = new DateTimeZone('America/Sao_Paulo');
$today = new DateTimeImmutable('today', $zone);
$now = time();
$encode = fn(array $data) => json_encode($data, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
$iso = fn(int $time) => gmdate('Y-m-d\TH:i:s\Z', $time);
// slug, título, instituição escolar, vagas, ativas, canceladas, estado.
$fixtures = [
    ['carreiras','Carreiras e inovação',false,80,58,6,'published'],
    ['oficina-escolar','Oficina de ciências na escola',true,40,32,3,'published'],
    ['familias','Encontro de famílias',true,60,39,4,'published'],
    ['webinar','Webinar de educação e tecnologia',false,-1,85,5,'published'],
    ['pesquisa','Jornada de pesquisa concluída',false,45,35,3,'closed'],
    ['seminario','Seminário de sustentabilidade',false,100,0,0,'automatic'],
    ['feira','Feira de projetos escolares',true,30,0,0,'draft'],
];
$service = new PublicacaoService($db);
$base = ['category'=>'academico','audience'=>'graduacao','publicationMode'=>'published',
    'accessMode'=>'public','listed'=>true,'eventType'=>'simple','eventKind'=>'palestra',
    'modality'=>'presencial','time'=>'19:00','location'=>'Auditório de demonstração',
    'cover'=>'data:image/png;base64,'.base64_encode(file_get_contents(__DIR__.'/../uploads/foto_generica_1.png')),
    'fields'=>['email'=>true], 'demoDataset'=>'dashboard-v1',
    'summary'=>'Exemplo fictício para visualizar os indicadores do painel.',
    'description'=>'Evento de demonstração. Inscrições, participantes e cancelamentos são fictícios; não representam uma programação institucional real.',
    'specific'=>['speaker'=>'Equipe de demonstração','topic'=>'Educação e comunidade','hours'=>2]];
$exists = $db->prepare('SELECT organizador FROM eventos_publicacoes WHERE id=? FOR UPDATE');
$update = $db->prepare('UPDATE eventos_publicacoes SET dados=?, criado_em=FROM_UNIXTIME(?) WHERE id=?');
$insert = $db->prepare('INSERT INTO eventos_publicacoes_inscricoes (id,id_evento,dados,criado_em) VALUES (?,?,?,FROM_UNIXTIME(?))');
$cancel = $db->prepare("INSERT INTO dashboard_cancelamentos (origem,id_evento,publico,registrado_em,cancelado_em) VALUES ('publicacao',?,?,?,?)");
$created=[]; $preserved=[];
$db->beginTransaction();
try {
    foreach ($fixtures as $index => [$slug,$title,$school,$seats,$active,$cancelled,$state]) {
        $id = 'evt-demo-graficos-'.$slug;
        $exists->execute([$id]);
        $existingOwner = $exists->fetchColumn();
        if ($existingOwner !== false) {
            if ($existingOwner !== $owner) throw new RuntimeException('ID de demonstração pertence a outra conta: '.$id);
            $preserved[]=$id;
            continue; // Nunca repõe inscrições excluídas nem modifica eventos editados pelo usuário.
        }
        $event = array_replace($base, ['id'=>$id,'title'=>$title.' — Demonstração',
            'institution'=>$school?'escola-ideau-santa-clara':'faculdade-ideau',
            'date'=>$today->modify('+'.(14+$index*3).' days')->format('Y-m-d'),
            'publicationMode'=>$state==='closed'?'published':$state,'seats'=>$seats]);
        if ($state==='automatic') $event['publishAt']=gmdate('Y-m-d\TH:i:s.000\Z',$today->modify('+7 days')->getTimestamp());
        if ($slug==='webinar') {
            $event['modality']='online'; $event['eventKind']='webinar';
            $event['delivery']=['platform'=>'Sala virtual de demonstração','instructions'=>'Não há transmissão real.'];
        }
        $event=$service->salvar($event,$owner);
        if ($state==='closed') {
            // Histórico fictício: somente este evento recém-criado recebe datas passadas.
            $event['date']=$today->modify('-5 days')->format('Y-m-d');
            $event['closedAt']=$iso($today->modify('-4 days')->getTimestamp());
            $event['closeReason']='manual'; $event['closed']=true; $event['published']=false;
        }
        $createdAt=$today->modify('-45 days')->getTimestamp();
        $event['createdAt']=$iso($createdAt);
        $update->execute([$encode($event),$createdAt,$id]);
        for ($n=1; $n<=$active+$cancelled; $n++) {
            // Mais procura nos dias recentes, com variação por evento; nunca cria datas futuras.
            $age=(int) floor(pow((($n*17+$index*11)%100)/100,1.6)*30);
            if ($state==='closed') $age=8+($age%22);
            $registered=min($now,$today->modify('-'.$age.' days')->getTimestamp()+9*3600+($n%9)*3600+($n%60)*60);
            if ($n>$active) {
                $cancelledAt=min($now,$registered+2*86400);
                $cancel->execute([$id,$school?'escola':'faculdade',gmdate('Y-m-d H:i:s',$registered),gmdate('Y-m-d H:i:s',$cancelledAt)]);
                continue;
            }
            $regId='reg-demo-graficos-'.$slug.'-'.str_pad((string)$n,3,'0',STR_PAD_LEFT);
            $name=($school?'Educando':'Participante').' Demonstração '.str_pad((string)$n,3,'0',STR_PAD_LEFT);
            $registration=['id'=>$regId,'eventId'=>$id,'name'=>$name,
                'email'=>$slug.'.'.$n.'@example.invalid','createdAt'=>$iso($registered),
                'audience'=>$school?'escola':'graduacao','reviewStatus'=>'approved',
                'participantType'=>$school?'responsavel':'comunidade','eventRole'=>'participant',
                'participationMode'=>$slug==='webinar'?'online':'presencial','activityIds'=>[],
                'notes'=>'Cadastro fictício para demonstração dos gráficos.','demoDataset'=>'dashboard-v1'];
            if ($school) $registration+=['studentName'=>$name,'responsibleName'=>'Responsável Demonstração '.$n,
                'relationship'=>'Responsável','studentClass'=>(1+$n%5).'º ano'];
            $insert->execute([$regId,$id,$encode($registration),$registered]);
        }
        // Verifica os números usando o mesmo serviço que alimenta a tela.
        $result=$dashboard->resumo($owner,['event'=>$id]);
        if ($result['metrics']['active']!==$active || $result['metrics']['cancelled']!==$cancelled
            || array_sum(array_column($result['daily'],'count'))!==$active+$cancelled
            || $result['metrics']['closed']!==($state==='closed'?1:0)
            || $result['metrics']['published']!==($state==='published'?1:0)) {
            throw new RuntimeException('Indicadores inconsistentes no exemplo: '.$id);
        }
        $created[]=['id'=>$id,'ativas'=>$active,'canceladas'=>$cancelled,'estado'=>$state];
    }
    $summary=$dashboard->resumo($owner)['metrics'];
    if ($mode==='--apply') $db->commit(); else $db->rollBack();
    echo $encode(['persistido'=>$mode==='--apply','criados'=>$created,'existentesPreservados'=>$preserved,'indicadores'=>$summary]).PHP_EOL;
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
