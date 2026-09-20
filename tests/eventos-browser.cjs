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
// Renderiza o template real com dados fictícios; backend é coberto pelo teste HTTP.
const receiptTemplate = fs.readFileSync(path.join(root, 'ideau_eventos/comprovante.php'), 'utf8').split('<!DOCTYPE html>')[1];
const receiptHtml = execFileSync('php', [], { cwd: root, encoding: 'utf8', input: `<?php
$receipt = ['name'=>'Participante de teste', 'eventTitle'=>'Semana Acadêmica IDEAU', 'date'=>'23/03/2027', 'time'=>'12:12', 'location'=>'Auditório IDEAU', 'registeredAt'=>'20/09/2026 09:44', 'protocol'=>'reg-teste-123456'];
$id = str_repeat('a',64); $error = ''; $cancelled = false; $_SESSION['receipt_csrf'] = 'test';
function escapeReceipt(string $text): string { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html>` + receiptTemplate });

const lookupTemplate = fs.readFileSync(path.join(root, 'ideau_eventos/consultar-inscricao.php'), 'utf8').split('<!DOCTYPE html>')[1];
const lookupHtml = execFileSync('php', [], { cwd: root, encoding: 'utf8', input: `<?php
$error='';$message='';$email='';$verified=null;$receipts=[];$_SESSION=['consulta_csrf'=>'test'];
function consultaEscape(string $value): string {return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');}
?><!DOCTYPE html>` + lookupTemplate });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  if (url.pathname.endsWith('/PublicacaoController.php')) {
    const action = url.searchParams.get('action');
    if (action === 'session') return json({ authenticated: true, csrf: 'test', receipts: receiptList });
    if (action === 'registrations') return json(registrations);
    if (action === 'events') return json(events.filter(event => url.searchParams.get('scope') === 'admin' || (!event.closed && new Date(event.effectiveEndAt) > new Date())));
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}');
    if (action === 'register') { receiptSubmissions++; receiptList = [{ id: 'a'.repeat(64), eventId: data.eventId, name: data.name }]; return json({ success: true, alreadyRegistered: receiptSubmissions > 1, receiptUrl: 'comprovante.php?id=' + 'a'.repeat(64) }); }
    if (action === 'close') {
      events = events.map(event => event.id === data.id ? { ...event, closed: true, published: false, closedAt: new Date().toISOString(), closeReason: 'manual' } : event);
      return json(events.find(event => event.id === data.id));
    }
    if (action === 'save') {
      saves++;
      events.push({ ...data, effectiveEndAt: data.endAt || fixture.effectiveEndAt });
      return json(data);
    }
    return json({ success: true });
  }
  if (url.pathname.endsWith('/EventoController.php')) {
    const action = url.searchParams.get('action');
    return json(action === 'qtd_inscricoes_evento' ? { count: 80 } : action === 'qtdAtivos' ? 0 : []);
  }
  if (url.pathname.endsWith('/comprovante.php')) { res.setHeader('Content-Type', 'text/html'); return res.end(receiptHtml); }
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
      await send('Page.navigate', { url: origin + '/ideau_eventos/' + page });
      await until(`document.readyState === 'complete' && location.href === ${JSON.stringify(origin + '/ideau_eventos/' + page)}`);
    };

    await send('Page.navigate', { url: origin + '/index.php' });
    await until('document.querySelector("#eventsGrid .card-title")?.textContent === "Evento de teste"');
    await until('document.getElementById("statInscricoes").textContent === "1"');
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
    await evaluate('document.querySelector("#eventForm button[type=submit]").scrollIntoView({block:"end",behavior:"instant"}); document.querySelector("#eventForm button[type=submit]").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'eventFormErrors');
    assert.equal(await evaluate('(() => { const box = document.getElementById("eventFormErrors").getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight; })()'), true, 'A lista deve estar visível junto ao botão.');
    assert.ok(await evaluate('scrollY > 0'), 'Salvar com erros não deve levar ao topo.');
    assert.ok(await evaluate('document.querySelectorAll("[aria-invalid=true]").length') >= 5);
    assert.match(await evaluate('document.getElementById("eventTitleError").textContent'), /Preencha/);
    assert.equal(await evaluate('document.getElementById("eventFormErrors").hidden'), false);
    assert.equal(saves, 0, 'Formulário inválido não deve chamar o servidor.');
    await evaluate('document.querySelector("[data-error-field=eventTitle]").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'eventTitle');
    assert.equal(await evaluate('(() => { const box = document.getElementById("eventTitleError").getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight; })()'), true);
    assert.equal(await evaluate('document.querySelector(".admin-public-link").parentElement === document.getElementById("logoutButton").parentElement'), true);
    assert.equal(await evaluate(`document.querySelector('.admin-nav a[href="../index.php"]')`), null);
    await evaluate(`(() => { const f = document.getElementById('eventTitle'); f.value = 'Título preservado'; f.dispatchEvent(new Event('input', { bubbles: true })); const d = document.getElementById('eventEndAt'); d.value = '2099-12-31T20:00'; d.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.equal(await evaluate('document.getElementById("eventTitle").hasAttribute("aria-invalid")'), false);
    await send('Page.reload');
    await until('document.getElementById("eventForm")?.getAttribute("aria-busy") === "false" && document.getElementById("eventTitle").value === "Título preservado"');
    assert.equal(await evaluate('document.getElementById("eventEndAt").value'), '2099-12-31T20:00');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await send('Emulation.clearDeviceMetricsOverride');
    await evaluate(`(() => {
      for (const [id, value] of Object.entries({eventInstitution:'faculdade-ideau',eventCategory:'academico',eventDate:'2099-12-31',eventTime:'18:00'})) {
        const field = document.getElementById(id); field.value = value;
        field.dispatchEvent(new Event('input', {bubbles:true})); field.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const bytes = Uint8Array.from(atob(${JSON.stringify(fixture.cover.split(',')[1])}), c => c.charCodeAt(0));
      const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'capa.png', {type:'image/png'}));
      const file = document.getElementById('eventCoverFile'); file.files = transfer.files;
      file.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await until('document.getElementById("eventCover").value.startsWith("data:image/png")');
    await evaluate('document.querySelector("#eventForm button[type=submit]").click()');
    assert.equal(await evaluate('document.querySelectorAll("[aria-invalid=true]").length'), 1);
    assert.match(await evaluate('document.getElementById("eventFormErrors").textContent'), /Local/);
    assert.equal(await evaluate('document.activeElement.id'), 'eventFormErrors');
    await evaluate('document.querySelector("[data-error-field=eventLocation]").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'eventLocation');
    await evaluate('document.getElementById("eventLocation").value = "Auditório"; document.getElementById("eventLocation").dispatchEvent(new Event("input", {bubbles:true})); document.querySelector("#eventForm button[type=submit]").click()');
    await until('location.pathname.endsWith("/eventos.html")');
    assert.equal(saves, 1, 'Após corrigir o campo, deve salvar normalmente.');
    console.log('Validação, menu, recuperação e layout móvel conferidos.');

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
