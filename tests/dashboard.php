<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Config\Conexao;
use App\Service\DashboardService;
use App\Service\ComprovanteService;
$db = Conexao::getConexao();
require __DIR__ . '/dashboard-temporary.php';
// Todas as tabelas usadas são temporárias. Não toca nos eventos/inscrições reais.
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100) PRIMARY KEY,organizador VARCHAR(255),modo VARCHAR(20),publicar_em DATETIME,dados JSON,criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100) PRIMARY KEY,id_evento VARCHAR(100),dados JSON,criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$db->exec('CREATE TEMPORARY TABLE eventos (id INT PRIMARY KEY,titulo VARCHAR(255),data_inicio DATETIME,id_status INT,criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$db->exec('CREATE TEMPORARY TABLE atividades (id INT PRIMARY KEY,id_evento INT,vagas INT)');
$db->exec('CREATE TEMPORARY TABLE inscricoes (id INT PRIMARY KEY,id_atividade INT,id_responsavel INT,inscrito_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
function verify($condition,string $message):void {if(!$condition)throw new RuntimeException($message);}
function bad(callable $f):void {try{$f();}catch(InvalidArgumentException){return;}throw new RuntimeException('Filtro inválido aceito.');}
$today = new DateTimeImmutable('today',new DateTimeZone('America/Sao_Paulo'));
$now=$today->getTimestamp()+3600;
$create=function($id,$mode,$seats,$type,$owner='owner',$extra=[])use($db,$now){
 $event=array_replace(['title'=>'Evento '.$id,'institution'=>$type==='escola'?'escola-ideau-santa-clara':'faculdade-ideau','institutionType'=>$type,'date'=>'2099-12-31','seats'=>$seats],$extra);
 $s=$db->prepare('INSERT INTO eventos_publicacoes VALUES (?,?,?,NULL,?,FROM_UNIXTIME(?))');
 $s->execute([$id,$owner,$mode,json_encode($event),$now]);
};
$create('new','published',10,'escola');$create('unlimited','published',-1,'faculdade');
$create('closed','published',5,'faculdade','owner',['endAt'=>'2000-01-01T00:00:00.000Z']);
$create('draft','draft',20,'escola','owner',['endAt'=>'2000-01-01T00:00:00.000Z']);
$create('private','published',2,'escola','another-owner');
$db->exec("UPDATE eventos_publicacoes SET criado_em=FROM_UNIXTIME(".($now+10).") WHERE id='new'");
$db->exec("INSERT INTO eventos VALUES (7,'Legado','2000-01-01',1,FROM_UNIXTIME(".($now-100000)."))");
$db->exec('INSERT INTO atividades VALUES (71,7,-1),(72,7,10)');
$add=function($id,$event,$time)use($db){$s=$db->prepare('INSERT INTO eventos_publicacoes_inscricoes VALUES (?,?,?,FROM_UNIXTIME(?))');$s->execute([$id,$event,json_encode(['cpf'=>'SENSITIVE','email'=>'secret@example.invalid','name'=>'PRIVATE PERSON']),$time]);};
$add('a','new',$now);$add('b','new',$now);$add('old','new',$now-40*86400);$add('c','unlimited',$now);$add('secret','private',$now);
$db->exec("INSERT INTO inscricoes VALUES (1,71,3,FROM_UNIXTIME($now)),(2,72,4,FROM_UNIXTIME($now))");
$db->exec("INSERT INTO dashboard_cancelamentos (origem,id_evento,publico,registrado_em,cancelado_em) VALUES ('publicacao','new','escola','".gmdate('Y-m-d H:i:s',$now)."',UTC_TIMESTAMP())");
$service=new DashboardService($db);
$d=$service->resumo('owner');
verify($d['metrics']['events']===5 && $d['metrics']['current']===4 && $d['metrics']['closed']===1,'Estados corretos e organizador isolado.');
verify($d['metrics']['published']===3,'Publicado, legado e ilimitado; rascunho e encerrado excluídos.');
verify($d['metrics']['active']===6 && $d['metrics']['cancelled']===1,'Inscrições por evento pai, sem duplicar atividades.');
verify($d['metrics']['institutions']===2 && $d['metrics']['unlimited']===2,'Instituições e ilimitados.');
verify($d['metrics']['occupancy']===10.0 && $d['metrics']['available']===7,'Média simples 30%,0%,0%; vagas somente publicados limitados.');
verify($d['events'][0]['id']==='new','Evento criado mais recentemente vem primeiro.');
verify(count($d['daily'])===30 && array_sum(array_column($d['daily'],'count'))===6,'Série inclui ativas recentes + canceladas conhecidas.');
verify(count($d['latest'])===6,'Últimas inscrições preservadas.');
verify(!str_contains(json_encode($d),'SENSITIVE')&&!str_contains(json_encode($d),'PRIVATE PERSON')&&!str_contains(json_encode($d),'secret@example'),'Resposta sem dados pessoais.');
$d=$service->resumo('owner',['period'=>'today']);
verify($d['metrics']['active']===5 && $d['metrics']['events']===3,'Período considera criação da inscrição e seleciona eventos com atividade.');
verify($d['events'][0]['totalActive']===3 && $d['events'][0]['occupancy']===30.0,'Ocupação atual não muda com filtro de período.');
$d=$service->resumo('owner',['period'=>'today','audience'=>'faculdade','institution'=>'faculdade-ideau']);
verify($d['metrics']['active']===1&&$d['metrics']['events']===1&&$d['metrics']['occupancy']===null,'Filtros combinados e ilimitado sem percentual.');
$d=$service->resumo('owner',['scope'=>'history']);verify($d['metrics']['events']===1&&$d['metrics']['closed']===1,'Filtro histórico.');
$d=$service->resumo('owner',['event'=>'private']);verify($d['events']===[]&&$d['metrics']['active']===0,'Não vaza outro organizador por ID.');
$d=$service->resumo('owner',['event'=>'missing']);verify($d['events']===[],'Estado vazio.');
foreach([['period'=>'bad'],['period'=>'custom','from'=>'2026-02-30','to'=>'2026-03-01'],['period'=>'custom','from'=>'2026-03-03','to'=>'2026-03-01'],['audience'=>'bad'],['event'=>['bad']]]as$f)bad(fn()=>$service->resumo('owner',$f));
// Limites do dia em Brasília: 23:59:59 anterior excluído, 00:00 incluído.
$add('boundary-before','new',$today->getTimestamp()-1);$add('boundary-at','new',$today->getTimestamp());
$d=$service->resumo('owner',['period'=>'custom','from'=>$today->format('Y-m-d'),'to'=>$today->format('Y-m-d'),'event'=>'new']);
verify($d['metrics']['active']===3 && count($d['daily'])===1,'Limites inclusivo/exclusivo e fuso de Brasília.');
// Cancelamento grava histórico na mesma transação; repetição não grava duas vezes.
$receipt=['protocol'=>'a','eventId'=>'new'];$_SESSION['registration_receipts']['test']=$receipt;
ComprovanteService::cancelar($db,'test');
$d=$service->resumo('owner',['event'=>'new']);verify($d['metrics']['cancelled']===2&&$d['metrics']['active']===4,'Cancelar decrementa ativas e incrementa histórico.');
$_SESSION['registration_receipts']['test']=$receipt;ComprovanteService::cancelar($db,'test');
verify((int)$db->query('SELECT COUNT(*) FROM dashboard_cancelamentos')->fetchColumn()===2,'Cancelamento idempotente.');
$_SESSION['registration_receipts']['legacy']=['protocol'=>'IDEAU-1','eventId'=>'71'];ComprovanteService::cancelar($db,'legacy');
$d=$service->resumo('owner',['event'=>'7']);verify($d['metrics']['active']===1&&$d['metrics']['cancelled']===1,'Cancelamento legado vinculado ao evento pai.');
// Uma falha na auditoria deve reverter também o cancelamento.
$db->exec('ALTER TABLE dashboard_cancelamentos RENAME COLUMN cancelado_em TO broken_column');
$_SESSION['registration_receipts']['rollback']=['protocol'=>'b','eventId'=>'new'];
try {ComprovanteService::cancelar($db,'rollback');throw new RuntimeException('Falha deveria impedir commit.');}catch(PDOException){}
verify((bool)$db->query("SELECT 1 FROM eventos_publicacoes_inscricoes WHERE id='b'")->fetchColumn(),'Falha de auditoria preserva inscrição.');
verify(isset($_SESSION['registration_receipts']['rollback']),'Falha preserva autorização do comprovante.');
$db->exec('ALTER TABLE dashboard_cancelamentos RENAME COLUMN broken_column TO cancelado_em');
// Instalações com cadastro de instituições também são suportadas.
$db->exec('CREATE TEMPORARY TABLE instituicoes (id INT PRIMARY KEY,nome VARCHAR(255),tipo VARCHAR(20))');
$db->exec("INSERT INTO instituicoes VALUES (1,'Escola IDEAU Santa Clara','escola')");
$db->exec("ALTER TABLE eventos ADD id_instituicao INT DEFAULT 1, ADD publico_alvo VARCHAR(20) DEFAULT 'escola'");
$d=$service->resumo('owner',['institution'=>'escola-ideau-santa-clara']);
verify(in_array('7',array_column($d['events'],'id'),true),'Instituição legada e moderna agrupadas pelo cadastro.');
echo "OK: dashboard agregado, privacidade, isolamento, estados, vagas, filtros, datas, cancelamentos e dois esquemas legados.\n";
