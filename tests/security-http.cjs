const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ideau-security-'));
const router=path.join(temp,'router.php');
const hash=execFileSync('php',['-r',"echo password_hash('security-test-only', PASSWORD_DEFAULT);"],{encoding:'utf8'});
// Services fake garantem que a sondagem HTTP não consulta nem altera registros reais.
fs.writeFileSync(router,`<?php
namespace App\\Service {
class EventoService { public function __call($name,$args) { return ['reached'=>$name]; } }
class UsuarioService { public function __call($name,$args) { return ['reached'=>$name]; } }
}
namespace {
$root=getenv('SECURITY_TEST_ROOT');
if (isset($_GET['https'])) $_SERVER['HTTPS']='on';
if (isset($_GET['unconfigured'])) putenv('IDEAU_ORGANIZER_PASSWORD_HASH=');
$path=parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
require $root.'/src/Controller/'.(['event'=>'EventoController.php','user'=>'UsuarioController.php'][$path === '/event'?'event':($path === '/user'?'user':'')] ?? 'PublicacaoController.php');
}
`);
(async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn('php',['-d','sys_temp_dir='+temp,'-S','127.0.0.1:'+port,router],{cwd:root,env:{...process.env,SECURITY_TEST_ROOT:root,IDEAU_ORGANIZER_EMAIL:'security-test',IDEAU_ORGANIZER_PASSWORD_HASH:hash},stdio:'ignore',windowsHide:true});
 const origin='http://127.0.0.1:'+port;let cookie='';
 const req=async(url,options={})=>{const r=await fetch(origin+url,{redirect:'manual',...options,headers:{Cookie:cookie,...options.headers}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 try{
  let response;for(let i=0;i<50;i++){try{response=await req('/?action=session');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.ok(response);assert.match(response.headers.get('set-cookie'),/HttpOnly/i);assert.match(response.headers.get('set-cookie'),/SameSite=Lax/i);
  let csrf=(await response.json()).csrf;
  const form=(url,body,token=csrf)=>req(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':token},body:new URLSearchParams(body)});
  for(const action of ['salvar','editar','excluir','reservar']) assert.equal((await form('/event',{[action]:'1',id:'1'})).status,401);
  assert.equal((await form('/event',{inscrever:'1',excluir:'1',id:'1'})).status,401);
  assert.equal((await req('/event?action=inscricoes_evento&id=1')).status,401);
  for(const action of ['salvar','editar','excluir','login']) assert.equal((await form('/user',{[action]:'1',id:'1'})).status,401);
  assert.equal((await form('/event',{inscrever:'1'},'')).status,403);
  assert.equal((await form('/event',{inscrever:'1'})).status,200);
  const login=(password,token=csrf,url='/?action=login')=>req(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify({email:'security-test',password})});
  assert.equal((await login('security-test-only','')).status,403);
  const oldCookie=cookie;
  assert.equal((await login('wrong')).status,401);
  assert.equal((await login('security-test-only')).status,200);assert.notEqual(cookie,oldCookie);
  assert.equal((await req('/event?action=inscricoes_evento&id=1')).status,200);
  assert.equal((await form('/event',{excluir:'1',id:'1'},'bad')).status,403);
  assert.equal((await form('/user',{excluir:'1',id:'1'},'bad')).status,403);
  // Trocar sessão não reinicia o limite de tentativas do IP.
  for(let i=0;i<8;i++){cookie='';csrf=(await (await req('/?action=session')).json()).csrf;assert.equal((await login('wrong')).status,401);}
  assert.equal((await login('security-test-only')).status,429);
  const secure=await fetch(origin+'/?action=session&https=1');assert.match(secure.headers.get('set-cookie'),/secure/i);
  console.log('OK HTTP: autenticação legada, CSRF, sessão regenerada, cookies e limite persistente por IP.');
 }finally{
  child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));
  if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('ideau-security-'))fs.rmSync(temp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
