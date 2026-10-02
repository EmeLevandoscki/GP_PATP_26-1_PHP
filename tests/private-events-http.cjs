
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process');
const passwordHash=execFileSync('php',['-r', "echo password_hash('test-only-password', PASSWORD_DEFAULT);"],{encoding:'utf8'});
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ideau-private-'));
const router=path.join(temp,'router.php');
fs.writeFileSync(router,"<?php\nrequire getenv('PRIVATE_TEST_ROOT').'/vendor/autoload.php';\n$db=App\\Config\\Conexao::getConexao();\n$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100) PRIMARY KEY, organizador VARCHAR(255), modo VARCHAR(20), publicar_em DATETIME, dados JSON, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');\n$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100) PRIMARY KEY,id_evento VARCHAR(100),dados JSON,criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');\nforeach(['hidden','listed','open'] as $kind){\n $event=['id'=>'evt-'.$kind,'title'=>'Evento '.$kind,'date'=>'2099-12-31','time'=>'18:00','location'=>'Auditório','institution'=>'faculdade-ideau','audience'=>'graduacao','seats'=>-1,\n 'accessMode'=>$kind==='open'?'public':'link','listed'=>$kind!=='hidden','accessToken'=>str_repeat('a',64),'targetCourse'=>'Direito','recipientMode'=>'manual','allowedParticipants'=>[['name'=>'Aluno confidencial','cpf'=>'12345678901']],\n 'fields'=>['cpf'=>true,'course'=>true]];\n $db->prepare(\"INSERT INTO eventos_publicacoes(id,organizador,modo,dados) VALUES (?,'test','published',?)\")->execute([$event['id'],json_encode($event)]);\n}\n$db->prepare(\"INSERT INTO eventos_publicacoes_inscricoes(id,id_evento,dados) VALUES ('reg-review','evt-listed',?)\")->execute([json_encode(['id'=>'reg-review','eventId'=>'evt-listed','name'=>'Aluno pendente','reviewStatus'=>'pending'])]);\nrequire getenv('PRIVATE_TEST_ROOT').'/src/Controller/PublicacaoController.php';\n");
(async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin='http://127.0.0.1:'+port;
 const child=spawn('php',['-d','sys_temp_dir='+temp,'-S','127.0.0.1:'+port,router],{cwd:root,env:{...process.env,PRIVATE_TEST_ROOT:root,IDEAU_ORGANIZER_EMAIL:'test',IDEAU_ORGANIZER_PASSWORD_HASH:passwordHash},stdio:'ignore',windowsHide:true});
 try{
  let response;
  for(let i=0;i<50;i++){try{response=await fetch(origin+'/?action=session');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.ok(response);const cookie=response.headers.get('set-cookie').split(';')[0],session=await response.json();
  const get=query=>fetch(origin+'/?'+query,{headers:{Cookie:cookie}});
  const publicResponse=await get('action=events');assert.equal(publicResponse.headers.get('cache-control'),'no-store');
  const publicEvents=await publicResponse.json();
  assert.deepEqual(publicEvents.map(e=>e.id).sort(),['evt-listed','evt-open']);
  assert.doesNotMatch(JSON.stringify(publicEvents),/accessToken|allowedParticipants|Aluno confidencial|12345678901/);
  assert.equal((await get('action=events&scope=admin')).status,401);
  assert.equal((await get('action=registrations')).status,401);
  assert.deepEqual(await (await get('action=event&id=evt-hidden')).json(),[]);
  assert.deepEqual(await (await get('action=event&id=evt-hidden&accessToken=bad')).json(),[]);
  const allowed=await (await get('action=event&id=evt-hidden&accessToken='+'a'.repeat(64))).json();
  assert.equal(allowed[0].accessGranted,true);
  assert.doesNotMatch(JSON.stringify(allowed),/accessToken|allowedParticipants|Aluno confidencial|12345678901/);
  assert.equal((await get('action=event&id[]=invalid')).status,422);
  assert.equal((await get('action=event&id=evt-hidden&accessToken[]=invalid')).status,422);
  const post=(data,csrf=session.csrf)=>fetch(origin+'/?action=register',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});
  const registration={eventId:'evt-hidden',name:'Aluno autorizado',cpf:'12345678901',course:'Direito',participantType:'aluno'};
  assert.equal((await post(registration)).status,422);
  assert.equal((await post({...registration,accessToken:'a'.repeat(64)},'')).status,403);
  assert.equal((await post({...registration,accessToken:'a'.repeat(64),cpf:'123'})).status,422);
  assert.equal((await post({...registration,accessToken:'a'.repeat(64),course:'Enfermagem'})).status,422);
  const saved=await post({...registration,accessToken:'a'.repeat(64)});assert.equal(saved.status,200);const savedBody=await saved.json();assert.equal(savedBody.success,true);assert.equal(savedBody.reviewStatus,'pending');
  const decision={eventId:'evt-listed',id:'reg-review',decision:'approve'};
  let adminCookie=cookie;
  const actionPost=(action,data,csrf=session.csrf)=>fetch(origin+'/?action='+action,{method:'POST',headers:{Cookie:adminCookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});
  assert.equal((await actionPost('review-registration',decision)).status,401);
  const login=await actionPost('login',{email:'test',password:'test-only-password'});assert.equal(login.status,200);
  adminCookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await actionPost('review-registration',decision,'invalid')).status,403);
  assert.equal((await actionPost('review-registration',{...decision,eventId:'evt-other'})).status,422);
  assert.equal((await actionPost('review-registration',{...decision,eventId:[]})).status,422);
  assert.equal((await actionPost('review-registration',{...decision,decision:'inventada'})).status,422);
  for(const name of ['approve','reject','remove'])assert.equal((await actionPost('review-registration',{...decision,decision:name})).status,200);
  console.log('OK HTTP: listagem privada, divulgação, segredo e lista ocultos, sessão administrativa, CSRF, link, curso e CPF.');
 }finally{
  child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));
  if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('ideau-private-'))fs.rmSync(temp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
