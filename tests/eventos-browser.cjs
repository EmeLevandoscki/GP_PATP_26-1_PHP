// Teste de interface no Chrome/Edge instalado, com API simulada e sem gravar eventos reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const browserPath = process.env.TEST_BROWSER || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(file => fs.existsSync(file));
assert.ok(browserPath, 'Defina TEST_BROWSER com o caminho do Chrome ou Edge.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-browser-'));
const fixture = {
  id: 'evt-browser', title: 'Evento de teste', institution: 'faculdade-ideau', institutionType: 'faculdade',
  category: 'academico', audience: 'graduacao', date: '2099-12-31', time: '18:00',
  date_begin: '2099-12-31', date_end: '2099-12-31', time_begin: '18:00', time_end: '20:00',
  seats: -1, city: '', location: 'Auditório', summary: '', description: '',
  cover: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  published: true, publicationMode: 'published', effectiveEndAt: '2099-12-31T23:00:00.000Z',
  fields: {}, registrationCount: 0
};
let events = [{ ...fixture, registrationCount: 1 }];
let registrations = [];
let saves = 0;
let receiptSubmissions = 0;
let receiptList = [];
let lastRegistration = null;
// Renderiza o template real com dados fictícios; backend é coberto pelo teste HTTP.
const receiptTemplate = fs.readFileSync(path.join(root, 'ideau_eventos/comprovante.php'), 'utf8').split('<!DOCTYPE html>')[1];
const renderReceiptHtml = reviewStatus => execFileSync('php', [], { cwd: root, env: {...process.env, TEST_REVIEW_STATUS: reviewStatus}, encoding: 'utf8', input: `<?php
$receipt = ['name'=>'Participante de teste', 'eventTitle'=>'Semana Acadêmica IDEAU', 'date'=>'23/03/2027', 'time'=>'12:12', 'location'=>'Auditório IDEAU', 'registeredAt'=>'20/09/2026 09:44', 'protocol'=>'reg-teste-123456','reviewStatus'=>getenv('TEST_REVIEW_STATUS') ?: 'approved'];
$id = str_repeat('a',64); $error = ''; $cancelled = false; $_SESSION['receipt_csrf'] = 'test';
function escapeReceipt(string $text): string { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html>` + receiptTemplate });

