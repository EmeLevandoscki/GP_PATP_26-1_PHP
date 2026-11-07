<?php
// Executar apenas no terminal: php db/cadastrar_eventos_demonstracao.php --apply
// IDs fixos evitam duplicação; eventos existentes nunca são sobrescritos.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\OrganizerAccess;
use App\Service\PublicacaoService;

if (!in_array('--apply', $argv, true)) {
    echo "Use --apply para cadastrar os oito eventos de demonstração no banco configurado.\n";
    exit;
}
$db = Conexao::getConexao();
$owner = OrganizerAccess::config()['email'];
$service = new PublicacaoService($db);
$zone = new DateTimeZone('America/Sao_Paulo');
$start = new DateTimeImmutable('2026-11-09', $zone);
if ($start <= new DateTimeImmutable('now', $zone)) $start = new DateTimeImmutable('today +14 days', $zone);
$day = fn(int $offset) => $start->modify("+$offset days")->format('Y-m-d');
$cover = 'data:image/png;base64,' . base64_encode(file_get_contents(__DIR__.'/../uploads/foto_generica_1.png'));
$base = [
    'institution'=>'faculdade-ideau', 'category'=>'academico', 'audience'=>'graduacao',
    'audienceLabel'=>'Estudantes, professores e comunidade', 'publicationMode'=>'published',
    'accessMode'=>'public', 'listed'=>true, 'eventType'=>'simple', 'modality'=>'presencial',
    'time'=>'19:00', 'seats'=>80, 'location'=>'Auditório de demonstração', 'city'=>'',
    'cover'=>$cover, 'fields'=>['email'=>true,'cpf'=>false,'phone'=>false,'notes'=>true],
];
$activity = fn(string $name,string $type,int $offset,string $from,string $to,int $seats,string $location) => [
    'name'=>$name,'type'=>$type,'startAt'=>$day($offset).'T'.$from,'endAt'=>$day($offset).'T'.$to,
    'seats'=>$seats,'location'=>$location,'speaker'=>'Equipe de demonstração','hours'=>1,
    'description'=>'Atividade ilustrativa para apresentar seleção de horários e controle individual de vagas.',
];
$events = [
    ['id'=>'evt-demo-palestra-inovacao','title'=>'Palestra: Inovação e Carreira — Demonstração',
     'eventKind'=>'palestra','date'=>$day(0),'seats'=>80,
     'summary'=>'Uma palestra simples para apresentar inscrição, vagas e comprovante.',
     'specific'=>['speaker'=>'Equipe de demonstração','topic'=>'Tecnologia e oportunidades profissionais','hours'=>2],
     'delivery'=>['room'=>'Auditório A','address'=>'Local ilustrativo para apresentação']],
    ['id'=>'evt-demo-semana-academica','title'=>'Semana Acadêmica de Tecnologia — Demonstração',
     'eventKind'=>'semana-academica','eventType'=>'multiple','date'=>$day(1),'time'=>'18:00','seats'=>120,
     'summary'=>'Escolha palestras e oficinas com horários e vagas independentes.',
     'specific'=>['responsible'=>'Equipe de demonstração','program'=>'Abertura, oficina prática e minicurso em dois dias.'],
     'activities'=>[
         $activity('Palestra: Tecnologia e sociedade','palestra',1,'18:00','19:00',60,'Auditório A'),
         $activity('Oficina: Primeiro projeto web','oficina',1,'19:15','20:15',25,'Laboratório 1'),
         $activity('Minicurso: Dados na prática','minicurso',2,'19:00','20:00',30,'Laboratório 2'),
     ]],
    ['id'=>'evt-demo-minicurso-encontros','title'=>'Minicurso de Desenvolvimento Web — Demonstração',
     'eventKind'=>'minicurso','date'=>$day(2),'seats'=>25,'location'=>'Laboratório de demonstração',
     'summary'=>'Uma única inscrição para três encontros de desenvolvimento web.',
     'specific'=>['instructor'=>'Equipe de demonstração','prerequisites'=>'Conhecimentos básicos de informática','materials'=>'Notebook ou computador do laboratório','hours'=>6,'schedule'=>'Três encontros semanais de duas horas.'],
     'meetings'=>array_map(fn($i)=>['title'=>['Fundamentos de HTML e CSS','Formulários e PHP','Publicação do projeto'][$i],
         'startAt'=>$day(2+7*$i).'T19:00','endAt'=>$day(2+7*$i).'T21:00','location'=>'Laboratório de demonstração'],[0,1,2])],
    ['id'=>'evt-demo-visita-tecnica','title'=>'Visita Técnica: Processos e Inovação — Demonstração',
     'eventKind'=>'visita-tecnica','date'=>$day(3),'time'=>'08:00','seats'=>30,'category'=>'profissional',
     'location'=>'Ponto de encontro de demonstração',
     'summary'=>'Exemplo de visita com saída, retorno, transporte e orientações.',
     'specific'=>['organization'=>'Organização fictícia para demonstração','departureLocation'=>'Ponto de encontro ilustrativo','destination'=>'Centro de inovação fictício',
         'departureAt'=>$day(3).'T08:00','returnAt'=>$day(3).'T12:00','responsible'=>'Equipe de demonstração',
         'guidance'=>'Programação fictícia. Não há visita ou deslocamento real agendado.','documents'=>'Não enviar documentos neste exemplo.','transport'=>'Ônibus ilustrativo, sem reserva real.']],
    ['id'=>'evt-demo-webinar-online','title'=>'Webinar: Inteligência Artificial nos Estudos — Demonstração',
     'eventKind'=>'webinar','date'=>$day(4),'seats'=>200,'modality'=>'online','location'=>'',
     'summary'=>'Evento online com acesso reservado ao comprovante do inscrito.',
     'specific'=>['speaker'=>'Equipe de demonstração','topic'=>'Uso responsável de inteligência artificial','hours'=>1],
     'delivery'=>['platform'=>'Google Meet (demonstração)','accessUrl'=>'','instructions'=>'Este evento é demonstrativo. Não há transmissão real nem sala online agendada.']],
    ['id'=>'evt-demo-mostra-hibrida','title'=>'Mostra Científica: Pesquisa em Ação — Demonstração',
     'eventKind'=>'mostra-cientifica','date'=>$day(7),'seats'=>100,'category'=>'cientifico','modality'=>'hibrido',
     'summary'=>'Escolha participação presencial ou online, como participante ou apresentador.',
     'specific'=>['program'=>'Abertura e apresentação de projetos ilustrativos.','areas'=>'Educação, tecnologia e sustentabilidade','guidance'=>'A inscrição como apresentador não envolve submissão ou avaliação de trabalhos.'],
     'registrationOptions'=>['allowPresenter'=>true],
     'delivery'=>['room'=>'Auditório B','address'=>'Local ilustrativo','platform'=>'Google Meet (demonstração)','allowChoice'=>true,
         'accessUrl'=>'','instructions'=>'Acesso demonstrativo. Nenhuma transmissão real foi agendada.']],
    ['id'=>'evt-demo-desafio-inovacao','title'=>'Desafio de Inovação Acadêmica — Demonstração',
     'eventKind'=>'competicao','eventType'=>'multiple','date'=>$day(11),'time'=>'09:00','seats'=>40,
     'summary'=>'Competição individual com duas etapas selecionáveis e regras de exemplo.',
     'specific'=>['rules'=>'Participação individual. Exemplo sem premiação ou classificação automática.','categories'=>'Ideias para a comunidade','stages'=>'Apresentação da ideia e oficina de prototipagem.','responsible'=>'Equipe de demonstração'],
     'activities'=>[
         $activity('Etapa 1: Apresentação de ideias','apresentacao-trabalhos',11,'09:00','10:00',40,'Sala de projetos'),
         $activity('Etapa 2: Oficina de protótipos','oficina',11,'10:15','11:15',20,'Laboratório de criação'),
     ]],
    ['id'=>'evt-demo-encontro-personalizado','title'=>'Encontro de Famílias e Comunidade — Demonstração',
     'eventKind'=>'outro','customEventKind'=>'Encontro de integração','date'=>$day(12),'time'=>'14:00','seats'=>60,
     'institution'=>'escola-ideau-santa-clara','audience'=>'escola','audienceLabel'=>'Famílias e educandos','category'=>'comunidade',
     'summary'=>'Tipo personalizado com inscrição escolar pelo responsável e educando.',
     'specific'=>['responsible'=>'Equipe de demonstração','guidance'=>'Exemplo de integração entre escola e famílias, sem encontro real agendado.'],
     'fields'=>['email'=>true,'responsibleName'=>true,'studentName'=>true,'responsibleCPF'=>false,'studentClass'=>false,'relationship'=>true,'notes'=>true]],
];

