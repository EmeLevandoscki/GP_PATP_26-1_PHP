// Exercita as funções reais com dados fictícios; não abre navegador nem acessa a rede.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
const check = (ok, label) => { console.log((ok ? 'PASSOU: ' : 'REPROVOU: ') + label); if (!ok) failures++; };
function extract(source, name) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0) throw new Error('Função não encontrada');
  const end = source.indexOf('\n  function ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}
const source = fs.readFileSync(path.join(root, 'ideau_eventos/assets/js/app.js'), 'utf8');
const context = vm.createContext({getPastaBase:()=>'',retornaDiaEvento:()=>31,retornaMesEvento:()=> 'DEZ'});
vm.runInContext(['escapeHtml','escapeAttr','eventCardTemplate'].map(name=>extract(source,name)).join('\n'), context);
const payload = '\"><img src=x onerror=alert(1)>';
context.fixture = {id:payload,titulo:payload,descricao:payload,cidade:payload,nome_local:payload,
  categoria:payload,foto_path:payload,data_inicio:'2099-12-31',valor:0};
const html = vm.runInContext('eventCardTemplate(fixture)', context);
check(!html.includes(payload) && html.includes('&lt;img'), 'Card atual escapa texto e atributos HTML');
check(html.includes('id='+encodeURIComponent(payload)), 'Card atual codifica ID na URL');

for (const file of ['src/View/Front/html/js/script.js', 'src/View/main/assets/js/script.js']) {
const legacy = fs.readFileSync(path.join(root,file),'utf8');
const start = legacy.indexOf('function renderEvents(lista)');
const end = legacy.indexOf('// Inicializar eventos',start);
if(start<0 || end<0) throw new Error('Renderer legado não encontrado');
let click, opened;
const button = {dataset:{eventName:payload},addEventListener:(name,callback)=>{if(name==='click')click=callback;}};
const grid = {innerHTML:'',querySelectorAll:()=>[button]};
const oldContext = vm.createContext({URL,document:{baseURI:'https://example.invalid/',getElementById:()=>grid},
  requestAnimationFrame:()=>{},openModal:name=>{opened=name;}});
vm.runInContext(legacy.slice(start,end),oldContext);
oldContext.fixture={img:'',titulo:payload,tag:'Teste',dia:31,mes:'DEZ',cidade:'',local:'',desc:payload};
vm.runInContext('renderEvents([fixture])',oldContext);
check(!grid.innerHTML.includes(payload) && grid.innerHTML.includes('&lt;img'), file+': escapa HTML recebido');
check(!/onclick=/.test(grid.innerHTML), file+': título não é interpolado em JavaScript');
click(); check(opened===payload, file+': clique preserva título como texto');
oldContext.fixture.img='javascript:alert(1)';
vm.runInContext('renderEvents([fixture])',oldContext);
check(!grid.innerHTML.includes('javascript:'), file+': recusa protocolo de imagem inseguro');
oldContext.fixture.img='/imagem.png';
vm.runInContext('renderEvents([fixture])',oldContext);
check(grid.innerHTML.includes('https://example.invalid/imagem.png'), file+': aceita imagem relativa');
}
console.log('Requisitos reprovados: '+failures);process.exitCode=failures?1:0;
