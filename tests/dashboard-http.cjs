const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'ideau-dashboard-'));
const router = path.join(temp,'router.php');
fs.writeFileSync(router,`<?php
require getenv('DASHBOARD_TEST_ROOT').'/vendor/autoload.php';
$db=App\\Config\\Conexao::getConexao();
foreach(['eventos_publicacoes','eventos_publicacoes_inscricoes','eventos','atividades','inscricoes'] as $table){
 $ddl=$db->query('SHOW CREATE TABLE '.$table)->fetch(PDO::FETCH_NUM)[1];
 $ddl=preg_replace('/^CREATE TABLE/','CREATE TEMPORARY TABLE',$ddl);
 $ddl=preg_replace('/,?\\n\\s*CONSTRAINT[^\\n]+/','',$ddl);
 $db->exec($ddl);
}
require getenv('DASHBOARD_TEST_ROOT').'/tests/dashboard-temporary.php';
if(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)==='/fixture'){
 session_start();$_SESSION['publication_organizer']='dashboard-test';echo 'ok';return;
}
require getenv('DASHBOARD_TEST_ROOT').'/src/Controller/PublicacaoController.php';
`);
(async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin=`http://127.0.0.1:${port}`;
 const child=spawn('php',['-S',`127.0.0.1:${port}`,router],{cwd:root,env:{...process.env,DASHBOARD_TEST_ROOT:root},stdio:'ignore',windowsHide:true});
 try{
  let response;
  for(let i=0;i<50;i++){try{response=await fetch(origin+'/?action=dashboard');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.ok(response);assert.equal(response.status,401);
  const auth=await fetch(origin+'/fixture');const cookie=auth.headers.get('set-cookie').split(';')[0];
  const get=query=>fetch(origin+'/?action=dashboard'+query,{headers:{Cookie:cookie}});
  const data=await get('');assert.equal(data.status,200);assert.equal(data.headers.get('cache-control'),'no-store');
  const summary=await data.json();assert.equal(summary.metrics.events,0);assert.equal(summary.metrics.active,0);assert.equal(summary.cancellationTracking,true);
  assert.deepEqual(summary.events,[]);assert.equal(summary.daily.length,30);
  assert.equal((await get('&period=invalid')).status,422);
  assert.equal((await get('&period=custom&from=2026-02-30&to=2026-03-01')).status,422);
  assert.equal((await get('&event[]=invalid')).status,422);
  assert.equal((await get('&event=missing')).status,200);
  console.log('OK: dashboard HTTP exige sessão, não permite cache, valida filtros e responde vazio sem dados pessoais.');
 }finally{
  child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));
  if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('ideau-dashboard-'))fs.rmSync(temp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