const receiptHtml = renderReceiptHtml('approved');
const pendingReceiptHtml = renderReceiptHtml('pending');
const lookupTemplate = fs.readFileSync(path.join(root, 'ideau_eventos/consultar-inscricao.php'), 'utf8').split('<!DOCTYPE html>')[1];
const lookupHtml = execFileSync('php', [], { cwd: root, encoding: 'utf8', input: `<?php
$error='';$message='';$email='';$verified=null;$receipts=[];$_SESSION=['consulta_csrf'=>'test'];
function consultaEscape(string $value): string {return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');}
?><!DOCTYPE html>` + lookupTemplate });
// Resposta agregada simulada somente para o teste de interface. SQL real: tests/dashboard.php.
function dashboardResponse(url) {
  let selected=events.map((e,i)=>({...e,key:'p:'+e.id,active:e.registrationCount||0,cancelled:i===0?2:0,totalActive:e.registrationCount||0,seats:i===0?100:-1,occupancy:i===0?(e.registrationCount||0):null,institutionName:'Faculdade IDEAU',institution:'faculdade-ideau',createdAt:200-i,mode:e.publicationMode||'published',date:'2099-12-31'}));
  const options=selected.slice();
  const scope=url.searchParams.get('scope'),event=url.searchParams.get('event'),audience=url.searchParams.get('audience');
  if(scope==='history')selected=selected.filter(e=>e.closed);
  if(scope==='current')selected=selected.filter(e=>!e.closed);
  if(event)selected=selected.filter(e=>e.id===event);
  if(audience==='escola')selected=[];
  const active=selected.reduce((sum,e)=>sum+e.active,0),cancelled=selected.reduce((sum,e)=>sum+e.cancelled,0);
  return {events:selected,options,metrics:{events:selected.length,current:selected.filter(e=>!e.closed).length,closed:selected.filter(e=>e.closed).length,published:selected.filter(e=>e.published).length,active,cancelled,institutions:active?1:0,occupancy:selected.some(e=>e.seats>0)?42:null,available:58,unlimited:selected.filter(e=>e.seats===-1).length},institutions:active?[{name:'Faculdade IDEAU',count:active}]:[],audiences:{escola:0,faculdade:active,unknown:0},daily:[{date:'2026-09-20',count:active},{date:'2026-09-21',count:cancelled}],latest:selected.filter(e=>e.active).map(e=>({title:e.title,date:'2026-09-20T12:00:00Z'})),cancellationTracking:true,generatedAt:new Date().toISOString(),period:{from:null,to:null}};
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  if (url.pathname.endsWith('/PublicacaoController.php')) {
    const action = url.searchParams.get('action');
    if (action === 'session') return json({ authenticated: true, csrf: 'test', receipts: receiptList });
    if (action === 'dashboard') return json(dashboardResponse(url));
    if (action === 'registrations') return json(registrations);
    const active = event => !event.closed && event.published && new Date(event.effectiveEndAt) > new Date();
    const hasAccess = event => event.accessMode !== 'link' || (event.accessToken && url.searchParams.get('accessToken') === event.accessToken);
    const publicView = event => { const result={...event,accessGranted:Boolean(hasAccess(event))}; delete result.accessToken; delete result.allowedParticipants; if(!result.accessGranted)delete result.fields; return result; };
    if (action === 'events') return json(url.searchParams.get('scope') === 'admin' ? events : events.filter(event=>active(event) && event.listed !== false).map(publicView));
    if (action === 'event') return json(events.filter(event=>event.id===url.searchParams.get('id') && active(event) && (event.listed !== false || hasAccess(event))).map(publicView));
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}');
    if (action === 'register') {
      lastRegistration=data; receiptSubmissions++;
      const reviewStatus=events.find(event=>event.id===data.eventId)?.recipientMode==='manual'?'pending':'approved';
      receiptList = [{ id: 'a'.repeat(64), eventId: data.eventId, name: data.name, reviewStatus }];
      return json({success:true,reviewStatus,alreadyRegistered:receiptSubmissions>1,receiptUrl:'comprovante.php?id='+'a'.repeat(64)});
    }
    if (action === 'review-registration') {
      const row=registrations.find(row=>row.id===data.id && row.eventId===data.eventId);
      if(!row){res.statusCode=422;return json({message:'Inscrição não encontrada.'});}
      if(data.decision==='approve')row.reviewStatus='approved';
      else registrations=registrations.filter(item=>item!==row);
      return json({success:true});
    }
    if (action === 'close') {
      events = events.map(event => event.id === data.id ? { ...event, closed: true, published: false, closedAt: new Date().toISOString(), closeReason: 'manual' } : event);
      return json(events.find(event => event.id === data.id));
    }
    if (action === 'save') {
      saves++;
      const previous=events.find(event=>event.id===data.id);
      if(data.accessMode==='link'){data.accessToken=previous?.accessToken || 'b'.repeat(64); if(data.targetCourse)data.fields={...data.fields,cpf:true,course:true,community:false};}
      events = events.filter(event => event.id !== data.id).concat({ ...data, effectiveEndAt: data.endAt || fixture.effectiveEndAt });
      return json(data);
    }
    return json({ success: true });
  }
  if (url.pathname.endsWith('/EventoController.php')) {
    const action = url.searchParams.get('action');
    return json(action === 'qtd_inscricoes_evento' ? { count: 80 } : action === 'qtdAtivos' ? 0 : []);
  }
  if (url.pathname.endsWith('/comprovante.php')) { res.setHeader('Content-Type', 'text/html'); return res.end(receiptList.some(item=>item.reviewStatus==='pending')?pendingReceiptHtml:receiptHtml); }
  if (url.pathname.endsWith('/consultar-inscricao.php')) { res.setHeader('Content-Type', 'text/html'); return res.end(lookupHtml); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.php': 'text/html', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  // A página inicial usa PHP apenas para definir o caminho base; simula a raiz local.
  res.end(path.extname(file) === '.php' ? fs.readFileSync(file, 'utf8').replace(/<\?php[\s\S]*?\?>/g, '') : fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await pause(100);
    assert.ok(fs.existsSync(portFile), 'O navegador não iniciou.');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Conexão com o navegador indisponível.')), 10000);
      socket.onopen = () => { clearTimeout(timeout); resolve(); };
      socket.onerror = error => { clearTimeout(timeout); reject(error); };
    });
    const pending = new Map();
    const errors = [];
    let sequence = 0;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Navegador sem resposta: ' + method)); }, 10000);
      pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const promise = pending.get(message.id);
        if (!promise) return;
        pending.delete(message.id);
        if (message.error) promise.reject(new Error(message.error.message));
        else promise.resolve(message.result);
      }
      if (message.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + message.params.exceptionDetails.exception?.description);
    };
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const until = async expression => {
      for (let i = 0; i < 100; i++) {
        try { if (await evaluate(expression)) return; } catch {}
        await pause(100);
      }
      throw new Error('Tempo excedido: ' + expression);
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*unsplash.com*'] });
    const navigate = async page => {
      const url = new URL(page, origin + '/ideau_eventos/').href;
      await send('Page.navigate', { url });
      await until('document.readyState === "complete" && location.href === ' + JSON.stringify(url));
    };

    // Cliques reais no menu mobile: detecta handlers duplicados e sobreposições.
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    const clickMenuElement = async (selector, overlay = false) => {
      const point = await evaluate('(() => { const r=document.querySelector(' + JSON.stringify(selector) + ').getBoundingClientRect(); return {x:r.x+' + (overlay ? '10' : 'r.width/2') + ',y:r.y+' + (overlay ? '400' : 'r.height/2') + '}; })()');
      await send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
      await send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
      await pause(400);
    };
    for (const page of ['../index.php', 'evento.html?id=evt-browser', 'inscricao.html?id=evt-browser']) {
      await navigate(page);
      await clickMenuElement('#menuToggle');
      assert.equal(await evaluate('document.getElementById("sidebar").classList.contains("open")'), true, page + ': menu deve abrir com um clique');
      assert.equal(await evaluate('document.getElementById("menuToggle").getAttribute("aria-expanded")'), 'true');
      assert.equal(await evaluate('document.getElementById("mainNav")?.classList.contains("open") || false'), false);
      assert.equal(await evaluate('document.body.style.overflow'), 'hidden');
      await clickMenuElement('#sidebarClose');
      assert.equal(await evaluate('document.getElementById("sidebar").classList.contains("open")'), false);
      await clickMenuElement('#menuToggle');
      await clickMenuElement('#sidebarOverlay', true);
      assert.equal(await evaluate('document.getElementById("sidebar").classList.contains("open")'), false);
      assert.equal(await evaluate('document.getElementById("menuToggle").getAttribute("aria-expanded")'), 'false');
      assert.equal(await evaluate('document.body.style.overflow'), '');
      await clickMenuElement('#menuToggle');
      await evaluate('document.querySelector(".sidebar-nav a[data-nav-link]").addEventListener("click", e => e.preventDefault(), {once:true})');
      await clickMenuElement('.sidebar-nav a[data-nav-link]');
      assert.equal(await evaluate('document.getElementById("sidebar").classList.contains("open")'), false);
    }
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('Menu mobile: abertura, botão fechar, clique fora e links conferidos nas três páginas públicas.');

    await send('Page.navigate', { url: origin + '/index.php' });
    await until('document.querySelector("#eventsGrid .card-title")?.textContent === "Evento de teste"');
    await until('document.getElementById("statInscricoes").textContent === "1"');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
    await until('document.documentElement.getAttribute("data-theme") === "dark"');
    assert.equal(await evaluate('document.getElementById("sidebarThemeIcon").textContent'),'🌙');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
    await until('document.documentElement.getAttribute("data-theme") === "light"');
    assert.equal(await evaluate('document.getElementById("sidebarThemeIcon").textContent'),'☀️');
    await evaluate('document.getElementById("sidebarThemeToggle").click()');
    assert.equal(await evaluate('document.documentElement.getAttribute("data-theme")'),'dark');
    assert.equal(await evaluate('localStorage.getItem("ideau-theme")'),'dark');
    await evaluate('document.getElementById("sidebarThemeToggle").click()');
    assert.equal(await evaluate('localStorage.getItem("ideau-theme")'),null);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
    await until('document.documentElement.getAttribute("data-theme") === "dark"');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
    await until('document.documentElement.getAttribute("data-theme") === "light"');
    console.log('Tema conferido: acompanha navegador em tempo real, preserva sol/lua e permite troca manual com retorno ao automático.');
    assert.equal(await evaluate('document.getElementById("statInscricoes").textContent'), '1', 'Contador deve usar o evento publicado, sem as 80 inscrições do evento antigo.');
    await evaluate('document.querySelector("#eventsGrid .event-card").scrollIntoView({behavior:"instant"})');
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#eventsGrid .event-card")).opacity'), '1', 'Evento publicado deve estar visível após carregar pela API.');
    await evaluate('document.getElementById("searchInput").value = "não existe"; document.getElementById("searchInput").dispatchEvent(new Event("input", {bubbles:true}))');
    await until('document.getElementById("eventsGrid").textContent.includes("Nenhum evento publicado")');
    await evaluate('document.getElementById("searchInput").value = ""; document.getElementById("searchInput").dispatchEvent(new Event("input", {bubbles:true}))');
    await until('document.querySelector("#eventsGrid .card-title")?.textContent === "Evento de teste"');
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#eventsGrid .event-card")).opacity'), '1', 'Refazer a busca não deve ocultar os novos cards.');
    console.log('Página inicial conferida: evento publicado visível após carregar e refazer a busca.');
    await until('document.querySelector("#destaque .featured-content h2")?.textContent === "Evento de teste"');
    assert.equal(await evaluate('document.getElementById("destaque").hidden'), false);
    assert.equal(await evaluate('document.querySelector("#destaque .featured-wrap").classList.contains("fade-up")'), false);
    events[0].closed = true;
    await send('Page.navigate', {url: origin + '/index.php'});
    await until('document.getElementById("eventsGrid")?.textContent.includes("Nenhum evento publicado")');
    assert.equal(await evaluate('document.getElementById("destaque").hidden'), true);
    assert.equal(await evaluate('document.getElementById("destaque").textContent'), '');

    events[0].closed = false;
    console.log('Destaque usa eventos publicados e desaparece quando todos estão fora do ar.');
    await navigate('evento-form.html');
    await until('document.getElementById("eventForm").getAttribute("aria-busy") === "false"');
    console.log('Formulário carregado no navegador.');
    const advanceToStep = async target => {
      for (let i=0;i<4;i++) {
        const current=Number(await evaluate('document.getElementById("eventFormStep").value'));
        if(current===target)return;
        assert.ok(current<target,'Avanço deve seguir a ordem das etapas.');
        await evaluate('document.getElementById("eventStepNext").click()');
        assert.equal(Number(await evaluate('document.getElementById("eventFormStep").value')),current+1,'Próximo deve avançar uma etapa válida.');
      }
    };
    const saveThroughSteps = async () => {
      await advanceToStep(3);
      await evaluate('document.querySelector("#eventForm button[type=submit]").click()');
    };
    assert.equal(await evaluate('document.querySelectorAll("[data-event-step]:not([hidden])").length'),1);
    assert.equal(await evaluate('document.getElementById("eventStepBack").disabled'),true);
    assert.equal(await evaluate('document.querySelector("#eventForm button[type=submit]").hidden'),true);
    await evaluate('document.getElementById("eventStepNext").scrollIntoView({block:"end",behavior:"instant"}); document.getElementById("eventStepNext").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'eventFormErrors');
    await until('(() => { const box = document.getElementById("eventFormErrors").getBoundingClientRect(); return box.top >= -1 && box.bottom <= innerHeight + 1; })()');
    assert.equal(await evaluate('(() => { const box = document.getElementById("eventFormErrors").getBoundingClientRect(); return box.top >= -1 && box.bottom <= innerHeight + 1; })()'), true, 'A lista deve estar visível junto ao botão.');
    assert.ok(await evaluate('scrollY > 0'), 'Salvar com erros não deve levar ao topo.');
    assert.ok(await evaluate('document.querySelectorAll("[aria-invalid=true]").length') >= 5);
    assert.match(await evaluate('document.getElementById("eventTitleError").textContent'), /Preencha/);
    assert.equal(await evaluate('document.getElementById("eventFormErrors").hidden'), false);
    assert.equal(saves, 0, 'Formulário inválido não deve chamar o servidor.');
    await evaluate('document.querySelector("[data-error-field=eventTitle]").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'eventTitle');
    assert.equal(await evaluate('(() => { const box = document.getElementById("eventTitleError").getBoundingClientRect(); return box.top >= -1 && box.bottom <= innerHeight + 1; })()'), true);
    assert.equal(await evaluate('document.querySelector(".admin-public-link").parentElement === document.getElementById("logoutButton").parentElement'), true);
    assert.equal(await evaluate(`document.querySelector('.admin-nav a[href="../index.php"]')`), null);
    await evaluate(`(() => { const f = document.getElementById('eventTitle'); f.value = 'Título preservado'; f.dispatchEvent(new Event('input', { bubbles: true })); const r = document.getElementById('eventRegistrationEndAt'); r.value = '2099-12-30T20:00'; r.dispatchEvent(new Event('input', { bubbles: true })); const d = document.getElementById('eventEndAt'); d.value = '2099-12-31T20:00'; d.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.equal(await evaluate('document.getElementById("eventTitle").hasAttribute("aria-invalid")'), false);
    await send('Page.reload');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy") === "false" && document.getElementById("eventTitle").value === "Título preservado"');
    assert.equal(await evaluate('document.getElementById("eventEndAt").value'), '2099-12-31T20:00');
    assert.equal(await evaluate('document.getElementById("eventRegistrationEndAt").value'), '2099-12-30T20:00');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await send('Emulation.clearDeviceMetricsOverride');
    await evaluate(`(() => {
      for (const [id, value] of Object.entries({eventInstitution:'faculdade-ideau',eventCategory:'Acadêmico',eventDate:'2099-12-31',eventTime:'18:00'})) {
        const field = document.getElementById(id); field.value = value;
        field.dispatchEvent(new Event('input', {bubbles:true})); field.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const bytes = Uint8Array.from(atob(${JSON.stringify(fixture.cover.split(',')[1])}), c => c.charCodeAt(0));
      const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'capa.png', {type:'image/png'}));
      const file = document.getElementById('eventCoverFile'); file.files = transfer.files;
      file.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await until('document.getElementById("eventCover").value.startsWith("data:image/png")');
    await evaluate('document.getElementById("eventStepNext").click()');
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'0');
    assert.equal(await evaluate('document.querySelectorAll("[aria-invalid=true]").length'), 1);
    assert.match(await evaluate('document.getElementById("eventFormErrors").textContent'), /Local/);
    assert.equal(await evaluate('document.activeElement.id'), 'eventFormErrors');
    await evaluate('document.querySelector("[data-error-field=eventLocation]").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'eventLocation');
    await evaluate('document.getElementById("eventLocation").value = "Auditório"; document.getElementById("eventLocation").dispatchEvent(new Event("input", {bubbles:true})); document.getElementById("eventStepNext").click()');
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'1');
    assert.equal(saves,0,'Avançar não salva o evento.');
    assert.equal(await evaluate('document.activeElement.id'),'eventStepHeading1');
    await evaluate('document.getElementById("fieldNotes").click();document.getElementById("eventStepBack").click()');
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'0');
    assert.equal(await evaluate('document.getElementById("eventLocation").value'),'Auditório');
    await advanceToStep(2);
    assert.equal(await evaluate('document.getElementById("fieldNotes").checked'),true);
    await send('Page.reload');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'2','Atualizar preserva a etapa.');
    assert.equal(await evaluate('document.getElementById("fieldNotes").checked'),true);
    await advanceToStep(3);
    assert.equal(await evaluate('document.getElementById("eventStepNext").hidden'),true);
    assert.equal(await evaluate('document.querySelector("#eventForm button[type=submit]").hidden'),false);
    await evaluate('document.querySelector("input[name=publicationMode][value=automatic]").click(); document.querySelector("#eventForm button[type=submit]").click()');
    assert.equal(saves,0);
    assert.match(await evaluate('document.getElementById("eventFormErrors").textContent'),/publicação/i);
    await evaluate('document.querySelector("input[name=publicationMode][value=published]").click()');
    await evaluate('document.getElementById("eventTitle").value="";document.querySelector("#eventForm button[type=submit]").click()');
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'0','Salvar deve reabrir a etapa anterior que ficou inválida.');
    assert.match(await evaluate('document.getElementById("eventFormErrors").textContent'),/Título do evento/);
    await evaluate('document.getElementById("eventTitle").value="Título preservado";document.getElementById("eventTitle").dispatchEvent(new Event("input",{bubbles:true}))');
    await saveThroughSteps();
    await until('location.pathname.endsWith("/eventos.html")');
    assert.equal(saves, 1, 'Após corrigir o campo, deve salvar normalmente.');
    console.log('Validação, menu, recuperação e layout móvel conferidos.');
    const savedEvent = events.at(-1);
    assert.equal(savedEvent.category, 'academico', 'Sugestão deve manter a categoria compatível com os filtros.');
    assert.equal(savedEvent.audience, 'graduacao');
    await navigate('evento-form.html?id=' + savedEvent.id);
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy") === "false"');
    assert.equal(await evaluate('document.getElementById("eventCategory").value'), 'Acadêmico');
    assert.ok(await evaluate('document.getElementById("eventCategoryOptions").options.length >= 6'));
    assert.ok(await evaluate('document.getElementById("eventAudienceOptions").options.length >= 4'));
    const clickChoiceArrow = async id => {
      const point = await evaluate('(() => {const button=document.getElementById('+JSON.stringify(id+'Toggle')+');button.scrollIntoView({block:"center",behavior:"instant"});const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
      await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    };
    for (const id of ['eventCategory','eventAudience']) {
      const original=await evaluate('document.getElementById('+JSON.stringify(id)+').value');
      await clickChoiceArrow(id);
      assert.equal(await evaluate('document.getElementById('+JSON.stringify(id)+').getAttribute("aria-expanded")'),'true');
      await clickChoiceArrow(id);
      assert.equal(await evaluate('document.getElementById('+JSON.stringify(id+'Suggestions')+').hidden'),true,'Segundo clique na seta deve fechar.');
      assert.equal(await evaluate('document.getElementById('+JSON.stringify(id)+').value'),original);
      await clickChoiceArrow(id);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      assert.equal(await evaluate('document.getElementById('+JSON.stringify(id+'Suggestions')+').hidden'),true);
    }
    await evaluate('document.getElementById("eventCategory").value="";document.getElementById("eventCategory").focus()');
    await send('Input.insertText',{text:'cultural'});
    assert.equal(await evaluate('document.querySelectorAll("#eventCategorySuggestions [role=option]").length'),1);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.equal(await evaluate('document.getElementById("eventCategory").value'),'Cultural');
    assert.equal(await evaluate('document.getElementById("eventCategorySuggestions").hidden'),true);
    await clickChoiceArrow('eventCategory');
    await clickChoiceArrow('eventAudience');
    assert.equal(await evaluate('document.getElementById("eventCategorySuggestions").hidden'),true,'Abrir outro campo fecha a lista anterior.');
    await evaluate('document.getElementById("eventTitle").focus()');
    assert.equal(await evaluate('document.getElementById("eventAudienceSuggestions").hidden'),true);
    await clickChoiceArrow('eventCategory');
    await evaluate('document.querySelector("#eventCategorySuggestions [role=option]").click()');
    assert.equal(await evaluate('document.getElementById("eventCategory").value'),'Acadêmico');
    assert.equal(await evaluate('document.getElementById("eventCategorySuggestions").hidden'),true);

    await evaluate('Object.entries({eventCategory:"Oficina de pesquisa",eventAudience:"Professores e egressos"}).forEach(([id,value])=>{const field=document.getElementById(id);field.value=value;field.dispatchEvent(new Event("input",{bubbles:true}));}); document.getElementById("eventInstitution").value="escola-ideau-santa-clara"; document.getElementById("eventInstitution").dispatchEvent(new Event("change",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("eventAudience").value'), 'Professores e egressos');
    assert.equal(await evaluate('document.getElementById("schoolFieldsGroup").hidden'), false);
    assert.equal(await evaluate('document.getElementById("fieldResponsibleName").checked'), true);
    await evaluate('document.getElementById("eventInstitution").value="faculdade-ideau"; document.getElementById("eventInstitution").dispatchEvent(new Event("change",{bubbles:true}))');
    await send('Page.reload');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy") === "false"');
    assert.equal(await evaluate('document.getElementById("eventCategory").value'), 'Oficina de pesquisa');
    assert.equal(await evaluate('document.getElementById("eventAudience").value'), 'Professores e egressos');
    assert.equal(await evaluate('document.getElementById("graduationFieldsGroup").hidden'), false);
    await evaluate('document.getElementById("eventAudience").value="   "; document.querySelector("#eventForm button[type=submit]").click()');
    assert.equal(saves, 1, 'Público vazio deve impedir o envio.');
    assert.match(await evaluate('document.getElementById("eventFormErrors").textContent'), /Público-alvo/);
    await evaluate('document.getElementById("eventAudience").value="Professores e egressos"; document.getElementById("eventAudience").dispatchEvent(new Event("input",{bubbles:true}));');
    await saveThroughSteps();
    await until('location.pathname.endsWith("/eventos.html")');
    assert.equal(saves, 2);
    assert.equal(events.at(-1).category, 'Oficina de pesquisa');
    assert.equal(events.at(-1).audienceLabel, 'Professores e egressos');
    assert.equal(events.at(-1).audience, 'graduacao');
    await navigate('evento-form.html?id=' + savedEvent.id);
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy") === "false"');
    assert.equal(await evaluate('document.getElementById("eventAudience").value'), 'Professores e egressos');
    assert.equal(await evaluate('document.getElementById("eventCategory").value'), 'Oficina de pesquisa');
    assert.ok(await evaluate('[...document.getElementById("eventAudienceOptions").options].some(option=>option.value==="Professores e egressos")'));
    await navigate('evento.html?id=' + savedEvent.id);
    await until('document.querySelector(".evento-audience")');
    assert.match(await evaluate('document.querySelector(".evento-audience").textContent'), /Professores e egressos/);
    assert.equal(await evaluate('document.querySelector(".cover-badge").textContent'), 'Oficina de pesquisa');
    await navigate('inscricao.html?id=' + savedEvent.id);
    await until('document.querySelector(".audience-pill")');
    assert.equal(await evaluate('document.querySelector(".audience-pill").textContent'), 'Professores e egressos');
    console.log('Categoria e público: sugestões, texto livre, edição, recuperação, validação e inscrição por instituição conferidos.');


    await navigate('eventos.html');
    await until('document.querySelector("[data-close-event]")');
    await evaluate('document.querySelector("[data-close-event]").click()');
    await until('document.getElementById("historyEventsCount").textContent === "1"');
    await evaluate('document.querySelector("[data-event-view=history]").click()');
    assert.match(await evaluate('document.getElementById("adminEventsTable").textContent'), /Retirado manualmente/);
    assert.equal(await evaluate('document.querySelector("[data-publish-event]")'), null);
    assert.ok(await evaluate(`document.querySelector('a[href*="relatorios.html?event="]') !== null`));
    await send('Page.reload');
    await until('document.getElementById("historyEventsCount")?.textContent === "1"');
    console.log('Encerramento manual e histórico conferidos.');

    events = [{ ...fixture, effectiveEndAt: new Date(Date.now() + 5000).toISOString() }];
    await navigate('inscricao.html?id=evt-browser');
    await until('document.getElementById("registrationForm")');
    await until('document.body.textContent.includes("Inscrições encerradas ou indisponíveis")');
    assert.equal(await evaluate('document.getElementById("registrationForm")'), null);
    events = [
      { ...fixture, title: 'Evento Alfa', createdAt: '2026-01-01T12:00:00Z', registrationCount: 1, closed: true, published: false, closedAt: '2026-01-01T12:00:00Z' },
      { ...fixture, id: 'evt-beta', title: 'Evento Beta', createdAt: '2026-09-20T12:00:00Z', date: '2099-12-31', registrationCount: 1 },
      { ...fixture, id: 'evt-empty', title: 'Evento sem inscritos', createdAt: '2026-06-01T12:00:00Z', date: '2099-01-01' }
    ];
    registrations = [
      { eventId: fixture.id, name: 'Participante Alfa', createdAt: '2026-01-01T10:00:00Z' },
      { eventId: 'evt-beta', name: 'Participante Beta', createdAt: '2026-01-01T11:00:00Z' }
    ];
    await navigate('relatorios.html');
    await until('document.querySelectorAll(".report-event-link").length === 3');
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".report-event-link h3"), node => node.textContent)'), ['Evento Beta', 'Evento sem inscritos', 'Evento Alfa'], 'Cards devem seguir a ordem de cadastro mais recente, independentemente da data do evento.');
    assert.equal(await evaluate('document.getElementById("reportRegistrationsTable").textContent'), '');
    assert.equal(await evaluate('document.getElementById("reportExportActions").hidden'), true);
    assert.equal(await evaluate('document.body.textContent.includes("Participante Alfa")'), false);
    assert.equal(await evaluate('document.querySelectorAll(".report-card [data-report-export]").length'), 6);
    await evaluate(`(() => {
      URL.createObjectURL = blob => { blob.text().then(text => window.cardExcel = text); return 'blob:test'; };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() { if (!this.download) click.call(this); };
      window.open = () => ({ document: {write: text => { window.cardPdf = text; }, close() {}}, focus() {}, print() {} });
      document.querySelector('[data-report-export="pdf"][data-event-id="evt-browser"]').click();
      document.querySelector('[data-report-export="excel"][data-event-id="evt-beta"]').click();
    })()`);
    await until('window.cardPdf && window.cardExcel');
    assert.match(await evaluate('window.cardPdf'), /Participante Alfa/);
    assert.doesNotMatch(await evaluate('window.cardPdf'), /Participante Beta/);
    assert.match(await evaluate('window.cardExcel'), /Participante Beta/);
    assert.doesNotMatch(await evaluate('window.cardExcel'), /Participante Alfa/);
    assert.equal(await evaluate('location.search'), '', 'Exportar no card deve manter a lista de eventos aberta.');
    await evaluate(`document.querySelector('.report-event-link[href="relatorios.html?event=evt-browser"]').click()`);
    await until('document.getElementById("reportSelectedTitle")?.textContent === "Evento Alfa"');
    assert.equal(await evaluate('document.getElementById("reportEventsOverview").hidden'), true);
    assert.match(await evaluate('document.getElementById("reportRegistrationsTable").textContent'), /Participante Alfa/);
    assert.doesNotMatch(await evaluate('document.getElementById("reportRegistrationsTable").textContent'), /Participante Beta/);
    assert.match(await evaluate('document.getElementById("reportSelectedMeta").textContent'), /Encerrado/);
    await send('Page.reload');
    await until('document.getElementById("reportSelectedTitle")?.textContent === "Evento Alfa"');
    await evaluate(`(() => {
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => { blob.text().then(text => window.testExcel = text); return create(blob); };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() { if (!this.download) click.call(this); };
      window.open = () => ({ document: {write: text => { window.testPdf = text; }, close() {}}, focus() {}, print() {} });
      document.getElementById('exportFilteredExcel').click();
      document.getElementById('printFilteredPdf').click();
    })()`);
    await until('window.testExcel && window.testPdf');
    for (const format of ['testExcel', 'testPdf']) {
      const output = await evaluate('window.' + format);
      assert.match(output, /Evento Alfa/);
      assert.match(output, /Participante Alfa/);
      assert.doesNotMatch(output, /Participante Beta|Evento Beta/);
    }
    await evaluate('document.getElementById("reportSearch").value = "Beta"; document.getElementById("reportSearch").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.match(await evaluate('document.getElementById("reportRegistrationsTable").textContent'), /Nenhum inscrito corresponde/);
    await evaluate(`document.querySelector('#reportEventDetail a[href="relatorios.html"]').click()`);
    await until('document.querySelectorAll(".report-event-link").length === 3');
    await evaluate('document.getElementById("reportEventSearch").value = "Beta"; document.getElementById("reportEventSearch").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.equal(await evaluate('document.querySelectorAll(".report-event-link").length'), 1);
    await navigate('relatorios.html?event=evt-empty');
    await until('document.getElementById("reportRegistrationsTable")?.textContent.includes("ainda não tem inscritos")');

    // A instituição deve definir o relatório mesmo sem linhas e com público descritivo livre.
    for (const school of [false, true]) {
      for (const empty of [false, true]) {
        const id = 'report-' + (school ? 'school' : 'college') + (empty ? '-empty' : '');
        events.push({...fixture, id, institution:school?'escola-ideau-santa-clara':'faculdade-ideau', institutionType:school?'escola':'faculdade', audience:school?'graduacao':'escola', audienceLabel:school?'Egressos':'Famílias', registrationCount:empty?0:1});
        if (!empty) registrations.push({eventId:id, name:'Participante da faculdade', cpf:'11122233344', studentName:'Educando da escola', responsibleName:'Responsável da escola', responsibleCpf:'55566677788', relationship:'Mãe', studentClass:'Turma escolar', course:'Curso da faculdade', createdAt:'2026-09-27T12:00:00Z'});
        await navigate('relatorios.html?event=' + id);
        await until('document.querySelector("#reportRegistrationsHead th")');
        const expected = school
          ? ['Inscrição','Educando','Responsável','CPF do Responsável','Parentesco','Turma']
          : ['Inscrição','Participante','CPF','Curso'];
        assert.deepEqual(await evaluate('[...document.querySelectorAll("#reportRegistrationsHead th")].map(th=>th.textContent)'), expected);
        // Captura o HTML entregue aos dois formatos, sem abrir janelas ou gravar downloads.
        await evaluate('URL.createObjectURL=blob=>{blob.text().then(text=>window.institutionExcel=text);return "blob:test";}; HTMLAnchorElement.prototype.click=function(){}; window.open=()=>({document:{write:text=>window.institutionPdf=text,close(){}},focus(){},print(){}}); document.getElementById("exportFilteredExcel").click(); document.getElementById("printFilteredPdf").click();');
        await until('window.institutionExcel && window.institutionPdf');
        for (const format of ['institutionExcel','institutionPdf']) {
          const output = await evaluate('window.' + format);
          const headers = [...output.matchAll(/<th>(.*?)<\/th>/g)].map(match=>match[1]).slice(2);
          assert.deepEqual(headers, ['Evento','Data do evento',...expected]);
          assert.doesNotMatch(output, school ? /Curso da faculdade|<th>Curso<\/th>|Participante da faculdade|11122233344/ : /Educando|Responsável|Parentesco|Turma|55566677788/);
          if (empty) assert.ok(output.includes('colspan="' + (expected.length + 2) + '">Nenhuma inscrição encontrada.'));
          else assert.match(output, school ? /Educando da escola.*|Responsável da escola/ : /Participante da faculdade/);
        }
        if (!empty) {
          await evaluate('window.institutionExcel=null;window.institutionPdf=null;document.getElementById("reportSearch").value="sem correspondência";document.getElementById("reportSearch").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("exportFilteredExcel").click();document.getElementById("printFilteredPdf").click();');
          await until('window.institutionExcel && window.institutionPdf');
          for (const format of ['institutionExcel','institutionPdf']) {
            const output = await evaluate('window.' + format);
            assert.deepEqual([...output.matchAll(/<th>(.*?)<\/th>/g)].map(match=>match[1]).slice(2), ['Evento','Data do evento',...expected]);
            assert.ok(output.includes('colspan="' + (expected.length + 2) + '">Nenhuma inscrição encontrada.'));
          }
        }
      }
    }
    console.log('PDF, Excel e tabela: faculdade/escola, dados preenchidos, eventos vazios e busca sem resultados conferidos.');
    await navigate('relatorios.html?event=inexistente');
    await until('document.getElementById("reportSelectedTitle")?.textContent === "Evento não encontrado"');
    assert.equal(await evaluate('document.getElementById("reportRegistrationsTable").textContent'), '');
    assert.equal(await evaluate('document.getElementById("reportExportActions").hidden'), true);
    console.log('Relatórios conferidos: cards, navegação, evento encerrado, isolamento de participantes, busca, PDF, Excel e evento vazio/inexistente.');
    events = [{ ...fixture, description: 'Descrição do evento. '.repeat(300) }];
    await send('Emulation.setDeviceMetricsOverride', {width:1280,height:650,deviceScaleFactor:1,mobile:false});
    await navigate('evento.html?id=evt-browser');
    await until('document.querySelector(".evento-info-wrap")');
    await evaluate('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');
    assert.ok(await evaluate('window.scrollY > 0'), 'Página do evento deve rolar no desktop.');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".evento-info-wrap")).maxHeight'), 'none');
    await evaluate('document.querySelector(".btn-inscricao").scrollIntoView({block:"center",behavior:"instant"})');
    assert.equal(await evaluate('(() => {const r=document.querySelector(".btn-inscricao").getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight;})()'), true, 'Botão de inscrição deve ficar acessível.');
    await send('Emulation.setDeviceMetricsOverride', {width:375,height:650,deviceScaleFactor:1,mobile:true});
    await evaluate('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');
    assert.ok(await evaluate('window.scrollY > 0'), 'Página do evento deve rolar no celular.');
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('Rolagem do evento conferida em desktop e celular, com descrição longa e botão acessível.');
    events = [{ ...fixture, seats: 1, registrationCount: 0 }];
    await navigate('inscricao.html?id=evt-browser');
    await until('document.getElementById("registrationForm")');
    await evaluate('document.querySelector("[name=name]").value = "Participante teste"; document.getElementById("registrationForm").requestSubmit()');
    await until('location.pathname.endsWith("/comprovante.php")');
    const receiptLocation = await evaluate('location.href');
    await until('document.querySelector(".receipt-data")');
    await send('Emulation.setDeviceMetricsOverride', {width:1280,height:1000,deviceScaleFactor:1,mobile:false});
    await pause(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    const receiptShot = await send('Page.captureScreenshot', {format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(), 'ideau-receipt-redesign.png'), Buffer.from(receiptShot.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', {width:375,height:850,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Comprovante não deve transbordar no celular.');
    assert.equal(await evaluate('document.querySelector(".cancel-registration summary").textContent'), 'Cancelar minha inscrição');
    await send('Emulation.clearDeviceMetricsOverride');
    events[0].registrationCount = 1;
    await navigate('inscricao.html?id=evt-browser');
    await until('document.getElementById("registrationForm")');
    assert.match(await evaluate('document.body.textContent'), /Vagas esgotadas/);
    await evaluate('document.querySelector("[name=name]").value = "Participante teste"; document.getElementById("registrationForm").requestSubmit()');
    await until('document.querySelector("[data-registration-notice]")');
    assert.match(await evaluate('document.querySelector("[data-registration-notice]").textContent'), /Você já está inscrito neste evento/);
    assert.equal(await evaluate('location.pathname.endsWith("/inscricao.html")'), true);
    assert.equal(await evaluate('document.querySelector("[name=name]").value'), 'Participante teste');
    assert.equal(await evaluate('document.querySelector("#registrationForm button[type=submit]").disabled'), false);
    assert.equal(await evaluate('document.activeElement.hasAttribute("data-registration-notice")'), true);
    assert.equal(await evaluate('document.querySelector("[data-registration-notice] a").href'), receiptLocation);
    assert.equal(receiptSubmissions, 2);
    events = [];
    await navigate('inscricao.html?id=evt-browser');
    await until('document.querySelector("[data-registration-receipts] a")');
    assert.equal(await evaluate('document.querySelector("[data-registration-receipts] a").href'), receiptLocation);
    assert.match(await evaluate('document.body.textContent'), /encerradas ou indisponíveis/);
    await evaluate('document.querySelector("[data-registration-receipts] a").click()');
    await until('location.pathname.endsWith("/comprovante.php")');
    console.log('Comprovante conferido: primeira inscrição abre comprovante; repetição mostra aviso sem redirecionar, inclusive com vagas esgotadas.');
    await navigate('consultar-inscricao.php');
    await until('document.getElementById("consultaEmail")');
    await send('Emulation.setDeviceMetricsOverride', {width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await pause(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.match(await evaluate('document.body.textContent'), /Receber link por e-mail/);
    await evaluate('document.querySelector(".consult-submit").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'consultaEmail');
    const lookupShot = await send('Page.captureScreenshot', {format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(), 'ideau-consulta-preview.png'), Buffer.from(lookupShot.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', {width:375,height:850,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Consulta deve caber no celular.');
    await evaluate('document.querySelector(".consult-submit").scrollIntoView({block:"center",behavior:"instant"})');
    assert.equal(await evaluate('document.querySelector(".consult-submit").getBoundingClientRect().bottom <= innerHeight'), true);
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('Consulta por e-mail conferida em desktop e celular, com formulário e navegação acessíveis.');
    events=[{...fixture,registrationEndAt:'2000-01-01T12:00:00.000Z',published:true}];
    await navigate('evento.html?id=evt-browser');
    await until('document.querySelector(".evento-actions button")?.textContent.includes("Inscrições encerradas")');
    assert.match(await evaluate('document.body.textContent'), /Evento de teste/);
    await navigate('inscricao.html?id=evt-browser');
    await until('document.querySelector("#registrationRoot")?.textContent.includes("O prazo de inscrição")');
    assert.equal(await evaluate('!!document.getElementById("registrationForm")'),false);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("#registrationRoot a")).some(a=>a.getAttribute("href")==="consultar-inscricao.php")'),true);
    console.log('Prazo conferido: evento continua visível, inscrições fechadas e consulta de comprovante acessível.');
    events = [
      {...fixture, title:'Semana acadêmica', registrationCount:42},
      {...fixture, id:'evt-history', title:'Encontro de inverno', registrationCount:18, closed:true, published:false},
      {...fixture, id:'evt-scheduled', title:'Oficina de tecnologia', publicationMode:'automatic', published:false},
      {...fixture, id:'evt-draft', title:'Feira de profissões', publicationMode:'draft', published:false}
    ];
    registrations = [];
    await navigate('dashboard.html');
    await until('document.querySelectorAll(".metric-card").length === 10');
    assert.equal(await evaluate('!!document.getElementById("dashboardEvents") && !!document.getElementById("dashboardRegistrations")'), true);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#dashboardRegistrationChart .chart-bar-label strong"), n=>n.textContent)'), ['42','18']);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#dashboardStatusChart .chart-legend strong"), n=>n.textContent)'), ['1','1','1','1']);
    assert.equal(await evaluate('document.querySelector("[data-metric=active]").textContent'), '60');
    assert.equal(await evaluate('document.querySelector("[data-metric=cancelled]").textContent'), '2');
    assert.equal(await evaluate('document.querySelectorAll("#dashboardEventTable tr").length'), 4);
    assert.equal(await evaluate('document.querySelectorAll(".timeline-point").length'), 2);
    assert.match(await evaluate('document.querySelector("#dashboardOccupancyChart").textContent'), /Sem limite/);
    assert.match(await evaluate('document.querySelector(".chart-bar-link").getAttribute("href")'), /relatorios.html\?event=evt-browser/);
    await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate('scrollTo(0,0)');await pause(150);
    const chartShot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(),'ideau-dashboard-charts.png'),Buffer.from(chartShot.data,'base64'));
    await evaluate('window.toggleTheme();document.querySelector(".dashboard-charts").scrollIntoView({block:"start",behavior:"instant"})');
    await pause(150);
    const darkChartShot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(),'ideau-dashboard-dark-charts.png'),Buffer.from(darkChartShot.data,'base64'));
    await evaluate('document.getElementById("dashboardChartScope").value="history"; document.getElementById("dashboardFilters").requestSubmit()');
    await until('document.querySelector("[data-metric=events]")?.textContent === "1"');
    assert.equal(await evaluate('document.querySelector("#dashboardRegistrationChart .chart-bar-label strong").textContent'), '18');
    await evaluate('document.getElementById("dashboardFilters").reset()');
    await until('document.querySelector("[data-metric=events]")?.textContent === "4"');
    await evaluate('document.getElementById("dashboardPeriod").value="custom";document.getElementById("dashboardPeriod").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("dashboardCustomDates").hidden'),false);
    assert.equal(await evaluate('document.getElementById("dashboardFilters").checkValidity()'),false);
    await evaluate('document.getElementById("dashboardFilters").reset()');
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:850,deviceScaleFactor:1,mobile:true});
    await pause(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'Dashboard deve caber no celular.');
    assert.equal(await evaluate('document.querySelector(".dashboard-table-scroll").scrollWidth > document.querySelector(".dashboard-table-scroll").clientWidth'),true,'Tabela tem rolagem própria.');
    await evaluate('document.getElementById("dashboardMetrics").scrollIntoView({block:"start",behavior:"instant"})');
    const mobileShot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(),'ideau-dashboard-mobile.png'),Buffer.from(mobileShot.data,'base64'));
    events=[];
    await navigate('dashboard.html');
    await until('document.getElementById("dashboardStatusChart")?.textContent.includes("Nenhum evento")');
    assert.equal(await evaluate('document.querySelectorAll(".chart-donut svg").length'),0,'Sem dados não inventar gráfico.');
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('Dashboard conferido: indicadores, sete gráficos, filtros, tabela, atalhos, listas preservadas, vazio e celular.');

    const privateToken='b'.repeat(64);
    events=[{...fixture,id:'evt-history',title:'Evento anterior'}, {...fixture,id:'evt-private',title:'Encontro reservado de Direito',accessMode:'link',listed:false,targetCourse:'Direito',recipientMode:'course',allowedParticipants:[],accessToken:privateToken,fields:{cpf:true,course:true,community:false}}];
    registrations=[{eventId:'evt-history',name:'Aluna conhecida',cpf:'12345678901',course:'Direito',createdAt:'2026-09-27T12:00:00Z'},{eventId:'evt-history',name:'Aluno de outro curso',cpf:'98765432100',course:'Enfermagem',createdAt:'2026-09-27T12:00:00Z'}];
    await navigate('evento-form.html?id=evt-private');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
    await advanceToStep(2);
    assert.equal(await evaluate('document.getElementById("eventAccessMode").value'),'link');
    await clickChoiceArrow('eventTargetCourse');
    assert.equal(await evaluate('document.getElementById("eventTargetCourseSuggestions").hidden'),false);
    await clickChoiceArrow('eventTargetCourse');
    assert.equal(await evaluate('document.getElementById("eventTargetCourseSuggestions").hidden'),true);
    assert.equal(await evaluate('document.getElementById("eventListed").checked'),false);
    assert.equal(await evaluate('document.querySelector("input[name=accessMode]:checked").value'),'link');
    await evaluate('document.querySelector("input[name=accessMode][value=public]").click()');
    assert.equal(await evaluate('document.getElementById("eventLinkAccessOptions").hidden'),true);
    await evaluate('document.querySelector("input[name=accessMode][value=link]").click()');
    assert.equal(await evaluate('document.getElementById("eventLinkAccessOptions").hidden'),false);
    assert.equal(await evaluate('document.querySelector("input[name=recipientMode]:checked").value'),"course");
    assert.equal(await evaluate('document.getElementById("eventAllowedParticipants")'),null);
    await evaluate('document.querySelector("input[name=recipientMode][value=manual]").click(); document.getElementById("eventListed").checked=true;document.getElementById("eventListed").dispatchEvent(new Event("change",{bubbles:true}));');
    assert.equal(await evaluate('document.getElementById("eventRecipientMode").value'),"manual");
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Page.reload');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
    assert.equal(await evaluate('document.getElementById("eventRecipientMode").value'),'manual');
    assert.equal(await evaluate('document.querySelector("input[name=recipientMode]:checked").value'),"manual");
    assert.equal(await evaluate('document.querySelector("input[name=accessMode]:checked").value'),'link');
    assert.equal(await evaluate('document.getElementById("eventListed").checked'),true);
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'2');
    await saveThroughSteps();
    await until('location.pathname.endsWith("/eventos.html")');
    await until('document.getElementById("adminEventsTable")?.textContent.includes("Privado")');
    const savedPrivate=events.find(e=>e.id==='evt-private');
    assert.equal(savedPrivate.targetCourse,'Direito');
    assert.equal(savedPrivate.recipientMode,'manual');
    assert.equal(savedPrivate.allowedParticipants,undefined);
    assert.match(await evaluate('document.getElementById("adminEventsTable").textContent'),/Privado · divulgação pública/);
    await evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{window.copiedPrivateLink=text;}}});document.querySelector("[data-copy-link=evt-private]").click();');
    assert.match(await evaluate('window.copiedPrivateLink'),new RegExp('evento.html\\?id=evt-private#acesso='+privateToken+'$'));
    await navigate('evento.html?id=evt-private');
    await until('document.querySelector(".evento-info-wrap")');
    assert.match(await evaluate('document.body.textContent'),/Encontro reservado de Direito/);
    assert.doesNotMatch(await evaluate('document.getElementById("eventDetailRoot").innerHTML'),/12345678901|Aluna conhecida/);
    await navigate('inscricao.html?id=evt-private');
    await until('document.body.textContent.includes("Inscrição por link de acesso")');
    assert.equal(await evaluate('document.getElementById("registrationForm")'),null);
    await navigate('evento.html?id=evt-private#acesso='+privateToken);
    await until('document.querySelector(".btn-inscricao[href]")');
    assert.match(await evaluate('document.querySelector(".btn-inscricao").getAttribute("href")'),new RegExp('#acesso='+privateToken+'$'));
    await evaluate('document.querySelector(".btn-inscricao").click()');
    await until('document.getElementById("registrationForm")');
    assert.deepEqual(await evaluate('[...document.getElementById("courseSelect").options].map(o=>o.value)'),['','Direito']);
    assert.ok(await evaluate('document.getElementById("sidebarEventLink").hash.startsWith("#acesso=")'));
    receiptSubmissions=0;receiptList=[];
    await evaluate('document.querySelector("[name=name]").value="Aluna conhecida";document.querySelector("[name=cpf]").value="12345678901";document.getElementById("courseSelect").value="Direito";document.querySelector("#registrationForm button[type=submit]").click();');
    await until('location.pathname.endsWith("/comprovante.php")');
    assert.match(await evaluate('document.body.textContent'),/Aguardando aprovação/);
    assert.equal(await evaluate('document.querySelector("a[href*=download]")'),null);
    assert.equal(lastRegistration.accessToken,privateToken);
    assert.equal(lastRegistration.course,'Direito');
    await navigate('inscricao.html?id=evt-private#acesso='+privateToken);
    await until('document.getElementById("registrationForm")');
    assert.match(await evaluate('document.querySelector("[data-registration-receipts]").textContent'),/Aguardando aprovação/);
    await evaluate('document.querySelector("[name=name]").value="Aluna conhecida";document.querySelector("[name=cpf]").value="12345678901";document.getElementById("courseSelect").value="Direito";document.querySelector("#registrationForm button[type=submit]").click();');
    await until('document.querySelector("[data-registration-notice]")');
    assert.match(await evaluate('document.querySelector("[data-registration-notice]").textContent'),/Aguarde a aprovação/);
    assert.doesNotMatch(await evaluate('document.querySelector("[data-registration-notice]").textContent'),/continua confirmada/);
    savedPrivate.listed=false;
    await navigate('../index.php');
    await until('document.querySelector(".event-card")');
    assert.doesNotMatch(await evaluate('document.body.textContent'),/Encontro reservado de Direito/);
    await navigate('evento.html?id=evt-private');
    await until('document.body.textContent.includes("Evento indisponível")');
    await navigate('evento.html?id=evt-private#acesso='+privateToken);
    await until('document.querySelector(".evento-info-wrap")');
    assert.match(await evaluate('document.body.textContent'),/Encontro reservado de Direito/);
    console.log('Evento privado: edição, aprovação manual, recuperação, cópia do link, divulgação pública, ocultação e inscrição com token conferidos.');
    registrations=[
      {id:'reg-review-a',eventId:'evt-private',name:'Aluno pendente A',cpf:'12345678901',course:'Direito',reviewStatus:'pending',createdAt:'2026-09-30T12:00:00Z'},
      {id:'reg-review-b',eventId:'evt-private',name:'Aluno pendente B',cpf:'98765432100',course:'Direito',reviewStatus:'pending',createdAt:'2026-09-30T12:01:00Z'}
    ];
    await navigate('relatorios.html?event=evt-private');
    await until('document.querySelectorAll("[data-decision=approve]").length===2');
    assert.match(await evaluate('document.getElementById("reportReviewSummary").textContent'),/2 aguardando/);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await evaluate('document.getElementById("reportSelectedTitle").scrollIntoView({behavior:"instant"})');
    if(process.env.REVIEW_SCREENSHOT){
      const shot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(process.env.REVIEW_SCREENSHOT,Buffer.from(shot.data,'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');

    await evaluate('document.querySelector("[data-decision=approve]").click()');
    await until('document.querySelectorAll("[data-decision=remove]").length===1');
    assert.equal(registrations[0].reviewStatus,'approved');
    await evaluate('document.getElementById("reportReviewFilter").value="pending";document.getElementById("reportReviewFilter").dispatchEvent(new Event("change",{bubbles:true}));');
    assert.doesNotMatch(await evaluate('document.getElementById("reportRegistrationsTable").textContent'),/Aluno pendente A/);
    await evaluate('window.open=()=>({document:{write:text=>window.reviewPdf=text,close(){}},focus(){},print(){}});document.getElementById("printFilteredPdf").click()');
    await until('window.reviewPdf');
    assert.match(await evaluate('window.reviewPdf'),/Aguardando aprovação/);
    assert.doesNotMatch(await evaluate('window.reviewPdf'),/Aluno pendente A|data-review-registration/);
    await evaluate('document.querySelector("[data-decision=reject]").click()');
    await until('document.getElementById("reportRegistrationsTable").textContent.includes("Nenhum inscrito corresponde")');
    assert.equal(registrations.length,1);
    await evaluate('document.getElementById("reportReviewFilter").value="all";document.getElementById("reportReviewFilter").dispatchEvent(new Event("change",{bubbles:true}));');
    await evaluate('document.querySelector("[data-decision=remove]").click()');
    await until('document.getElementById("reportRegistrationsTable").textContent.includes("ainda não tem inscritos")');
    assert.equal(registrations.length,0);
    events.find(e=>e.id==='evt-private').recipientMode='course';
    registrations=[{id:'reg-auto',eventId:'evt-private',name:'Aluno automático',cpf:'12345678901',course:'Direito',createdAt:'2026-09-30T12:00:00Z'}];
    await navigate('relatorios.html?event=evt-private');
    await until('document.querySelector("[data-decision=remove]")');
    assert.equal(await evaluate('document.querySelector("[data-decision=approve]")'),null);
    await evaluate('document.querySelector("[data-decision=remove]").click()');
    await until('document.getElementById("reportRegistrationsTable").textContent.includes("ainda não tem inscritos")');
    assert.equal(registrations.length,0);
    console.log('Revisão conferida: pendência, comprovante bloqueado, aprovar, recusar, filtro, PDF e remover no modo automático.');
    assert.deepEqual(errors, []);
    console.log('OK no navegador: lista de erros visível sem subir ao topo, links para os campos, salvamento após correção, recuperação, menu, celular e encerramento.');
  } finally {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: -1, method: 'Browser.close' }));
      await pause(1000);
    }
    socket?.close();
    if (browser.exitCode === null) browser.kill();
    server.close();
    // Só remove o perfil temporário criado por este teste, após o navegador sair.
    await pause(500);
    if (path.dirname(profile) === os.tmpdir() && path.basename(profile).startsWith('ideau-browser-')) {
      await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
