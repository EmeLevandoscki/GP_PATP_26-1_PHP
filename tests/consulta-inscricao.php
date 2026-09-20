<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Config\Conexao;
use App\Service\ConsultaInscricaoService;
use App\Service\ComprovanteService;
function verifyLookup(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
function rejectsLookup(callable $fn): void { try { $fn(); } catch (InvalidArgumentException) { return; } throw new RuntimeException('Acesso inválido foi aceito.'); }
$db = Conexao::getConexao();
$sql = str_replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE', file_get_contents(__DIR__ . '/../db/consulta_inscricao.sql'));
$db->exec($sql);
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100), dados JSON)');
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100), id_evento VARCHAR(100), dados JSON)');
$db->exec('CREATE TEMPORARY TABLE usuarios (id INT, nome VARCHAR(255), email VARCHAR(255))');
$db->exec('CREATE TEMPORARY TABLE atividades (id INT, nome VARCHAR(255), data_ini DATETIME, local_atv VARCHAR(255))');
$db->exec('CREATE TEMPORARY TABLE inscricoes (id INT, id_usuario INT, id_responsavel INT, id_atividade INT, inscrito_em DATETIME)');
$event = ['id'=>'evt-test', 'title'=>'Evento encerrado', 'date'=>'2000-01-01','time'=>'12:00','location'=>'Auditório','closed'=>true];
$db->prepare('INSERT INTO eventos_publicacoes VALUES (?,?)')->execute([$event['id'],json_encode($event)]);
$insert=$db->prepare('INSERT INTO eventos_publicacoes_inscricoes VALUES (?,?,?)');
foreach (['reg-one'=>'lookup@example.invalid','reg-two'=>'other@example.invalid'] as $id=>$email) {
    $insert->execute([$id,'evt-test',json_encode(['name'=>'Pessoa '.$id,'email'=>$email,'createdAt'=>'2026-09-20T12:00:00Z'])]);
}
$db->exec("INSERT INTO usuarios VALUES (1,'Responsável','lookup@example.invalid'),(2,'Primeiro filho',''),(3,'Segundo filho',''),(4,'Outra pessoa','other@example.invalid')");
$db->exec("INSERT INTO atividades VALUES (5,'Evento antigo','2000-01-01 12:00:00','Escola')");
$db->exec("INSERT INTO inscricoes VALUES (10,2,1,5,NOW()),(11,3,1,5,NOW()),(12,4,NULL,5,NOW())");
$mails=[];
$send = static function($email,$url) use (&$mails) { $mails[]=[$email,$url]; return true; };
$service=new ConsultaInscricaoService($db,$send,'https://events.example.invalid');
$result=$service->solicitar(' LOOKUP@example.invalid ','127.0.0.1');
verifyLookup($result===ConsultaInscricaoService::MESSAGE && count($mails)===1,'Solicitação deve enviar link com resposta genérica.');
parse_str(parse_url($mails[0][1],PHP_URL_QUERY),$params);$token=$params['token'];
verifyLookup(strlen($token)===64,'Token deve ser aleatório e longo.');
verifyLookup($db->query('SELECT token_hash FROM inscricao_acessos')->fetchColumn()===hash('sha256',$token),'Guardar somente hash do token.');
rejectsLookup(fn()=>$service->confirmar(str_repeat('a',64)));
// Outra sessão/navegador confirma o link, sem depender do cookie original.
$_SESSION=[];
$email=$service->confirmar($token);
verifyLookup($email==='lookup@example.invalid','Confirmação deve identificar o e-mail.');
rejectsLookup(fn()=>$service->confirmar($token));
$receipts=$service->inscricoes($email);
verifyLookup(count($receipts)===3,'Recuperar evento moderno encerrado e dois irmãos do legado.');
verifyLookup(!in_array('reg-two',array_column($receipts,'protocol')),'Não expor inscrições de outro e-mail.');
foreach ($receipts as $receipt) ComprovanteService::resposta($receipt,true);
verifyLookup(count($_SESSION['registration_receipts'])===3,'Restaurar acesso aos comprovantes na nova sessão.');
$db->exec("DELETE FROM eventos_publicacoes_inscricoes WHERE id='reg-one'");
verifyLookup(count($service->inscricoes($email))===2,'Inscrição cancelada não deve ser apresentada como ativa.');
$service->solicitar('lookup@example.invalid','127.0.0.1');
parse_str(parse_url($mails[1][1],PHP_URL_QUERY),$expired);
$db->exec('UPDATE inscricao_acessos SET expira_em=0');
rejectsLookup(fn()=>$service->confirmar($expired['token']));
$service->solicitar('lookup@example.invalid','127.0.0.1');
verifyLookup($service->solicitar('lookup@example.invalid','127.0.0.1')===ConsultaInscricaoService::MESSAGE && count($mails)===3,'Limitar reenvio por e-mail.');
verifyLookup($service->solicitar('unknown@example.invalid','127.0.0.1')===ConsultaInscricaoService::MESSAGE,'Endereço sem inscrição deve receber a mesma resposta.');
verifyLookup($service->inscricoes('unknown@example.invalid')===[],'E-mail desconhecido não pode revelar registros.');
for($i=0;$i<12;$i++) $service->solicitar("spam$i@example.invalid",'10.0.0.1');
verifyLookup(count($mails)===14,'Limitar dez envios por IP mesmo trocando de endereço.');
$broken=new ConsultaInscricaoService($db,static fn()=>false,'https://events.example.invalid');
try { $broken->solicitar('broken@example.invalid','10.0.0.2'); throw new LogicException('Falha de envio ignorada.'); } catch(RuntimeException $e) { verifyLookup(str_contains($e->getMessage(),'enviar'),'Falha de envio deve ser visível.'); }
verifyLookup((int)$db->query("SELECT COUNT(*) FROM inscricao_acessos WHERE email='broken@example.invalid'")->fetchColumn()===0,'Falha de envio deve invalidar o token.');
echo "OK: link por e-mail, hash, outra sessão, uso único, expiração, limites, isolamento, irmãos, encerrados, cancelados e falha de envio.\n";
