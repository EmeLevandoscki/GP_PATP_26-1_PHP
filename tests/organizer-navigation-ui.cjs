const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ideau_eventos/assets/js/organizer-navigation.js','utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function page({home=true,admin=false,link=false,organizerHome=false}={}) {
  const events={},docEvents={},calls=[],messages=[],writes=[];
  const node={hidden:false},sectionNode={hidden:false}; let authenticated=false,reply=null;
  const location={reloads:0,replacements:[],reload(){this.reloads++;},replace(url){this.replacements.push(url);}};
  const document={hidden:false,body:{hidden:false,dataset:{page:home?'home':'dashboard',homeAccess:organizerHome?'organizer':'participant'},classList:{contains:()=>admin}},
    currentScript:{src:'https://example.test/portal/ideau_eventos/assets/js/organizer-navigation.js'},
    querySelector:selector=>selector==='[data-organizer-panel]'&&link?node:null,querySelectorAll:selector=>selector==='[data-organizer-panel]'&&link?[node,sectionNode]:[],addEventListener:(key,fn)=>docEvents[key]=fn};
  let receive,interval;
  const context={URL,document,window:{location,addEventListener:(key,fn)=>events[key]=fn},
    BroadcastChannel:class{addEventListener(key,fn){receive=fn;}postMessage(value){messages.push(value);}},
    localStorage:{setItem:(...args)=>writes.push(args)},setInterval:fn=>interval=fn,
    fetch:async(url,options)=>{calls.push({url:String(url),options});if(reply){const pending=reply;reply=null;return pending;}return {ok:true,json:async()=>({authenticated})};}};
  vm.runInNewContext(source,context);
  return {events,docEvents,calls,messages,writes,node,sectionNode,document,location,receive:()=>receive({data:'refresh'}),interval:()=>interval(),auth:value=>authenticated=value,defer:value=>reply=value};
}
(async()=>{
  const guest=page(); guest.events.pageshow?.({persisted:false});await flush();
  assert.equal(guest.location.reloads,0);
  assert.equal(guest.document.querySelector('[data-organizer-panel]'),null);
  assert.equal(guest.calls.length,0,'Entrada publica nao depende da autenticacao.');
  guest.events.storage?.({key:'ideauEventos.organizerSessionChanged',newValue:'authenticated'});await flush();
  assert.equal(guest.location.reloads,0,'Armazenamento local nunca concede acesso.');
  guest.auth(true);guest.events.focus?.();await flush();
  assert.equal(guest.location.reloads,0,'Login nao recarrega nem modifica a entrada publica.');
  assert.equal(guest.calls.length,0);
  const home=page({link:true,organizerHome:true});home.auth(true);home.events.pageshow({persisted:false});await flush();
  assert.equal(home.calls[0].url,'https://example.test/portal/src/Controller/PublicacaoController.php?action=organizer-status');
  assert.equal(home.calls[0].options.cache,'no-store');assert.equal(home.calls[0].options.credentials,'same-origin');
  assert.equal(home.node.hidden,false);
  assert.equal(home.sectionNode.hidden,false,'Atalho junto dos eventos acompanha o menu.');
  home.auth(false);home.receive();assert.equal(home.node.hidden,true);await flush();
  assert.equal(home.node.hidden,true,'Logout em outra aba oculta o botão.');
  assert.equal(home.sectionNode.hidden,true,'Logout oculta também o atalho junto dos eventos.');
  assert.equal(home.location.replacements[0],'https://example.test/portal/ideau_eventos/login.html?retorno=organizador','Entrada do organizador retorna a rota correta apos novo login.');
  home.events['organizer-session-changed']();
  assert.equal(home.messages.length,1);assert.equal(home.writes.length,1,'Notifica outras abas sem depender de senha/token.');
  const admin=page({home:false,admin:true});admin.events.pageshow({persisted:true});
  assert.equal(admin.document.body.hidden,true,'Cache não mostra painel antes de revalidar.');await flush();
  assert.equal(admin.location.replacements[0],'https://example.test/portal/ideau_eventos/login.html');
  const valid=page({home:false,admin:true});valid.auth(true);valid.events.pageshow({persisted:true});await flush();
  assert.equal(valid.document.body.hidden,false);assert.equal(valid.location.replacements.length,0);
  const race=page({link:true,organizerHome:true});let resolve;
  race.defer(new Promise(r=>resolve=r));race.events.focus();
  race.receive();assert.equal(race.node.hidden,true);
  resolve({ok:true,json:async()=>({authenticated:true})});await flush();await flush();
  assert.equal(race.node.hidden,true,'Resposta anterior ao logout não reexibe o botão.');
  assert.equal(race.calls.length,2,'Revalida após descartar resposta antiga.');
  const background=page({link:true,organizerHome:true});background.document.hidden=true;background.receive();
  assert.equal(background.node.hidden,true);assert.equal(background.calls.length,0);
  background.document.hidden=false;background.docEvents.visibilitychange();await flush();
  assert.equal(background.calls.length,1);
  const unavailable=page({link:true,organizerHome:true});
  unavailable.defer({ok:false});unavailable.events.pageshow({persisted:false});await flush();
  assert.equal(unavailable.node.hidden,false,'Falha na consulta JS nao esconde o botao validado pelo PHP.');
  assert.equal(unavailable.document.body.hidden,false);
  assert.equal(unavailable.location.reloads,0);
  const cached=page({link:true,organizerHome:true});cached.auth(true);
  cached.events.pageshow({persisted:true});assert.equal(cached.document.body.hidden,true);await flush();
  assert.equal(cached.document.body.hidden,false);
  assert.equal(cached.node.hidden,false);
  console.log('OK: logout entre abas, sinal local sem autoridade, resposta atrasada, cache de voltar, sessão válida e subpastas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
