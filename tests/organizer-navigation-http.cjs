// HTTP real: login existente, sessão PHP e todas as páginas protegidas, sem gravar no banco.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn, execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const nativeRouting = process.argv.includes('--native');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-organizer-nav-'));
const router = path.join(temp, 'router.php');
const hash = execFileSync('php', ['-r', "echo password_hash('navigation-test-only', PASSWORD_DEFAULT);"], {encoding:'utf8'});
fs.writeFileSync(router, `<?php
$root = getenv('NAV_TEST_ROOT');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_ends_with($path, '/')) $path .= 'index.php';
$_SERVER['SCRIPT_NAME'] = $path;
if (str_starts_with($path, '/portal/')) $path = substr($path, 7);
if ($path === '/') $path = '/index.php';
$file = realpath($root . $path);
if (!$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR)) { http_response_code(404); exit; }
if (pathinfo($file, PATHINFO_EXTENSION) === 'php') { require $file; return; }
header('Content-Type: text/html; charset=utf-8'); readfile($file);
`);
const pages = [
  ...['dashboard','eventos','evento-form','inscritos','relatorios','configuracoes'].map(n=>'ideau_eventos/'+n+'.php'),
  ...['IndexOrganizador','organizador-dashboard','org-configuracoes','org-criar-evento','org-gerenciar','org-inscritos','org-notificacoes'].map(n=>'src/View/Front/html/'+n+'.php'),
  'src/View/main/pages/organizador/idxorg.php'
];
(async () => {
  const probe=net.createServer(); await new Promise(r=>probe.listen(0,'127.0.0.1',r));
  const port=probe.address().port; await new Promise(r=>probe.close(r));
  const child=spawn('php',['-d','sys_temp_dir='+temp,'-d','session.save_path='+temp,'-S','127.0.0.1:'+port,...(nativeRouting?[]:[router])],{
    cwd:root,env:{...process.env,NAV_TEST_ROOT:root,IDEAU_ORGANIZER_EMAIL:'navigation-test',IDEAU_ORGANIZER_PASSWORD_HASH:hash},stdio:'ignore',windowsHide:true
  });
  const origin='http://127.0.0.1:'+port;
  try {
    let started=false;
    for(let i=0;i<50;i++) { try { await fetch(origin+'/index.php'); started=true;break; } catch { await new Promise(r=>setTimeout(r,100)); } }
    assert.ok(started,'PHP deve iniciar.');
    for(const base of (nativeRouting?['']:['', '/portal'])) {
      let cookie='';
      const request=async (url,options={}) => {
        const res=await fetch(origin+base+url,{redirect:'manual',...options,headers:{Cookie:cookie,...options.headers}});
        if(res.headers.get('set-cookie')) cookie=res.headers.get('set-cookie').split(';')[0];
        return res;
      };
      const api='/src/Controller/PublicacaoController.php';
      const publicUrls=['/', '/index.php', '/participantes/', '/participantes/index.php', '/index.php?mostrarBotaoPainel=1', '/participantes/?mostrarBotaoPainel=true'];
      const organizerUrls=['/organizador/', '/organizador/index.php'];
      const assertPublicHome=async()=>{
        for (const url of publicUrls) {
          const res=await request(url);
          assert.equal(res.status,200,url+' publica sem redirecionar');
          const body=await res.text();
          assert.match(body,/data-home-access="participant"/);
          assert.match(body,/id="eventsGrid"/);
          assert.doesNotMatch(body,/class="organizer-context"|Área do organizador/);
          assert.doesNotMatch(body,/data-organizer-panel|Voltar ao Painel|href="[^"]*dashboard\.php"/,url+' nunca exibe atalhos administrativos');
        }
      };
      const assertOrganizerBlocked=async()=>{
        for (const url of organizerUrls) {
          const res=await request(url);
          assert.equal(res.status,302,url+' exige sessao');
          assert.equal(res.headers.get('location'),'../ideau_eventos/login.html?retorno=organizador');
          assert.equal(await res.text(),'');
        }
      };
      await assertPublicHome();
      await assertOrganizerBlocked();
      assert.equal((await request('/src/View/Front/html/home.php?mostrarBotaoPainel=true')).status,404,'View compartilhada nao pode ser acessada diretamente.');
      let home=await request('/index.php');
      assert.match(home.headers.get('cache-control'),/no-store/);
      let html=await home.text();
      assert.doesNotMatch(html,/data-organizer-panel/);
      assert.doesNotMatch(html,/Voltar ao Painel/);
      assert.doesNotMatch(html,/data-organizer-login|href="ideau_eventos\/login\.html"/);
      assert.match(html,/Consultar minha inscrição/);
      assert.equal((await request('/organizador/index.php')).status,302,'Atalho público exige login antes de abrir o painel.');
      assert.equal((await (await request(api+'?action=organizer-status')).json()).authenticated,false);
      for(const file of pages) {
        const res=await request('/'+file);
        assert.equal(res.status,302,file+' bloqueada antes do HTML');
        assert.match(res.headers.get('location'),/login\.html$/);
        assert.equal(await res.text(),'');
      }
      for(const url of [api+'?action=dashboard',api+'?action=registrations',api+'?action=events&scope=admin','/src/Controller/EventoController.php?action=inscricoes_evento&id=1','/src/Controller/UsuarioController.php']) {
        assert.equal((await request(url)).status,401,url);
      }
      const csrf=(await (await request(api+'?action=session')).json()).csrf;
      const post=(action,data,token=csrf)=>request(api+'?action='+action,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify(data)});
      const oldCookie=cookie;
      assert.equal((await post('login',{email:'navigation-test',password:'navigation-test-only'})).status,200);
      assert.notEqual(cookie,oldCookie,'Login regenera sessão existente.');
      assert.equal((await (await request(api+'?action=organizer-status')).json()).authenticated,true);
      await assertPublicHome();
      for (const url of organizerUrls) assert.equal((await request(url)).status,200);
      home=await request('/organizador/');html=await home.text();
      assert.match(home.headers.get('cache-control'),/no-store/);
      assert.match(html,/data-home-access="organizer"/);
      const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)[0];
      assert.match(header,/<a[^>]+href="\.\.\/ideau_eventos\/dashboard\.php"[^>]+data-organizer-panel>Voltar ao Painel<\/a>/,'Cabecalho oferece retorno ao painel com a sessao PHP.');
      assert.equal((html.match(/data-organizer-panel/g)||[]).length,1,'Retorno ao painel permanece no cabecalho.');
      assert.doesNotMatch(html,/class="organizer-context"|Você está na visão do organizador/);
      assert.doesNotMatch(html,/data-organizer-login/);
      const participantHtml=await (await request('/participantes/')).text();
      const normalize=body=>body.replace(/<a[^>]*data-organizer-panel>Voltar ao Painel<\/a>/,'')
        .replace('data-home-access="organizer"','data-home-access="participant"')
        .replace('Organizador — IDEAU Eventos','IDEAU Eventos').replace('Área do organizador','Faculdades IDEAU')
        .replace(/\s+/g,' ').trim();
      assert.equal(normalize(html),normalize(participantHtml),'Eventos, filtros e scripts continuam compartilhados; somente a identificacao visual difere.');
      for (const url of ['/index.php','/participantes/','/organizador/']) {
        const body=await (await request(url)).text();
        assert.equal(JSON.parse(body.match(/const PASTA_BASE = (.*);/)[1]),base||'/','Base das APIs respeita a subpasta.');
        for (const [,asset] of body.matchAll(/(?:src|href)="([^"#]+)"/g)) {
          if (/^https?:/.test(asset)) continue;
          const resolved=new URL(asset,origin+base+url);
          assert.ok(resolved.pathname.startsWith(base+'/'),resolved.href);
          const result=await request(resolved.pathname.slice(base.length)+resolved.search);
          assert.equal(result.status,200,'Link ou recurso acessivel: '+resolved.pathname);
        }
      }
      for(const file of pages) {
        const res=await request('/'+file);
        assert.equal(res.status,200,file+' disponível com sessão');
        assert.match(res.headers.get('cache-control'),/no-store/);
        assert.match(await res.text(),/<!DOCTYPE html>/i);
      }
      const panel=await (await request('/ideau_eventos/dashboard.php')).text();
      assert.match(await (await request('/ideau_eventos/eventos.php')).text(),/href="dashboard.php"[^>]*>← Voltar ao Painel do Organizador/);
      assert.match(panel,/href="\.\.\/organizador\/index\.php"[^>]*>[\s\S]*?Visualizar site<\/a>/);
      const returnLink=header.match(/href="([^"]+)"[^>]+data-organizer-panel/)[1];
      const returnUrl=new URL(returnLink,origin+base+'/organizador/index.php');
      assert.equal((await request(returnUrl.pathname.slice(base.length))).status,200,'Botao abre o painel com a mesma sessao.');
      const activeCookie=cookie;
      await request('/index.php');await request('/participantes/');await request('/organizador/');await request('/ideau_eventos/dashboard.php');
      assert.equal(cookie,activeCookie,'Navegar não encerra nem troca a sessão.');
      assert.equal((await post('logout',{},'wrong')).status,403);
      assert.equal((await post('logout',{})).status,200);
      assert.equal((await (await request(api+'?action=organizer-status')).json()).authenticated,false);
      await assertPublicHome();
      await assertOrganizerBlocked();
      const loggedOut = await (await request('/index.php')).text();
      assert.doesNotMatch(loggedOut,/data-organizer-panel/);
      assert.doesNotMatch(loggedOut,/Voltar ao Painel/);
      assert.doesNotMatch(loggedOut,/data-organizer-login|href="ideau_eventos\/login\.html"/);
      for(const file of pages) assert.equal((await request('/'+file)).status,302);
      assert.equal((await request('/ideau_eventos/dashboard.php',{headers:{Cookie:oldCookie}})).status,302,'Cookie anterior ao login não autoriza.');
      assert.equal((await request('/ideau_eventos/dashboard.php',{headers:{Cookie:activeCookie}})).status,302,'Cookie anterior ao logout não autoriza.');
    }
    for(const file of pages) assert.equal(fs.existsSync(path.join(root,file.replace(/\.php$/,'.html'))),false,'Não manter cópia HTML desprotegida.');
    console.log('OK HTTP ('+(nativeRouting?'roteamento PHP nativo':'raiz e subpasta')+'): participante sem botao mesmo autenticado, organizador com botao funcional, view compartilhada, sessao preservada, logout e 14 paginas protegidas.');
  } finally {
    child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));
    if(path.dirname(temp)===os.tmpdir() && path.basename(temp).startsWith('ideau-organizer-nav-')) fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
