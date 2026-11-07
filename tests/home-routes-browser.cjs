// Rotas PHP reais e login real; somente dados de eventos sao simulados, sem usar o banco.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn, execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const browserPath = process.env.TEST_BROWSER || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
].find(file => fs.existsSync(file));
assert.ok(browserPath, 'Defina TEST_BROWSER com o caminho do navegador.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-home-routes-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const hash = execFileSync('php', ['-r', "echo password_hash('home-route-test-only', PASSWORD_DEFAULT);"], {encoding:'utf8'});
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = 'http://127.0.0.1:' + port;
  const php = spawn('php', ['-d','sys_temp_dir='+temp,'-d','session.save_path='+temp,'-S','127.0.0.1:'+port], {
    cwd:root, windowsHide:true, stdio:'ignore',
    env:{...process.env, IDEAU_ORGANIZER_EMAIL:'home-test@example.test', IDEAU_ORGANIZER_PASSWORD_HASH:hash}
  });
  const browser = spawn(browserPath, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--remote-debugging-pipe','--user-data-dir='+path.join(temp,'browser'),'about:blank'], {
    windowsHide:true, stdio:['ignore','ignore','ignore','pipe','pipe']
  });
  const pending = new Map();
  let sequence = 0, buffer = '', sessionId, statusUnavailable = false, failedStatusRequests = 0;
  const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Navegador sem resposta: '+method)); }, 15000);
    pending.set(id, {resolve:value=>{clearTimeout(timer);resolve(value);}, reject:error=>{clearTimeout(timer);reject(error);}});
    browser.stdio[3].write(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})})+'\0');
  });
  const errors = [];
  const publicEvent = {
    id:'evt-navigation-test',title:'Evento para testar a navegacao',category:'academico',
    institution:'faculdade-ideau',audience:'graduacao',date:'2099-12-31',time:'18:00',
    location:'Auditorio',city:'Cidade',seats:80,registrationCount:0,fields:{email:true},
    published:true,publicationMode:'published',effectiveEndAt:'2099-12-31T23:00:00.000Z'
  };
  async function intercepted(params) {
    const url = new URL(params.request.url);
    const action = url.searchParams.get('action');
    if (url.pathname.endsWith('PublicacaoController.php') && ['session','login','logout','organizer-status'].includes(action)) {
      if (action !== 'organizer-status' || !statusUnavailable) return send('Fetch.continueRequest',{requestId:params.requestId});
      failedStatusRequests++;
      return send('Fetch.fulfillRequest',{requestId:params.requestId,responseCode:503,body:''});
    }
    const data = url.pathname.endsWith('PublicacaoController.php') && ['events','event'].includes(action)
      ? [publicEvent] : action === 'qtd_inscricoes_evento' ? {count:0} : action === 'qtdAtivos' ? 0 : [];
    return send('Fetch.fulfillRequest',{requestId:params.requestId,responseCode:200,
      responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});
  }
  browser.stdio[4].on('data', chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0,end)); buffer = buffer.slice(end+1);
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id); pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
      }
      if (message.method === 'Fetch.requestPaused') intercepted(message.params).catch(error=>errors.push(error.message));
    }
  });
  browser.stdio[3].on('error', error => { for (const task of pending.values()) task.reject(error); pending.clear(); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async expression => {
    for (let i=0; i<100; i++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error('Tempo excedido: '+expression);
  };
  const navigate = async route => {
    await send('Page.navigate',{url:origin+route});
    await until('document.readyState === "complete"');
  };
  try {
    for (let i=0; i<50; i++) { try { await fetch(origin+'/index.php'); break; } catch { await pause(100); } }
    await send('Browser.getVersion');
    const {targetId} = await send('Target.createTarget',{url:'about:blank'});
    ({sessionId} = await send('Target.attachToTarget',{targetId,flatten:true}));
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await send('Fetch.enable',{patterns:[{urlPattern:'*Controller.php*'}]});

    await navigate('/participantes/index.php');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]") === null'),true);
    assert.equal(await evaluate('document.querySelector(".organizer-context") === null'),true);
    await navigate('/organizador/index.php');
    await until('location.pathname.endsWith("/login.html") && document.getElementById("loginForm")');
    assert.equal(await evaluate('location.search'),'?retorno=organizador');
    await until('document.querySelector("#loginEmail") !== null');
    // Aguardar as chamadas iniciais de sessao antes de enviar o formulario.
    await pause(500);
    await evaluate('document.getElementById("loginEmail").value="home-test@example.test"; document.getElementById("loginPassword").value="home-route-test-only"; document.getElementById("loginForm").requestSubmit()');
    await until('location.pathname === "/organizador/index.php" && document.querySelector("[data-organizer-panel]")');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]").textContent'),'Voltar ao Painel');
    for (const homeRoute of ['/index.php','/participantes/index.php','/organizador/index.php']) {
      await navigate(homeRoute);
      await until('document.querySelector("#eventsGrid .card-btn") && document.querySelector("#destaque a.btn-primary")');
      for (const selector of ['#eventsGrid .card-btn','#eventsGrid .card-img','#destaque a.btn-primary']) {
        assert.equal(await evaluate('document.querySelector('+JSON.stringify(selector)+').href'),origin+'/ideau_eventos/evento.html?id='+publicEvent.id,'Link correto a partir de '+homeRoute);
      }
      await evaluate('document.querySelector("#eventsGrid .card-btn").click()');
      await until('location.pathname === "/ideau_eventos/evento.html" && document.querySelector(".evento-layout h1")');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".site-header")).position'),'fixed','CSS do evento carregado');
      assert.equal(await evaluate('Array.from(document.styleSheets).some(sheet=>sheet.href?.includes("/assets/css/evento.css") && sheet.cssRules.length>0)'),true,'Estilos reais disponiveis');
    }
    await navigate('/ideau_eventos/eventos.php');
    await until('document.getElementById("publicEventsQr")?.complete && document.getElementById("publicEventsQr").naturalWidth > 0');
    const participantUrl=origin+'/participantes/index.php';
    assert.equal(await evaluate('document.getElementById("publicEventsLink").value'),participantUrl);
    assert.equal(await evaluate('document.getElementById("openParticipantsPage").href'),participantUrl);
    assert.equal(await evaluate('document.getElementById("downloadPublicEventsQr").href === document.getElementById("publicEventsQr").src'),true);
    assert.equal(await evaluate('document.getElementById("downloadPublicEventsQr").download'),'ideau-eventos-participantes.png');
    assert.equal(await evaluate('document.getElementById("publicEventsLocalHint").hidden'),false);
    // Decoder independente opcional, fornecido localmente, para conferir o PNG gerado.
    if (process.env.TEST_QR_DECODER) {
      await evaluate(fs.readFileSync(process.env.TEST_QR_DECODER,'utf8'));
      const decoded=await evaluate('(() => {const img=document.getElementById("publicEventsQr"), c=document.createElement("canvas"); c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext("2d");ctx.drawImage(img,0,0);return jsQR(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height)?.data;})()');
      assert.equal(decoded,participantUrl,'QR Code decodificado abre exatamente o link publico.');
    }
    for (const width of [320,390,1440]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<800});
      await evaluate('document.getElementById("publicEventsShare").open=true;document.getElementById("publicEventsShare").scrollIntoView({block:"start"})');
      assert.equal(await evaluate('(() => { const r=document.querySelector(".public-share-popover").getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth;})()'),true,'Compartilhamento cabe em '+width+'px');
      if (process.env.HOME_ROUTES_SCREENSHOTS) {
        const file=path.join(os.tmpdir(),'ideau-share-qr-'+width+'.png');
        fs.writeFileSync(file,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
        console.log('Preview: '+file);
      }
    }
    await evaluate('document.getElementById("openParticipantsPage").click()');
    await until('location.pathname === "/participantes/index.php" && document.body?.dataset.page === "home"');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]") === null'),true,'Botao de compartilhar abre a versao publica.');
    await navigate('/participantes/index.php');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]") === null'),true,'Publica continua sem botao com sessao autenticada.');
    await navigate('/organizador/index.php');
    await until('document.querySelector("[data-organizer-panel]") && !document.body.hidden');
    assert.equal(await evaluate('document.querySelector(".brand-text small").textContent'),'Área do organizador');
    for (const theme of ['light','dark']) {
      await evaluate('document.documentElement.dataset.theme='+JSON.stringify(theme));
      for (const width of [320,390,768,1440]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<800});
      assert.equal(await evaluate('(() => { const link=document.querySelector("[data-organizer-panel]"), b=document.querySelector(".brand").getBoundingClientRect(), l=link.getBoundingClientRect(), m=document.querySelector(".menu-toggle").getBoundingClientRect(); return getComputedStyle(link).display!=="none" && b.right<=l.left && l.right<=m.left && m.right<=innerWidth; })()'),true,'Botao visivel sem sobreposicao em '+width+'px');
      assert.equal(await evaluate('(() => {const r=document.querySelector(".hero-eyebrow").getBoundingClientRect();return r.top>=document.querySelector(".site-header").getBoundingClientRect().bottom && r.left>=0 && r.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth;})()'),true,'Conteudo visivel sem sobreposicao em '+theme+' '+width+'px');
      if (process.env.HOME_ROUTES_SCREENSHOTS && [390,1440].includes(width)) {
        const file=path.join(os.tmpdir(),'ideau-organizer-'+theme+'-'+width+'.png');
        fs.writeFileSync(file,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
        console.log('Preview: '+file);
      }
      }
    }
    statusUnavailable = true;
    await navigate('/organizador/index.php');
    for (let i=0; i<50 && !failedStatusRequests; i++) await pause(100);
    assert.ok(failedStatusRequests);
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]").hidden'),false,'Erro JS nao remove botao PHP.');
    statusUnavailable = false;
    await send('Emulation.setScriptExecutionDisabled',{value:true});
    await navigate('/participantes/index.php');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]") === null'),true);
    await navigate('/organizador/index.php');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]").textContent'),'Voltar ao Painel','Funciona sem JavaScript.');
    await send('Emulation.setScriptExecutionDisabled',{value:false});
    await evaluate('document.querySelector("[data-organizer-panel]").click()');
    await until('location.pathname === "/ideau_eventos/dashboard.php" && document.querySelector(".admin-public-link")');
    await evaluate('document.querySelector(".admin-public-link").click()');
    await until('location.pathname === "/organizador/index.php" && document.querySelector("[data-organizer-panel]")');
    await evaluate('(async()=>{const api="../src/Controller/PublicacaoController.php";const state=await (await fetch(api+"?action=session")).json();await fetch(api+"?action=logout",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":state.csrf},body:"{}"});window.dispatchEvent(new Event("focus"));})()');
    await until('location.pathname.endsWith("/login.html")');
    await navigate('/participantes/index.php');
    assert.equal(await evaluate('document.querySelector("[data-organizer-panel]") === null'),true);
    assert.deepEqual(errors,[]);
    console.log('OK navegador: login retorna ao organizador, publico nunca mostra botao, botao abre painel, Visualizar site retorna, 320/390/768/1440px, sem JavaScript, falha de rede e logout.');
  } finally {
    for (const task of pending.values()) task.reject(new Error('Teste encerrado.'));
    pending.clear();
    browser.kill(); php.kill();
    await pause(700);
    if (path.dirname(temp)===os.tmpdir() && path.basename(temp).startsWith('ideau-home-routes-')) {
      fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:300});
    }
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
