const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'ideau_eventos/assets/data/event-types.json'),'utf8'));
const nodes=new Map();
function node(id) {
  if(!nodes.has(id)) nodes.set(id,{id,value:'',checked:false,disabled:false,hidden:false,required:false,innerHTML:'',textContent:'',listeners:{},label:{hidden:false},children:[],
    addEventListener(type,fn){this.listeners[type]=fn;},dispatchEvent(event){this.listeners[event.type]?.(event);},
    closest(){return this.label;},querySelectorAll(){return this.children;},append(){}});
  return nodes.get(id);
}
const document={currentScript:{src:'https://example.test/sub/ideau_eventos/assets/js/event-configuration.js'},getElementById:node};
let requested;
const context={window:{},document,URL,Event,Option:function(){},fetch:async url=>{requested=url.href;return {ok:true,json:async()=>catalog};}};
vm.runInNewContext(fs.readFileSync(path.join(root,'ideau_eventos/assets/js/event-configuration.js'),'utf8'),context);
(async()=>{
 const c=context.window.EventConfiguration;await c.ready;
 assert.equal(requested,'https://example.test/sub/ideau_eventos/assets/data/event-types.json');
 assert.equal((c.typeOptions().match(/<optgroup/g)||[]).length,5);
 assert.equal((c.typeOptions().match(/<option /g)||[]).length,58);
 assert.equal(c.typeLabel('semana-academica'),'Semana acadêmica');
 assert.equal(c.typeLabel('outro','Encontro próprio'),'Encontro próprio');
 c.prepareForm({});c.initForm();assert.equal(node('eventKind').required,true);
 assert.equal(node('eventLocation').required,true);assert.equal(node('eventOnlineFields').hidden,true);
 node('eventModality').value='online';node('eventModality').dispatchEvent(new Event('change'));
 assert.equal(node('eventLocation').disabled,true);assert.equal(node('eventPlatform').required,true);
 node('eventModality').value='hibrido';node('eventModality').dispatchEvent(new Event('change'));
 assert.equal(node('eventLocation').disabled,false);assert.equal(node('eventParticipationChoiceField').hidden,false);
 node('eventKind').value='outro';node('eventKind').dispatchEvent(new Event('change'));
 assert.equal(node('eventCustomKind').required,true);assert.equal(node('eventCustomKindField').hidden,false);
 node('eventKind').value='mostra-cientifica';node('eventKind').dispatchEvent(new Event('change'));
 assert.equal(node('eventAllowPresenter').disabled,false);assert.equal(node('eventAllowExhibitor').disabled,true);
 node('eventKind').value='visita-tecnica';node('eventKind').dispatchEvent(new Event('change'));
 assert.match(node('eventSpecificFields').innerHTML,/specific-departureAt/);assert.doesNotMatch(node('eventSpecificFields').innerHTML,/specific-instructor/);
 // Campos dinâmicos alimentam o estado que o mecanismo de rascunho existente persiste.
 node('eventSpecificFields').children=[{dataset:{specific:'transport'},type:'text',value:'Ônibus'}];
 node('eventSpecificFields').dispatchEvent(new Event('input'));assert.equal(c.formData().specific.transport,'Ônibus');
 c.prepareForm({id:'old'});assert.equal(node('eventKind').required,false);
 const event={eventKind:'minicurso',modality:'online',institution:'faculdade-ideau',date:'2099-12-20',seats:2,registrationCount:1,
   delivery:{platform:'Meet',accessUrl:'PRIVATE_LINK',instructions:'PRIVATE_INSTRUCTIONS'},specific:{instructor:'<script>alert(1)</script>'},
   meetings:[{title:'Encontro final',startAt:'2100-01-03T18:00',endAt:'2100-01-03T19:00',location:'<Sala>'}]};
 assert.equal(c.matches(event,{kind:'minicurso',modality:'online',institution:'faculdade-ideau',from:'2100-01-01',to:'2100-01-05',status:'open'}),true);
 for(const filter of [{kind:'palestra'},{modality:'presencial'},{institution:'escola-ideau-santa-clara'},{from:'2100-02-01'},{to:'2099-12-01'},{from:'2100-02-01',to:'2099-01-01'},{status:'closed'}]) assert.equal(c.matches(event,filter),false);
 assert.equal(c.matches({data_inicio:'2099-01-01',data_fim:'2099-01-03'},{kind:'unspecified',modality:'presencial',institution:'unspecified',from:'2099-01-02'}),true);
 assert.equal(c.status({...event,registrationCount:2}),'full');
 assert.equal(c.status({...event,registrationEndAt:'2000-01-01T00:00:00Z'}),'closed');
 assert.equal(c.status({...event,seats:-1,eventType:'multiple',activities:[{remaining:0}]}),'full');
 assert.equal(c.status({...event,seats:-1,eventType:'multiple',activities:[{remaining:1}]}),'open');
 const html=c.details(event);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/PRIVATE_|<script>/);assert.match(html,/Encontro final/);
 const guide=c.cardGuide({...event,id:'evt-guide',meetings:[...event.meetings,...event.meetings,...event.meetings],specific:{materials:'<img src=x onerror=alert(1)>'}});
 assert.match(guide,/3 encontro\(s\)/);assert.match(guide,/Participação pela internet/);assert.match(guide,/&lt;img/);assert.doesNotMatch(guide,/PRIVATE_|<img/);
 const multipleGuide=c.cardGuide({id:'evt-demo-guide',eventKind:'semana-academica',eventType:'multiple',institutionType:'escola',modality:'hibrido',delivery:{allowChoice:true}});
 assert.match(multipleGuide,/horários sobrepostos/);assert.match(multipleGuide,/responsável informa seus dados/);assert.match(multipleGuide,/Escolha no formulário/);assert.match(multipleGuide,/Demonstração/);
 assert.doesNotMatch(c.cardGuide({id:'17'}),/inscrição é única|Demonstração/);
 assert.match(c.cardGuide({eventKind:'visita-tecnica'}),/ida e retorno/);
 assert.match(c.cardGuide({eventKind:'mostra-cientifica',registrationOptions:{allowPresenter:true}}),/como apresentador/);
 const hybrid={modality:'hibrido',delivery:{allowChoice:true},eventKind:'mostra-cientifica',registrationOptions:{allowPresenter:true}};
 assert.match(c.registration(hybrid),/name="participationMode" required/);assert.match(c.registration(hybrid),/value="apresentador"/);
 assert.doesNotMatch(c.registration({...hybrid,delivery:{allowChoice:false}}),/name="participationMode"/);
 assert.doesNotMatch(c.registration({}),/name="eventRole"/);
 const form=fs.readFileSync(path.join(root,'ideau_eventos/evento-form.php'),'utf8');
 const ids=[...form.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'IDs únicos no cadastro');
 assert.deepEqual([...form.matchAll(/data-event-step="(\d)"/g)].map(m=>m[1]),['0','1','2','3']);
 console.log('OK: catálogo em subpasta, campos condicionais, rascunho dinâmico, filtros combinados/datas/vagas/legados, privacidade, escape e quatro etapas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
