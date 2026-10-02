<?php
// Reutiliza conexão e tabelas temporárias dos testes de publicação; não altera eventos reais.
require __DIR__ . '/publicacao.php';
$private = $service->salvar(array_replace($fixture, [
    'institution'=>'faculdade-ideau', 'publicationMode'=>'published', 'accessMode'=>'link', 'listed'=>false,
    'targetCourse'=>'Direito', 'fields'=>[], 'accessToken'=>'token-escolhido-pelo-cliente'
]), $owner);
$token = $private['accessToken'];
check((bool)preg_match('/^[a-f0-9]{64}$/D', $token), 'Servidor deve gerar segredo aleatório.');
check(!in_array($private['id'], array_column($service->listar(),'id')), 'Evento oculto não pode constar na API pública.');
check(in_array($private['id'], array_column($service->listar($owner),'id')), 'Organizador deve gerenciar evento oculto.');
check($service->eventoPublico($private['id']) === [], 'Saber apenas o ID não abre evento oculto.');
check($service->eventoPublico($private['id'], str_repeat('0',64)) === [], 'Token incorreto não abre evento.');
$opened = $service->eventoPublico($private['id'], $token)[0];
check($opened['accessGranted'] && !isset($opened['accessToken'], $opened['allowedParticipants']), 'Acesso válido não deve expor segredos nem lista de alunos.');
$reg = ['eventId'=>$private['id'], 'name'=>'Aluno de Direito', 'cpf'=>'12345678901', 'course'=>'Direito', 'participantType'=>'aluno'];
invalid(fn()=>$service->inscrever($reg));
invalid(fn()=>$service->inscrever($reg + ['accessToken'=>[]]));
invalid(fn()=>$service->inscrever($reg + ['accessToken'=>str_repeat('f',64)]));
invalid(fn()=>$service->inscrever(array_replace($reg,['accessToken'=>$token,'course'=>'Medicina'])));
invalid(fn()=>$service->inscrever(array_replace($reg,['accessToken'=>$token,'participantType'=>'comunidade'])));
check($service->inscrever($reg + ['accessToken'=>$token])['success'], 'Link e curso correto permitem inscrição.');
$storedReg = array_values(array_filter($service->listarInscricoes($owner),fn($row)=>$row['eventId']===$private['id']))[0];
check(!isset($storedReg['accessToken']), 'Segredo do link nunca é persistido na inscrição.');
$listed = $service->salvar(array_replace($private,['listed'=>true,'accessToken'=>'ignorado']),$owner);
check($listed['accessToken']===$token, 'Editar preserva link e ignora token enviado pelo cliente.');
$publicListed = array_column($service->listar(),null,'id')[$private['id']];
check(!$publicListed['accessGranted'] && !isset($publicListed['accessToken']) && !isset($publicListed['fields']) && !isset($publicListed['allowedParticipants']), 'Divulgação pública não libera inscrição nem expõe lista ou segredo.');
check(!$service->eventoPublico($private['id'])[0]['accessGranted'], 'Divulgação direta também exige link para inscrição.');
$selected=$service->salvar(array_replace($listed,['recipientMode'=>'manual']),$owner);
check(!isset($selected['allowedParticipants']), 'Aprovação manual dispensa lista prévia.');
$pending=$service->inscrever(array_replace($reg,['name'=>'Aluna pendente','cpf'=>'98765432100','accessToken'=>$token,'reviewStatus'=>'approved']));
check($pending['reviewStatus']==='pending','Cliente não pode confirmar a própria inscrição.');
check($service->inscrever($reg+['accessToken'=>$token])['reviewStatus']==='approved','Trocar a regra não torna inscrições existentes pendentes.');
check(!isset($service->eventoPublico($private['id'],$token)[0]['allowedParticipants']),'Lista antiga não deve ser exposta.');
invalid(fn()=>$service->salvar(array_replace($selected,['targetCourse'=>' ']),$owner));
invalid(fn()=>$service->salvar(array_replace($selected,['accessMode'=>'inventado']),$owner));
invalid(fn()=>$service->salvar(array_replace($selected,['listed'=>'false']),$owner));
invalid(fn()=>$service->salvar($selected,'outro-organizador'));
$oldClient=$selected;unset($oldClient['accessMode'],$oldClient['listed'],$oldClient['allowedParticipants'],$oldClient['recipientMode'],$oldClient['targetCourse']);
$kept=$service->salvar($oldClient,$owner);
check($kept['accessMode']==='link' && $kept['recipientMode']==='manual' && $kept['accessToken']===$token,'Edição de cliente antigo não pode remover restrições.');
$scheduled=$service->salvar(array_replace($selected,['id'=>'','publicationMode'=>'automatic','publishAt'=>'2099-12-30T12:00:00.000Z']),$owner);
check($service->eventoPublico($scheduled['id'],$scheduled['accessToken'])===[],'Link não antecipa agendamento.');
$draft=$service->salvar(array_replace($selected,['id'=>'','publicationMode'=>'draft']),$owner);
check($service->eventoPublico($draft['id'],$draft['accessToken'])===[],'Link não abre rascunhos.');
$other=$service->salvar(array_replace($selected,['id'=>'','listed'=>false]),$owner);
check($other['accessToken']!==$token && $service->eventoPublico($other['id'],$token)===[],'Link de um evento não autoriza outro.');
$public=$service->salvar(array_replace($selected,['accessMode'=>'public']),$owner);
check(!isset($public['accessToken']) && $public['listed'] && !isset($public['allowedParticipants']),'Tornar público remove a restrição e a lista desse evento.');
$again=$service->salvar(array_replace($selected,['accessMode'=>'link']),$owner);
check($again['accessToken']!==$token,'Voltar ao privado gera outro segredo.');
$closed=$service->encerrar($again['id'],$owner);
check($service->eventoPublico($closed['id'],$again['accessToken'])===[],'Link não reabre evento encerrado.');
invalid(fn()=>$service->inscrever(array_replace($reg,['accessToken'=>$again['accessToken']])));
echo "OK: eventos privados, listagem, tokens, curso declarado, aprovação manual, sigilo, edição, agendamento e encerramento.\n";