// Dependência aditiva: CREATE TABLE IF NOT EXISTS, sem excluir dados.
$db->exec(file_get_contents(__DIR__.'/multiplas_atividades.sql'));
$db->beginTransaction();
try {
    $exists=$db->prepare('SELECT id FROM eventos_publicacoes WHERE id=?');
    $created=[];$skipped=[];
    foreach($events as $data) {
        $exists->execute([$data['id']]);
        if($exists->fetchColumn()) { $skipped[]=$data['id'];continue; }
        $event=array_replace($base,$data);
        $event['description']="Evento fictício cadastrado para apresentação do IDEAU Eventos. Datas, locais, responsáveis e programação são ilustrativos.\n\n".$event['summary']."\n\nUse dados fictícios ao demonstrar o formulário de inscrição. Não há programação institucional real confirmada.";
        $saved=$service->salvar($event,$owner);
        $created[]=['id'=>$saved['id'],'title'=>$saved['title'],'date'=>$saved['date'],'activities'=>count($saved['activities']??[])];
    }
    $publicIds=array_column($service->listar(),'id');
    foreach($created as $event) if(!in_array($event['id'],$publicIds,true)) throw new RuntimeException('Evento criado não apareceu na listagem pública.');
    $db->commit();
    echo json_encode(['created'=>$created,'existingPreserved'=>$skipped],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
} catch(Throwable $error) {
    if($db->inTransaction())$db->rollBack();
    throw $error;
}
