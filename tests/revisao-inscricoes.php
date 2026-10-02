<?php
// Apenas tabelas temporárias: inscrições reais não são alteradas.
require __DIR__ . '/publicacao.php';
use App\Service\ComprovanteService;
use App\Service\ConsultaInscricaoService;

$event=$service->salvar(array_replace($fixture,[
    'institution'=>'faculdade-ideau','publicationMode'=>'published','accessMode'=>'link','listed'=>true,
    'targetCourse'=>'Direito','recipientMode'=>'manual','seats'=>1,'fields'=>['email'=>true]
]),$owner);
$reg=['eventId'=>$event['id'],'name'=>'Aluno pendente','cpf'=>'12345678901','course'=>'Direito',
    'participantType'=>'aluno','accessToken'=>$event['accessToken'],'email'=>'aluno@example.test','reviewStatus'=>'approved','reviewedAt'=>'forjado'];
$result=$service->inscrever($reg);
check($result['reviewStatus']==='pending','Solicitação manual fica pendente no servidor.');
$key=substr($result['receiptUrl'],strlen('comprovante.php?id='));
$receipt=$_SESSION['registration_receipts'][$key];
$id=$receipt['protocol'];
check(!str_contains($result['message'],'confirmada'),'Resposta não pode confirmar pendentes.');
invalid(fn()=>ComprovanteService::pdf($receipt));
$rows=$service->listarInscricoes($owner);
$stored=array_values(array_filter($rows,fn($r)=>$r['id']===$id))[0];
check(!isset($stored['reviewedAt']),'Cliente não define data da aprovação.');
$duplicate=$service->inscrever($reg);
check($duplicate['alreadyRegistered'] && $duplicate['reviewStatus']==='pending','Reenvio mantém pendência sem duplicar.');
invalid(fn()=>$service->inscrever(array_replace($reg,['cpf'=>'98765432100'])));
check($service->eventoPublico($event['id'],$event['accessToken'])[0]['registrationCount']===1,'Pendente reserva vaga.');
$lookup=new ConsultaInscricaoService($db,static fn()=>false,'');
check($lookup->inscricoes('aluno@example.test')[0]['reviewStatus']==='pending','Consulta por e-mail mostra pendente.');
invalid(fn()=>$service->revisarInscricao($event['id'],$id,'approve','outro-organizador'));
invalid(fn()=>$service->revisarInscricao('evt-inexistente',$id,'remove',$owner));
invalid(fn()=>$service->revisarInscricao($event['id'],$id,'forjado',$owner));
$service->revisarInscricao($event['id'],$id,'approve',$owner);
$service->revisarInscricao($event['id'],$id,'approve',$owner);
$approved=ComprovanteService::atualizar($db,$receipt);
check($approved['reviewStatus']==='approved','Página com sessão antiga atualiza após aprovação.');
check(str_starts_with(ComprovanteService::pdf($approved),'%PDF-1.4'),'Aprovado recebe PDF.');
check($lookup->inscricoes('aluno@example.test')[0]['reviewStatus']==='approved','Consulta reflete aprovação.');
invalid(fn()=>$service->revisarInscricao($event['id'],$id,'reject',$owner));
$before=(int)$db->query('SELECT COUNT(*) FROM dashboard_cancelamentos')->fetchColumn();
$service->revisarInscricao($event['id'],$id,'remove',$owner);
check(!ComprovanteService::ativa($db,$receipt),'Remoção invalida comprovante antigo.');
check(ComprovanteService::atualizar($db,$receipt)['reviewStatus']==='removed','Sessão detecta remoção.');
check($service->eventoPublico($event['id'],$event['accessToken'])[0]['registrationCount']===0,'Remoção libera vaga.');
check((int)$db->query('SELECT COUNT(*) FROM dashboard_cancelamentos')->fetchColumn()===$before+1,'Remoção registra cancelamento estatístico.');
invalid(fn()=>$service->revisarInscricao($event['id'],$id,'remove',$owner));
check((int)$db->query('SELECT COUNT(*) FROM dashboard_cancelamentos')->fetchColumn()===$before+1,'Repetição não duplica estatística.');
$again=$service->inscrever($reg);
$againReceipt=$_SESSION['registration_receipts'][substr($again['receiptUrl'],strlen('comprovante.php?id='))];
$service->revisarInscricao($event['id'],$againReceipt['protocol'],'reject',$owner);
check(!ComprovanteService::ativa($db,$againReceipt),'Recusa cancela pedido pendente.');
$auto=$service->salvar(array_replace($event,['recipientMode'=>'course']),$owner);
$autoResult=$service->inscrever($reg);
check($autoResult['reviewStatus']==='approved','Curso informado confirma automaticamente.');
$autoReceipt=$_SESSION['registration_receipts'][substr($autoResult['receiptUrl'],strlen('comprovante.php?id='))];
$service->revisarInscricao($event['id'],$autoReceipt['protocol'],'remove',$owner);
check(!ComprovanteService::ativa($db,$autoReceipt),'Organizador também remove no modo automático.');
$old=$service->salvar(array_replace($event,['recipientMode'=>'selected','allowedParticipants'=>[['name'=>'Antigo','cpf'=>'12345678901']]]),$owner);
check($old['recipientMode']==='manual' && !isset($old['allowedParticipants']),'Regra antiga passa a manual sem lista prévia.');
echo "OK: aprovação manual, curso automático, reenvio, autorização, vagas, consulta, PDF, remoção, recusa e estatísticas.\n";
