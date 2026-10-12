// Controladores reais; banco desabilitado; sessão e limite isolados em pasta temporária.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-audit-session-'));
const router = path.join(temp, 'router.php');
const hash = execFileSync('php', ['-r', "echo password_hash('audit-test-only', PASSWORD_DEFAULT);"], {encoding:'utf8', windowsHide:true});
fs.writeFileSync(router, `<?php
namespace App\\Config { class Conexao { public static function getConexao() { throw new \\RuntimeException('Database disabled in audit'); } } }
namespace {
if (isset($_GET['auditstate'])) {
  require getenv('AUDIT_ROOT').'/vendor/autoload.php';
  \\App\\Service\\RequestSecurity::session();
  if ($_GET['auditstate'] === 'seed') {
    $_SESSION['registration_receipts'] = ['test' => ['protocol' => 'test']];
    $_SESSION['consulta_verified'] = ['email' => 'audit@example.invalid'];
  }
  header('Content-Type: application/json');
  echo json_encode(['privateState' => isset($_SESSION['registration_receipts']) || isset($_SESSION['consulta_verified'])]); exit;
}
if (isset($_GET['unconfigured'])) putenv('IDEAU_ORGANIZER_PASSWORD_HASH=');
require getenv('AUDIT_ROOT').'/src/Controller/PublicacaoController.php';
}`);
(async () => {
  let child, failures = 0;
  const check = (ok, label) => { console.log((ok ? 'PASSOU: ' : 'REPROVOU: ') + label); if (!ok) failures++; };
  try {
    const probe = net.createServer(); await new Promise(r => probe.listen(0,'127.0.0.1',r));
    const port = probe.address().port; await new Promise(r => probe.close(r));
    child = spawn('php', ['-d','sys_temp_dir='+temp,'-d','session.save_path='+temp,'-S','127.0.0.1:'+port,router],
      {cwd:root, env:{...process.env,AUDIT_ROOT:root,IDEAU_ORGANIZER_EMAIL:'audit',IDEAU_ORGANIZER_PASSWORD_HASH:hash},stdio:'ignore',windowsHide:true});
    let cookie = '';
    const req = async (query, options={}) => {
      const r = await fetch('http://127.0.0.1:'+port+'/?'+query,
        {redirect:'manual',signal:AbortSignal.timeout(5000),...options,headers:{Cookie:cookie,...options.headers}});
      if (r.headers.get('set-cookie')) cookie=r.headers.get('set-cookie').split(';')[0];
      return r;
    };
    let initial;
    for(let i=0;i<50;i++){try{initial=await req('action=session');break;}catch{await new Promise(r=>setTimeout(r,100));}}
    assert.ok(initial,'Servidor local deve iniciar');
    const csrf=(await initial.json()).csrf;
    const post=(action,body,token=csrf)=>req('action='+action,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify(body)});
    for(const action of ['dashboard','registrations','events&scope=admin'])
      check((await req('action='+action)).status===401,'GET administrativo sem sessão: '+action);
    for(const action of ['save','close','review-registration','logout'])
      check((await post(action,{})).status===401,'POST administrativo sem sessão: '+action);
    check((await post('login',{email:'audit',password:'audit-test-only'},'')).status===403,'Login sem CSRF recusado');
    check((await post('login&unconfigured=1',{email:'audit',password:'audit-test-only'})).status===503,'Login sem configuração falha fechado');
    const before=cookie;
    check((await post('login',{email:'audit',password:'audit-test-only'})).status===200 && cookie!==before,'Login válido renova ID');
    const adminCookie=cookie;
    check((await (await req('auditstate=seed')).json()).privateState,'Prepara autorizações fictícias na sessão');
    check((await post('logout',{},'wrong')).status===403,'Logout sem CSRF válido recusado');
    check((await post('logout',{})).status===200,'Logout válido aceito');
    check(!(await (await req('auditstate=inspect')).json()).privateState,'Logout remove autorizações de consulta e comprovantes');
    check((await post('login',{email:'audit',password:'audit-test-only'})).status===403,'Token CSRF anterior não é reutilizável após logout');
    check((await req('action=registrations')).status===401,'Logout revoga acesso administrativo');
    cookie=adminCookie;
    const after=await (await req('action=session')).json();
    check(!after.authenticated,'Reutilizar cookie anterior não recupera login');
    check(cookie!==adminCookie && after.csrf!==csrf,'Logout invalida ID antigo e renova token CSRF');
    console.log('Requisitos reprovados: '+failures); process.exitCode=failures?1:0;
  } finally {
    if(child && child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}
    assert.equal(path.dirname(temp),os.tmpdir());assert.ok(path.basename(temp).startsWith('ideau-audit-session-'));
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(() => {console.error('NAO EXECUTADO: falha na execução da auditoria de sessão.');process.exitCode=2;});
