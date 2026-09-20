const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-lookup-'));
const router = path.join(temp, 'router.php');
// Fixtures temporárias por requisição. Persistência/uso único são cobertos pelo teste PHP do serviço.
fs.writeFileSync(router, `<?php
require getenv('LOOKUP_TEST_ROOT') . '/vendor/autoload.php';
$db=App\\Config\\Conexao::getConexao();
$db->exec('CREATE TEMPORARY TABLE inscricao_acessos (token_hash CHAR(64), email VARCHAR(254), expira_em BIGINT)');
$db->prepare('INSERT INTO inscricao_acessos VALUES (?,?,?)')->execute([hash('sha256',str_repeat('b',64)),'verified@example.invalid',time()+1200]);
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100), dados JSON)');
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100), id_evento VARCHAR(100), dados JSON)');
$db->exec('CREATE TEMPORARY TABLE usuarios (id INT,nome TEXT,email TEXT)');
$db->exec('CREATE TEMPORARY TABLE inscricoes (id INT,id_usuario INT,id_responsavel INT,id_atividade INT,inscrito_em DATETIME)');
$db->exec('CREATE TEMPORARY TABLE atividades (id INT,nome TEXT,data_ini DATETIME,local_atv TEXT)');
$db->prepare('INSERT INTO eventos_publicacoes VALUES (?,?)')->execute(['evt-test',json_encode(['id'=>'evt-test','title'=>'Evento reservado','date'=>'2026-09-20','time'=>'12:00','location'=>'Auditório'])]);
$db->prepare('INSERT INTO eventos_publicacoes_inscricoes VALUES (?,?,?)')->execute(['reg-test','evt-test',json_encode(['email'=>'verified@example.invalid','name'=>'Participante <script>teste</script>','createdAt'=>'2026-09-20T12:00:00Z'])]);
require getenv('LOOKUP_TEST_ROOT').'/ideau_eventos/consultar-inscricao.php';
`);
(async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn('php',['-S',`127.0.0.1:${port}`,router],{cwd:root,env:{...process.env,LOOKUP_TEST_ROOT:root,IDEAU_PUBLIC_URL:'',IDEAU_MAIL_FROM:''},stdio:'ignore',windowsHide:true});
 const origin=`http://127.0.0.1:${port}`;let cookie='';
 const request=async(url,options={})=>{const r=await fetch(origin+url,{redirect:'manual',...options,headers:{Cookie:cookie,...options.headers}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 const post=body=>request('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 try{
  let first;for(let i=0;i<50;i++){try{first=await request('/');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.ok(first);let html=await first.text();assert.match(html,/Consultar minha inscrição/);assert.doesNotMatch(html,/Evento reservado/);
  const csrf=html.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  assert.equal((await post({action:'request',email:'verified@example.invalid',csrf:'wrong'})).status,403);
  const unconfigured=await post({action:'request',email:'verified@example.invalid',csrf});assert.equal(unconfigured.status,503);assert.match(await unconfigured.text(),/ainda não está configurado/);
  const opened=await request('/?token='+'b'.repeat(64));assert.equal(opened.status,303);assert.doesNotMatch(opened.headers.get('location'),/token=/);
  const pending=await request('/');html=await pending.text();assert.match(html,/Abra sua inscrição/);assert.doesNotMatch(html,/Evento reservado/);
  const confirmed=await post({action:'confirm',csrf});assert.equal(confirmed.status,303);
  html=await(await request('/')).text();assert.match(html,/Evento reservado/);assert.match(html,/Inscrição ativa/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>teste/);assert.match(html,/Ver comprovante/);assert.match(html,/Cancelar inscrição/);
  assert.equal((await post({action:'reset',csrf})).status,303);html=await(await request('/')).text();assert.doesNotMatch(html,/Evento reservado/);
  console.log('OK: consulta HTTP, CSRF, configuração ausente, link limpo, confirmação, isolamento antes do acesso e escape HTML.');
 }finally{child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));assert.ok(temp.startsWith(path.join(os.tmpdir(),'ideau-lookup-')));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
