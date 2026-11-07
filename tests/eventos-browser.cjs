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
const publicationActions = [];
const coverRequests = [];
let testAuthenticated = true;
// Renderiza o template real com dados fictícios; backend é coberto pelo teste HTTP.
const receiptTemplate = fs.readFileSync(path.join(root, 'ideau_eventos/comprovante.php'), 'utf8').split('<!DOCTYPE html>')[1];
const renderReceiptHtml = reviewStatus => execFileSync('php', [], { cwd: root, env: {...process.env, TEST_REVIEW_STATUS: reviewStatus}, encoding: 'utf8', input: `<?php
$receipt = ['name'=>'Participante de teste', 'eventTitle'=>'Semana Acadêmica IDEAU', 'date'=>'23/03/2027', 'time'=>'12:12', 'location'=>'Auditório IDEAU', 'registeredAt'=>'20/09/2026 09:44', 'protocol'=>'reg-teste-123456','reviewStatus'=>getenv('TEST_REVIEW_STATUS') ?: 'approved'];
$id = str_repeat('a',64); $error = ''; $cancelled = false; $_SESSION['receipt_csrf'] = 'test';
function escapeReceipt(string $text): string { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html>` + receiptTemplate });

const receiptHtml = renderReceiptHtml('approved');
const pendingReceiptHtml = renderReceiptHtml('pending');
const homeHtml = execFileSync('php', [], {cwd:root, encoding:'utf8', input:`<?php
$mostrarBotaoPainel = false; $homePrefix = ''; $_SERVER['SCRIPT_NAME'] = '/index.php';
require 'src/View/Front/html/home.php';
`});
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
  if (url.pathname.endsWith('/CapaController.php')) {
    coverRequests.push(url.href);
    res.setHeader('Content-Type','image/png');
    return res.end(Buffer.from(fixture.cover.split(',')[1], 'base64'));
  }
  if (url.pathname === '/index.php') { res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end(homeHtml); }
  if (url.pathname.endsWith('/PublicacaoController.php')) {
    const action = url.searchParams.get('action');
    publicationActions.push(action);
    if (action === 'session') return json({ authenticated: testAuthenticated, csrf: 'test', receipts: receiptList });
    if (action === 'organizer-status') return json({authenticated:testAuthenticated});
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
    if (action === 'register-organizer') {
      lastRegistration=data;
      const selected=events.find(event=>event.id===data.eventId);
      registrations.push({...data,id:'reg-organizer-'+registrations.length,isOrganizer:true,organizerAccount:'organizer@example.test',
        email:'organizer@example.test',reviewStatus:'approved',audience:selected.audience,createdAt:new Date().toISOString(),
        activities:(selected.activities||[]).filter(a=>data.activityIds.includes(a.id))});
      selected.registrationCount++;
      return json({success:true,message:'Inscrição confirmada como organizador.'});
    }
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
    if (action === 'cancel-activity') {
      const activity = registrations.find(r=>r.id===data.id && r.eventId===data.eventId)?.activities.find(a=>a.id===data.activityId);
      if (activity) activity.cancelledAt = new Date().toISOString();
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
  res.end(path.extname(file) === '.php' ? fs.readFileSync(file, 'utf8').replace(/<\?(?:php|=)[\s\S]*?\?>/g, '') : fs.readFileSync(file));
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

    if (process.argv.includes('--school-form')) {
      events=[{...fixture,eventKind:'palestra'}];
      await navigate('evento-form.php?id=evt-browser');
      await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
      await evaluate(`document.getElementById('eventInstitution').value='escola-ideau-santa-clara'; document.getElementById('eventInstitution').dispatchEvent(new Event('change',{bubbles:true}))`);
      assert.equal(await evaluate('document.getElementById("schoolFieldsGroup").hidden'),false);
      assert.equal(await evaluate('document.getElementById("graduationFieldsGroup").hidden'),true);
      assert.equal(await evaluate('document.getElementById("fieldCpf").disabled'),true);
      assert.equal(await evaluate('document.getElementById("fieldCourse").checked'),false);
      assert.equal(await evaluate('document.getElementById("fieldStudentClass").checked'),true);
      const choices=await evaluate(`JSON.stringify(['eventAudienceOptions','eventCategoryOptions','eventKind'].map(id=>Array.from(document.getElementById(id).options,o=>o.text)))`);
      assert.match(choices,/Ensino Fundamental.*1º ao 5º/);
      assert.doesNotMatch(choices,/Graduação|Faculdade|egressos|TCC|Congresso|Semana acadêmica/);
      for (const width of [1440,390,320]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
      }
      await evaluate(`document.getElementById('eventKind').value='oficina'; document.getElementById('eventKind').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('eventAudience').value='Ensino Fundamental — anos iniciais (1º ao 5º ano)'; document.getElementById('eventAudience').dispatchEvent(new Event('input',{bubbles:true}));`);
      await send('Page.reload');
      await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
      assert.match(await evaluate('document.getElementById("eventAudience").value'),/anos iniciais/);
      assert.equal(await evaluate('document.getElementById("eventKind").value'),'oficina');
      await evaluate(`document.getElementById('eventType').value='multiple'; document.getElementById('eventType').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('addActivity').click()`);
      assert.doesNotMatch(await evaluate('document.getElementById("activity-0-type").textContent'),/TCC|Congresso/);
      await evaluate(`document.querySelector('[data-remove-activity]').click(); document.getElementById('eventType').value='simple'; document.getElementById('eventType').dispatchEvent(new Event('change',{bubbles:true}));`);
      await evaluate(`document.getElementById('eventInstitution').value='faculdade-ideau'; document.getElementById('eventInstitution').dispatchEvent(new Event('change',{bubbles:true}));`);
      assert.match(await evaluate('document.getElementById("eventKind").textContent'),/Congresso/);
      assert.equal(await evaluate('document.getElementById("eventAudience").value'),'Faculdade / Graduação');
      await evaluate(`document.getElementById('eventInstitution').value='escola-ideau-santa-clara'; document.getElementById('eventInstitution').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('eventAudience').value='Ensino Fundamental — anos iniciais (1º ao 5º ano)'; document.getElementById('eventCategory').value='Pedagógico';`);
      for(let step=0;step<3;step++) {
        await evaluate('document.getElementById("eventStepNext").click()');
        await until(`!document.getElementById('eventStepHeading${step+1}').closest('section').hidden`);
      }
      await evaluate('document.querySelector("#eventForm button[type=submit]").click()');
      await until('location.pathname.endsWith("/eventos.php")');
      const schoolEvent=events.find(e=>e.id==='evt-browser');
      assert.equal(schoolEvent.audience,'escola');
      assert.equal(schoolEvent.institutionType,'escola');
      assert.equal(schoolEvent.fields.course,false);
      assert.equal(schoolEvent.fields.responsibleName,true);
      assert.equal(schoolEvent.fields.studentName,true);
      assert.equal(schoolEvent.fields.studentClass,true);
      await navigate('inscricao.html?id=evt-browser');
      await until('document.querySelector("[name=studentName]")');
      assert.ok(await evaluate('!!document.querySelector("[name=responsibleName]") && !!document.querySelector("[name=studentClass]")'));
      assert.equal(await evaluate('!!document.querySelector("select[name=course]")'),false);
      assert.match(await evaluate('document.querySelector("[name=studentClass]").textContent'),/4º Ano.*5º Ano.*9º Ano/);
      assert.deepEqual(errors,[]);
      console.log('OK escola: sugestões isoladas, ensino fundamental, atividades, rascunho, troca de instituição, salvamento e inscrição do educando.');
      return;
    }

    if (process.argv.includes('--event-help')) {
      events = [{...fixture, eventKind:'palestra'}];
      await navigate('evento-form.php?id=evt-browser');
      await until('document.getElementById("eventTitle")?.value === "Evento de teste" && !document.getElementById("eventStepNext").disabled');
      await send('Emulation.setTouchEmulationEnabled',{enabled:true});
      for (const width of [1440,390,320]) {
        await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<500});
        for (const theme of ['light','dark']) {
          await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
          await evaluate(`document.getElementById('eventType').closest('label').querySelector('.event-help-trigger').scrollIntoView({block:'center'})`);
          await pause(600);
          const point = await evaluate(`(() => {const r=document.getElementById('eventType').closest('label').querySelector('.event-help-trigger').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
          await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
          await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          await until('!document.getElementById("eventFieldHelp").hidden');
          assert.ok(await evaluate('document.getElementById("eventFieldHelp").textContent.includes("múltiplas atividades")'));
          assert.equal(await evaluate(`(() => {const r=document.getElementById('eventFieldHelp').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight;})()`),true);
          assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
          assert.equal(await evaluate('document.getElementById("eventFieldHelp").hidden'),true);
          assert.equal(await evaluate('document.activeElement.getAttribute("aria-expanded")'),'false');
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
          await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
          assert.equal(await evaluate('document.getElementById("eventFieldHelp").hidden'),false);
          await evaluate('document.getElementById("eventTitle").click()');
          assert.equal(await evaluate('document.getElementById("eventFieldHelp").hidden'),true);
        }
      }
      await evaluate(`document.getElementById('eventKind').value='curso'; document.getElementById('eventKind').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('eventType').value='multiple'; document.getElementById('eventType').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('eventStepNext').click()`);
      await until('!document.getElementById("eventStepHeading1").closest("section").hidden');
      await until('document.getElementById("specific-prerequisites").closest("label").querySelector(".event-help-trigger")');
      await evaluate('document.getElementById("addMeeting").click(); document.getElementById("addActivity").click()');
      await until('document.getElementById("activity-0-seats")?.closest("label").querySelector(".event-help-trigger")');
      assert.ok(await evaluate('document.getElementById("meeting-0-title").closest("label").querySelector(".event-help-trigger") !== null'));
      await evaluate(`document.getElementById('activity-0-seats').closest('label').querySelector('.event-help-trigger').click(); document.querySelector('[data-remove-activity]').click()`);
      await until('document.getElementById("eventFieldHelp").hidden');
      // Help on checkboxes must not toggle the option or submit the form.
      await evaluate(`document.querySelector('[data-event-step="1"]').hidden=true; document.querySelector('[data-event-step="2"]').hidden=false`);
      const checked = await evaluate('document.getElementById("fieldCpf").checked');
      await evaluate('document.getElementById("fieldCpf").closest("label").querySelector(".event-help-trigger").click()');
      assert.equal(await evaluate('document.getElementById("fieldCpf").checked'),checked);
      await evaluate(`document.querySelector('[data-event-step="2"]').hidden=true; document.querySelector('[data-event-step="0"]').hidden=false; document.getElementById('eventType').scrollIntoView({block:'center'})`);
      await pause(600);
      await evaluate(`document.getElementById('eventType').closest('label').querySelector('.event-help-trigger').click()`);
      assert.equal(await evaluate('document.getElementById("eventFieldHelp").hidden'),false);
      const screenshot = await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(os.tmpdir(),'ideau-event-help.png'),Buffer.from(screenshot.data,'base64'));
      assert.equal(saves,0);
      assert.deepEqual(errors,[]);
      console.log('OK ajuda: celular/desktop, temas, teclado, fechamento, campos dinâmicos e formulário sem envio acidental.');
      return;
    }

    if (process.argv.includes('--light-covers')) {
      const cover = '/src/Controller/CapaController.php?id=evt-browser&w=640&v=test';
      events = [{...fixture, cover, eventKind:'palestra'}];
      publicationActions.length = 0;
      testAuthenticated = false;
      await navigate('login.html');
      await until('document.getElementById("loginForm")');
      await pause(300);
      assert.ok(!publicationActions.includes('events'), 'Login não deve baixar a lista de eventos.');
      testAuthenticated = true;
      await navigate('/index.php');
      await until('document.querySelector("#eventsGrid .event-card img")');
      assert.equal(await evaluate('document.querySelector("#eventsGrid .event-card img").getAttribute("loading")'), 'lazy');
      assert.equal(await evaluate('document.querySelector("#eventsGrid .event-card img").getAttribute("src")'), cover);
      await evaluate('document.querySelector("#eventsGrid .event-card img").scrollIntoView()');
      await until('document.querySelector("#eventsGrid .event-card img").naturalWidth > 0');
      assert.ok(coverRequests.length > 0, 'Capa deve ser carregada em requisição separada.');
      await navigate('evento.html?id=evt-browser');
      await until('document.querySelector(".evento-cover img")?.naturalWidth > 0');
      await navigate('evento-form.php?id=evt-browser');
      await until('document.getElementById("eventCover")?.value === ' + JSON.stringify(cover));
      await until('document.getElementById("eventCoverPreview")?.naturalWidth > 0');
      assert.deepEqual(errors, []);
      console.log('OK navegador: login leve, capas por URL, carregamento sob demanda, detalhes e prévia na edição.');
      return;
    }

    if (process.argv.includes('--event-layout')) {
      events=[{...fixture,eventType:'multiple',eventKind:'semana-academica',summary:'Programação com palestras e oficinas.',description:'Informações completas do evento.',specific:{responsible:'Equipe IDEAU',program:'Abertura, oficina e minicurso.'},activities:[1,2,3].map(n=>({id:'act-'+n,name:'Atividade '+n,type:'palestra',startAt:`2099-12-31T${17+n}:00`,endAt:`2099-12-31T${18+n}:00`,location:'Auditório',speaker:'Equipe IDEAU',hours:1,seats:30,remaining:20,description:'Descrição da atividade.'}))}];
      await navigate('evento.html?id=evt-browser');
      await until('document.querySelectorAll(".evento-program .activity-card").length===3');
      for (const width of [1440,850,390,320]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Sem rolagem horizontal em '+width);
        const bounds=await evaluate('[...document.querySelectorAll(".evento-program .activity-card")].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top}})');
        if (width===1440) assert.equal(bounds[0].top,bounds[2].top,'Três atividades lado a lado');
        if (width===850) assert.equal(bounds[0].top,bounds[1].top,'Duas atividades no tablet');
        if (width<500) assert.ok(bounds[1].top>bounds[0].top,'Atividades empilhadas no celular');
        assert.equal(await evaluate('document.querySelector(".evento-actions").getBoundingClientRect().bottom < document.querySelector(".evento-program").getBoundingClientRect().top'),true,'Inscrição antes da lista de atividades');
      }
      assert.match(await evaluate('document.querySelector(".btn-inscricao").getAttribute("href")'),/inscricao.html\?id=evt-browser/);
      await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');
      await until('window.scrollY>0');
      assert.deepEqual(errors,[]);
      console.log('OK navegador: programação em 3/2/1 colunas, inscrição próxima da capa, rolagem e conteúdo preservados em 1440/850/390/320.');
      return;
    }

    if (process.argv.includes('--event-cards')) {
      events=[{...fixture,id:'evt-demo-guide',eventKind:'semana-academica',eventType:'multiple',modality:'hibrido',delivery:{allowChoice:true},institutionType:'escola',specific:{guidance:'Traga seu material de demonstração.'}},
        {...fixture,id:'evt-course-guide',title:'Curso com três encontros',eventKind:'minicurso',modality:'online',meetings:[1,2,3].map(n=>({title:'Encontro '+n,startAt:`2100-01-0${n}T18:00`,endAt:`2100-01-0${n}T20:00`}))}];
      await navigate('/index.php');
      await until('document.querySelectorAll("#eventsGrid [data-event-guide]").length===2');
      assert.equal(await evaluate('document.querySelectorAll("#eventsGrid .card-guide, #destaque .card-guide").length'),0,'Explicação não aumenta os cards');
      assert.equal(await evaluate('document.querySelectorAll("#destaque [data-event-guide]").length'),1);
      for (const width of [320,390,1440]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
        const height=await evaluate('document.querySelector("#eventsGrid .event-card").getBoundingClientRect().height');
        await evaluate('document.querySelector("#eventsGrid [data-event-guide]").focus();document.querySelector("#eventsGrid [data-event-guide]").click()');
        assert.equal(await evaluate('document.getElementById("eventGuideDialog").open'),true);
        const text=await evaluate('document.getElementById("eventGuideContent").textContent');
        assert.match(text,/horários sobrepostos/);assert.match(text,/responsável/);assert.match(text,/Escolha no formulário/);
        assert.equal(await evaluate('(()=>{const e=document.getElementById("eventGuideDialog"),r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight && e.scrollWidth<=e.clientWidth+1})()'),true,'Janela deve caber na tela de '+width);
        await evaluate('document.querySelector("#eventGuideContent summary").click()');
        assert.equal(await evaluate('document.querySelector("#eventGuideContent details").open'),true);
        await evaluate('document.getElementById("closeEventGuide").click()');
        assert.equal(await evaluate('document.getElementById("eventGuideDialog").open'),false);
        assert.equal(await evaluate('document.querySelector("#eventsGrid .event-card").getBoundingClientRect().height'),height,'Apresentação não altera tamanho dos cards');
        assert.equal(await evaluate('document.activeElement.hasAttribute("data-event-guide")'),true,'Foco retorna ao botão');
      }
      await evaluate('document.querySelectorAll("#eventsGrid [data-event-guide]")[1].click()');
      const courseText=await evaluate('document.getElementById("eventGuideContent").textContent');
      assert.match(courseText,/3 encontro\(s\)/);assert.match(courseText,/pela internet/);
      assert.equal(await evaluate('document.getElementById("eventGuideTitle").textContent'),'Curso com três encontros');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await until('!document.getElementById("eventGuideDialog").open');
      const href=await evaluate('document.querySelector("#eventsGrid .card-btn").getAttribute("href")');
      assert.match(href,/\/ideau_eventos\/evento.html\?id=evt-demo-guide$/);
      assert.deepEqual(errors,[]);
      console.log('OK navegador: cards compactos, explicações em janela, conteúdo por evento, foco, Escape e larguras 320/390/1440.');
      return;
    }

    if (process.argv.includes('--organizer-registration')) {
      events=[{...fixture,fields:{cpf:true},registrationCount:0}];
      registrations=[];
      await navigate('eventos.php');
      await until('document.querySelector("[data-register-organizer]")');
      await evaluate('document.getElementById("organizerRegistrationDialog").dataset.organizerEmail="organizer@example.test";document.querySelector("[data-register-organizer]").click()');
      assert.equal(await evaluate('document.getElementById("organizerRegistrationDialog").open'),true);
      for (const width of [320,390,1440]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:700,deviceScaleFactor:1,mobile:width<800});
        assert.equal(await evaluate('(() => {const r=document.getElementById("organizerRegistrationDialog").getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight;})()'),true,'Formulario cabe na tela');
      }
      await evaluate('document.querySelector("#organizerRegistrationForm [name=name]").value="Organizadora Teste";document.querySelector("#organizerRegistrationForm [name=cpf]").value="12345678909";document.getElementById("organizerRegistrationForm").requestSubmit()');
      await until('!document.getElementById("organizerRegistrationDialog").open && !document.querySelector("[data-register-organizer]")');
      assert.equal(lastRegistration.name,'Organizadora Teste');
      assert.equal(lastRegistration.isOrganizer,undefined,'Cliente nao atribui o selo');
      assert.equal(lastRegistration.email,undefined,'Cliente nao escolhe conta');
      assert.equal(registrations.length,1);
      await navigate('relatorios.php?event=evt-browser');
      await until('document.querySelector("#reportRegistrationsTable .organizer-badge")');
      assert.equal(await evaluate('document.querySelector("#reportRegistrationsTable .organizer-badge").textContent'),'Organizador');
      await evaluate('window.open=()=>({document:{write:html=>window.organizerReportHtml=html,close(){}},focus(){},print(){}});document.getElementById("printFilteredPdf").click()');
      assert.match(await evaluate('window.organizerReportHtml'),/Organizador/);
      assert.match(await evaluate('window.organizerReportHtml'),/Organizadora Teste/);
      await navigate('inscritos.php');
      await until('document.querySelector("#registrationsTable .organizer-badge")');
      assert.equal(await evaluate('document.querySelector("#registrationsTable .organizer-badge").textContent'),'Organizador');
      const activity={id:'act-self',name:'Oficina',type:'oficina',startAt:'2099-12-31T18:00',endAt:'2099-12-31T19:00',seats:5,remaining:5,hours:1};
      events=[{...fixture,id:'evt-self-multi',institution:'escola-ideau-santa-clara',institutionType:'escola',audience:'escola',
        eventType:'multiple',activities:[activity],modality:'hibrido',delivery:{allowChoice:true},registrationCount:0}];
      registrations=[];
      await navigate('eventos.php');
      await until('document.querySelector("[data-register-organizer]")');
      await evaluate('document.querySelector("[data-register-organizer]").click()');
      assert.equal(await evaluate('document.querySelector("#organizerRegistrationForm [type=submit]").disabled'),true,'Atividades obrigatorias');
      assert.equal(await evaluate('document.querySelector("#organizerRegistrationForm [name=studentName]") === null'),true,'Nao pede educando ao organizador');
      await evaluate('document.querySelector("#organizerRegistrationForm [name=name]").value="Professor Teste";document.querySelector("#organizerRegistrationForm [name=participationMode]").value="online";document.querySelector("#organizerRegistrationForm [name=activityIds]").click();document.getElementById("organizerRegistrationForm").requestSubmit()');
      await until('!document.getElementById("organizerRegistrationDialog").open && !document.querySelector("[data-register-organizer]")');
      assert.deepEqual(lastRegistration.activityIds,['act-self']);
      assert.equal(lastRegistration.participationMode,'online');
      await navigate('relatorios.php?event=evt-self-multi');
      await until('document.querySelector("#reportRegistrationsTable .organizer-badge")');
      assert.match(await evaluate('document.getElementById("reportRegistrationsTable").textContent'),/Professor Teste/);
      assert.deepEqual(errors,[]);
      console.log('OK navegador: autoincricao, selo nas duas listas e PDF, sem repeticao, escola, atividades, modalidade e formulario em celular/desktop.');
      return;
    }

    if (process.argv.includes('--registration-scroll')) {
      events=[{...fixture,title:'Palestra: inovação e carreira — demonstração',eventKind:'palestra',modality:'presencial',
        specific:{speaker:'Equipe de demonstração',topic:'Tecnologia e oportunidades profissionais',hours:2},
        fields:{cpf:true,phone:true,course:true,community:true,email:true,notes:true}}];
      for (const size of [{width:1440,height:650},{width:1920,height:900},{width:390,height:700}]) {
        await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<800});
        await navigate('inscricao.html?id=evt-browser');
        await until('document.querySelector("#registrationForm button[type=submit]")');
        await evaluate('window.scrollTo({top:0,behavior:"instant"})');
        await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:size.width/2,y:size.height-80,deltaY:500,deltaX:0});
        await pause(300);
        assert.ok(await evaluate('scrollY > 0'),'Inscricao deve rolar com o mouse em '+size.width+'px');
        await evaluate('document.querySelector("#registrationForm button[type=submit]").scrollIntoView({block:"center",behavior:"instant"})');
        assert.equal(await evaluate('(() => {const r=document.querySelector("#registrationForm button[type=submit]").getBoundingClientRect();return r.top>=document.querySelector(".site-header").getBoundingClientRect().bottom && r.bottom<=innerHeight;})()'),true,'Botao final acessivel');
        await evaluate('window.scrollTo({top:0,behavior:"instant"})');
        assert.equal(await evaluate('document.querySelector(".inscricao-info h1").getBoundingClientRect().top >= document.querySelector(".site-header").getBoundingClientRect().bottom'),true,'Titulo nao fica cortado pelo cabecalho');
        if (size.width<800) {
          await evaluate('document.getElementById("menuToggle").click();document.getElementById("sidebarClose").click()');
          await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:100,y:300,deltaY:400,deltaX:0});
          await pause(300);
          assert.ok(await evaluate('scrollY > 0'),'Fechar menu restaura a rolagem');
        }
      }
      console.log('OK: inscricao rola no desktop e celular, titulo visivel, botao final acessivel e menu libera rolagem.');
      return;
    }

    // Cliques reais no menu mobile: detecta handlers duplicados e sobreposições.
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    const clickMenuElement = async (selector, overlay = false) => {
      const point = await evaluate('(() => { const r=document.querySelector(' + JSON.stringify(selector) + ').getBoundingClientRect(); return {x:r.x+' + (overlay ? '10' : 'r.width/2') + ',y:r.y+' + (overlay ? '400' : 'r.height/2') + '}; })()');
      await send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
      await send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
      await pause(400);
    };
    // Menu administrativo: toques reais, foco e mudança entre celular e desktop.
    const checkMenuLayout = async label => {
      const layout = await evaluate(`(() => {
        const sidebar = document.querySelector('.admin-sidebar');
        const nav = sidebar.querySelector('.admin-nav');
        const bounds = sidebar.getBoundingClientRect();
        const links = [...nav.querySelectorAll('a')].map(a => {
          const r = a.getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,fits:a.scrollWidth<=a.clientWidth+1};
        });
        const brand = sidebar.querySelector('.admin-brand').getBoundingClientRect();
        const close = sidebar.querySelector('.admin-menu-close').getBoundingClientRect();
        const text = sidebar.querySelector('.brand-text').getBoundingClientRect();
        return {
          noHorizontalScroll:nav.scrollWidth<=nav.clientWidth+1 && sidebar.scrollWidth<=sidebar.clientWidth+1,
          stacked:links.every((r,i)=>i===0 || r.top>=links[i-1].bottom),
          linksFit:links.every(r=>r.fits && r.left>=bounds.left && r.right<=bounds.right && r.height>=44),
          brandClear:text.right<=close.left || brand.top>=close.bottom
        };
      })()`);
      assert.equal(layout.noHorizontalScroll, true, label + ': menu sem rolagem horizontal');
      assert.equal(layout.stacked, true, label + ': links devem ficar um abaixo do outro');
      assert.equal(layout.linksFit, true, label + ': textos e alvos de toque cabem no painel');
      assert.equal(layout.brandClear, true, label + ': marca e botão de fechar não se sobrepõem');
    };
    for (const page of ['dashboard.php', 'eventos.php', 'evento-form.php', 'relatorios.php', 'inscritos.php', 'configuracoes.php']) {
      await navigate(page);
      await until('document.body.classList.contains("admin-nav-ready")');
      assert.equal(await evaluate('document.querySelector(".admin-sidebar").inert'), true, page);
      await clickMenuElement('.admin-menu-button');
      assert.equal(await evaluate('document.querySelector(".admin-menu-button").getAttribute("aria-expanded")'), 'true', page);
      assert.equal(await evaluate('document.querySelector(".admin-main").inert'), true);
      assert.equal(await evaluate('document.activeElement.className'), 'admin-menu-close');
      await checkMenuLayout(page);
      await clickMenuElement('.admin-menu-close');
      assert.equal(await evaluate('document.activeElement.className'), 'admin-menu-button');
      await clickMenuElement('.admin-menu-button');
      await send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,x:380,y:400});
      await send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,x:380,y:400});
      await pause(250);
      assert.equal(await evaluate('document.body.classList.contains("admin-menu-open")'), false);
      await clickMenuElement('.admin-menu-button');
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
      assert.equal(await evaluate('document.activeElement.id'), 'logoutButton', 'Shift+Tab deve permanecer no menu');
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.equal(await evaluate('document.activeElement.className'), 'admin-menu-close');
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      assert.equal(await evaluate('document.querySelector(".admin-main").inert'), false);
      assert.equal(await evaluate('document.documentElement.classList.contains("admin-menu-lock")'), false);
    }
    await clickMenuElement('.admin-menu-button');
    assert.equal(await evaluate('(() => { const a=document.querySelector(".admin-nav a[href=\\"eventos.php\\"]"); const r=a.getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("a")?.getAttribute("href"); })()'), 'eventos.php', 'O link de eventos deve receber o toque');
    await clickMenuElement('.admin-nav a[href="eventos.php"]');
    await until('location.pathname.endsWith("/eventos.php") && document.readyState === "complete"');
    assert.equal(await evaluate('document.body.classList.contains("admin-menu-open")'), false);
    await clickMenuElement('.admin-menu-button');
    await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await pause(300);
    assert.equal(await evaluate('document.querySelector(".admin-sidebar").inert'), false);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".admin-mobile-header")).display'), 'none');
    assert.equal(await evaluate('document.querySelector(".admin-main").inert'), false);
    await navigate('dashboard.php');
    await until('document.body.classList.contains("admin-nav-ready")');
    for (const size of [{width:320,height:640}, {width:390,height:844}, {width:768,height:1024}, {width:844,height:390}, {width:1050,height:740}]) {
      await send('Emulation.setDeviceMetricsOverride', {...size,deviceScaleFactor:1,mobile:true});
      await pause(300);
      await clickMenuElement('.admin-menu-button');
      for (const theme of ['light', 'dark']) {
        await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
        await checkMenuLayout(`dashboard ${size.width}px ${theme}`);
      }
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await evaluate('document.getElementById("logoutButton").scrollIntoView({block:"end"})');
      await pause(300);
      assert.equal(await evaluate('document.getElementById("logoutButton").getBoundingClientRect().bottom <= innerHeight'), true, 'Sair deve ficar acessível com rolagem');
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    }
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await pause(300);
    await clickMenuElement('.admin-menu-button');
    await evaluate('document.querySelector(".admin-sidebar").scrollTop=0');
    const menuScreenshot = path.join(os.tmpdir(), 'ideau-admin-sidebar.png');
    fs.writeFileSync(menuScreenshot, Buffer.from((await send('Page.captureScreenshot', {format:'png'})).data, 'base64'));
    console.log('Menu administrativo aprovado em seis páginas: abertura, fechamento, teclado, navegação, rolagem e desktop. Imagem: '+menuScreenshot);
    if (process.argv.includes('--admin-sidebar')) {
      assert.deepEqual(errors, []);
      return;
    }
    events=[{...fixture,id:'evt-config',eventKind:'minicurso',eventKindLabel:'Minicurso',modality:'hibrido',modalityLabel:'Híbrido',
      delivery:{platform:'Meet',allowChoice:true},specific:{instructor:'Docente',materials:'Caderno'},
      meetings:[{title:'Encontro inicial',startAt:'2099-12-31T18:00',endAt:'2099-12-31T19:00',location:'Sala A'}]}];
    await navigate('../index.php');
    await until('document.querySelectorAll("#eventsGrid .event-card").length===1');
    await evaluate('document.getElementById("eventModalityFilter").value="online";document.getElementById("eventModalityFilter").dispatchEvent(new Event("change",{bubbles:true}))');
    await until('document.querySelectorAll("#eventsGrid .event-card").length===0');
    await evaluate('document.getElementById("clearEventFilters").click()');
    await until('document.querySelectorAll("#eventsGrid .event-card").length===1');
    for(const page of ['../index.php','evento.html?id=evt-config','inscricao.html?id=evt-config','evento-form.php?id=evt-config']) {
      await navigate(page);
      await until('document.querySelector("#eventForm") ? document.querySelector("#eventForm").getAttribute("aria-busy")==="false" : document.querySelector("#eventsGrid .event-card, .event-configuration")');
      for(const width of [320,390,844]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
        for(const theme of ['dark','light']) {
          await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
          assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${page}: ${width}px, ${theme}`);
        }
      }
    }
    await evaluate('document.getElementById("eventStepNext").click();document.getElementById("specific-instructor").value="Instrutora atualizada";document.getElementById("specific-instructor").dispatchEvent(new Event("input",{bubbles:true}))');
    await send('Page.reload');
    await until('document.getElementById("specific-instructor")?.value==="Instrutora atualizada"');
    assert.equal(await evaluate('document.querySelectorAll("[data-meeting]").length'),1);
    await navigate('inscricao.html?id=evt-config');
    await until('document.querySelector("[name=participationMode]")');
    assert.equal(await evaluate('document.querySelector("[name=participationMode]").required'),true);
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('Tipos/modalidades: filtros, cronograma, rascunho, escolha híbrida e layout em 320/390/844 px nos dois temas.');
    const activities = [
      {id:'act-a',name:'Palestra A',type:'palestra',startAt:'2099-12-31T18:00',endAt:'2099-12-31T19:00',seats:1,remaining:1,registrationCount:0,hours:1,location:'Sala 1',speaker:'Docente',description:'Descrição'},
      {id:'act-b',name:'Oficina B',type:'oficina',startAt:'2099-12-31T19:00',endAt:'2099-12-31T20:00',seats:2,remaining:2,registrationCount:0,hours:1},
      {id:'act-c',name:'Conflitante C',type:'minicurso',startAt:'2099-12-31T18:30',endAt:'2099-12-31T19:30',seats:2,remaining:2,registrationCount:0,hours:1},
      {id:'act-full',name:'Esgotada',type:'outro',startAt:'2099-12-31T20:00',endAt:'2099-12-31T21:00',seats:1,remaining:0,registrationCount:1,hours:1}
    ];
    events=[{...fixture,id:'evt-multiple',eventType:'multiple',activities}];
    receiptList=[]; receiptSubmissions=0;
    await navigate('evento.html?id=evt-multiple');
    await until('document.querySelectorAll(".activity-card").length === 4');
    await navigate('inscricao.html?id=evt-multiple');
    await until('document.querySelectorAll("[name=activityIds]").length === 4');
    assert.equal(await evaluate('document.querySelector("[value=act-full]").disabled'),true);
    await evaluate('document.querySelector("[value=act-a]").click();document.querySelector("[value=act-c]").click()');
    assert.match(await evaluate('document.getElementById("activityConflict").textContent'),/conflito/);
    assert.equal(await evaluate('document.querySelector("#registrationForm [type=submit]").disabled'),true);
    await evaluate('document.querySelector("[value=act-c]").click();document.querySelector("[value=act-b]").click()');
    assert.match(await evaluate('document.getElementById("activitySelectionSummary").textContent'),/Palestra A, Oficina B/);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    await send('Emulation.clearDeviceMetricsOverride');
    await evaluate('document.querySelector("[name=name]").value="Participante atividades";document.querySelector("#registrationForm [type=submit]").click()');
    await until('location.pathname.endsWith("/comprovante.php")');
    assert.deepEqual(lastRegistration.activityIds,['act-a','act-b']);
    await navigate('evento-form.php?id=evt-multiple');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
    assert.equal(await evaluate('document.querySelectorAll("[data-activity-card]").length'),4);
    await evaluate('document.getElementById("addActivity").click();document.querySelector("[data-activity-card]:last-child [data-field=name]").value="Nova atividade";document.querySelector("[data-activity-card]:last-child [data-field=name]").dispatchEvent(new Event("input",{bubbles:true}))');
    await send('Page.reload');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
    assert.equal(await evaluate('document.querySelectorAll("[data-activity-card]").length'),5);
    assert.equal(await evaluate('document.querySelector("[data-activity-card]:last-child [data-field=name]").value'),'Nova atividade');
    await evaluate('document.querySelector("[data-remove-activity=4]").click()');
    await until('document.querySelectorAll("[data-activity-card]").length===4');
    registrations=[{id:'reg-multi',eventId:'evt-multiple',name:'Participante atividades',createdAt:'2026-10-24T12:00:00Z',activities:[{...activities[0],cancelledAt:null},{...activities[1],cancelledAt:null}]}];
    await navigate('relatorios.php?event=evt-multiple');
    await until('document.getElementById("reportActivityFilter")');
    await evaluate('document.getElementById("reportActivityFilter").value="act-c";document.getElementById("reportActivityFilter").dispatchEvent(new Event("change",{bubbles:true}))');
    assert.doesNotMatch(await evaluate('document.getElementById("reportRegistrationsTable").textContent'),/Participante atividades/);
    await evaluate('document.getElementById("reportActivityFilter").value="act-a";document.getElementById("reportActivityFilter").dispatchEvent(new Event("change",{bubbles:true}))');
    assert.match(await evaluate('document.getElementById("reportRegistrationsTable").textContent'),/Participante atividades/);
    await evaluate('document.querySelector("[data-cancel-activity=act-a]").click()');
    await until('!document.getElementById("reportRegistrationsTable").textContent.includes("Participante atividades")');
    assert.equal(registrations.length,1);
    console.log('Múltiplas atividades: programação, seleção, conflito, vagas, payload, rascunho, exclusão, filtro e cancelamento individual.');
    assert.deepEqual(errors, []);

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
    await navigate('evento-form.php');
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
      for (const [id, value] of Object.entries({eventKind:'palestra',eventInstitution:'faculdade-ideau',eventCategory:'Acadêmico',eventDate:'2099-12-31',eventTime:'18:00'})) {
        const field = document.getElementById(id); field.value = value;
        field.dispatchEvent(new Event('input', {bubbles:true})); field.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const bytes = Uint8Array.from(atob(${JSON.stringify(fixture.cover.split(',')[1])}), c => c.charCodeAt(0));
      const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'capa.png', {type:'image/png'}));
      const file = document.getElementById('eventCoverFile'); file.files = transfer.files;
      file.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await until('document.getElementById("eventCover").value.startsWith("data:image/png")');
    for (const invalidDate of ['322323-01-01', '10000-01-01', '2099-02-29', '2000-01-01']) {
      await evaluate(`(() => { const field = document.getElementById('eventDate'); field.value = ${JSON.stringify(invalidDate)}; field.dispatchEvent(new Event('input', {bubbles:true})); document.getElementById('eventStepNext').click(); })()`);
      assert.equal(await evaluate('document.getElementById("eventDate").validity.valid'), false, invalidDate);
      assert.equal(await evaluate('document.getElementById("eventFormStep").value'), '0');
      assert.equal(saves, 0, 'Data inválida não deve chegar ao servidor.');
    }
    await evaluate(`(() => { const field = document.getElementById('eventDate'); field.value = '2100-02-28'; field.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    assert.equal(await evaluate('document.getElementById("eventDate").validity.valid'), true);
    await evaluate(`(() => { const field = document.getElementById('eventDate'); field.value = '2099-12-31'; field.dispatchEvent(new Event('input', {bubbles:true})); })()`);
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
    await until('location.pathname.endsWith("/eventos.php")');
    assert.equal(saves, 1, 'Após corrigir o campo, deve salvar normalmente.');
    console.log('Validação, menu, recuperação e layout móvel conferidos.');
    const savedEvent = events.at(-1);
    assert.equal(savedEvent.category, 'academico', 'Sugestão deve manter a categoria compatível com os filtros.');
    assert.equal(savedEvent.audience, 'graduacao');
    await navigate('evento-form.php?id=' + savedEvent.id);
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
    await until('location.pathname.endsWith("/eventos.php")');
    assert.equal(saves, 2);
    assert.equal(events.at(-1).category, 'Oficina de pesquisa');
    assert.equal(events.at(-1).audienceLabel, 'Professores e egressos');
    assert.equal(events.at(-1).audience, 'graduacao');
    await navigate('evento-form.php?id=' + savedEvent.id);
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


    await navigate('eventos.php');
    await until('document.querySelector("[data-close-event]")');
    await evaluate('document.querySelector("[data-close-event]").click()');
    await until('document.getElementById("historyEventsCount").textContent === "1"');
    await evaluate('document.querySelector("[data-event-view=history]").click()');
    assert.match(await evaluate('document.getElementById("adminEventsTable").textContent'), /Retirado manualmente/);
    assert.equal(await evaluate('document.querySelector("[data-publish-event]")'), null);
    assert.ok(await evaluate(`document.querySelector('a[href*="relatorios.php?event="]') !== null`));
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
    await navigate('relatorios.php');
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
    await evaluate(`document.querySelector('.report-event-link[href="relatorios.php?event=evt-browser"]').click()`);
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
    await evaluate(`document.querySelector('#reportEventDetail a[href="relatorios.php"]').click()`);
    await until('document.querySelectorAll(".report-event-link").length === 3');
    await evaluate('document.getElementById("reportEventSearch").value = "Beta"; document.getElementById("reportEventSearch").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.equal(await evaluate('document.querySelectorAll(".report-event-link").length'), 1);
    await navigate('relatorios.php?event=evt-empty');
    await until('document.getElementById("reportRegistrationsTable")?.textContent.includes("ainda não tem inscritos")');

    // A instituição deve definir o relatório mesmo sem linhas e com público descritivo livre.
    for (const school of [false, true]) {
      for (const empty of [false, true]) {
        const id = 'report-' + (school ? 'school' : 'college') + (empty ? '-empty' : '');
        events.push({...fixture, id, institution:school?'escola-ideau-santa-clara':'faculdade-ideau', institutionType:school?'escola':'faculdade', audience:school?'graduacao':'escola', audienceLabel:school?'Egressos':'Famílias', registrationCount:empty?0:1});
        if (!empty) registrations.push({eventId:id, name:'Participante da faculdade', cpf:'11122233344', studentName:'Educando da escola', responsibleName:'Responsável da escola', responsibleCpf:'55566677788', relationship:'Mãe', studentClass:'Turma escolar', course:'Curso da faculdade', createdAt:'2026-09-27T12:00:00Z'});
        await navigate('relatorios.php?event=' + id);
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
    await navigate('relatorios.php?event=inexistente');
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
    await navigate('dashboard.php');
    await until('document.querySelectorAll(".metric-card").length === 10');
    assert.equal(await evaluate('!!document.getElementById("dashboardEvents") && !!document.getElementById("dashboardRegistrations")'), true);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#dashboardRegistrationChart .chart-bar-label strong"), n=>n.textContent)'), ['42','18']);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#dashboardStatusChart .chart-legend strong"), n=>n.textContent)'), ['1','1','1','1']);
    assert.equal(await evaluate('document.querySelector("[data-metric=active]").textContent'), '60');
    assert.equal(await evaluate('document.querySelector("[data-metric=cancelled]").textContent'), '2');
    assert.equal(await evaluate('document.querySelectorAll("#dashboardEventTable tr").length'), 4);
    assert.equal(await evaluate('document.querySelectorAll(".timeline-point").length'), 2);
    assert.match(await evaluate('document.querySelector("#dashboardOccupancyChart").textContent'), /Sem limite/);
    assert.match(await evaluate('document.querySelector(".chart-bar-link").getAttribute("href")'), /relatorios.php\?event=evt-browser/);
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
    await navigate('dashboard.php');
    await until('document.getElementById("dashboardStatusChart")?.textContent.includes("Nenhum evento")');
    assert.equal(await evaluate('document.querySelectorAll(".chart-donut svg").length'),0,'Sem dados não inventar gráfico.');
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('Dashboard conferido: indicadores, sete gráficos, filtros, tabela, atalhos, listas preservadas, vazio e celular.');

    const privateToken='b'.repeat(64);
    events=[{...fixture,id:'evt-history',title:'Evento anterior'}, {...fixture,id:'evt-private',title:'Encontro reservado de Direito',accessMode:'link',listed:false,targetCourse:'Direito',recipientMode:'course',allowedParticipants:[],accessToken:privateToken,fields:{cpf:true,course:true,community:false}}];
    registrations=[{eventId:'evt-history',name:'Aluna conhecida',cpf:'12345678901',course:'Direito',createdAt:'2026-09-27T12:00:00Z'},{eventId:'evt-history',name:'Aluno de outro curso',cpf:'98765432100',course:'Enfermagem',createdAt:'2026-09-27T12:00:00Z'}];
    await navigate('evento-form.php?id=evt-private');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy")==="false"');
    await advanceToStep(3);
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
    assert.equal(await evaluate('document.getElementById("eventFormStep").value'),'3');
    await saveThroughSteps();
    await until('location.pathname.endsWith("/eventos.php")');
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
    await navigate('relatorios.php?event=evt-private');
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
    await navigate('relatorios.php?event=evt-private');
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
