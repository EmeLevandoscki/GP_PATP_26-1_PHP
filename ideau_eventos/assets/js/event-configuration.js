window.EventConfiguration = (() => {
  const source = document.currentScript.src;
  let catalog = {categories:[], profiles:{}};
  let types = {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modeLabels = {presencial:'Presencial',online:'Online',hibrido:'Híbrido'};
  const roleLabels = {participante:'Participante',apresentador:'Apresentador',expositor:'Expositor',voluntario:'Voluntário'};
  const institutions = {'faculdade-ideau':'Faculdade IDEAU','escola-ideau-santa-clara':'Escola IDEAU Santa Clara'};
  const value = id => document.getElementById(id)?.value || '';
  const set = (id, v) => { const el=document.getElementById(id); if(el) el.value=v ?? ''; };
  const checked = id => Boolean(document.getElementById(id)?.checked);
  const json = id => { try { return JSON.parse(value(id)); } catch { return id === 'eventMeetings' ? [] : {}; } };
  const date = v => { const [d,t] = String(v).split('T');return `${d.split('-').reverse().join('/')} ${t || ''}`; };
  const profile = event => types[event.eventKind]?.profile || 'general';
  const typeLabel = (id, custom='') => id === 'outro' ? (custom || 'Outro') : (types[id]?.label || 'Não informado');
  const schoolTypes = new Set(['palestra','oficina','workshop','visita-tecnica','exposicao','mostra-projetos','evento-artistico','apresentacao-cultural','festival','competicao','concurso','torneio-esportivo','acao-social','campanha','mutirao','reuniao','encontro-institucional','homenagem','premiacao','formatura','cerimonia','outro']);
  const schoolForm = () => document.getElementById('eventInstitution')?.selectedOptions[0]?.dataset.type === 'escola';
  function typeOptions(selected='', emptyLabel='Selecione o tipo', school=false) {
    const groups = school ? [{label:'Atividades escolares', types:catalog.categories.flatMap(group=>group.types).filter(([id])=>schoolTypes.has(id) || id===selected)}] : catalog.categories;
    return `<option value="">${esc(emptyLabel)}</option>` + groups.map(group => `<optgroup label="${esc(group.label)}">${group.types.map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${esc(label)}</option>`).join('')}</optgroup>`).join('') + `<option value="outro" ${selected==='outro'?'selected':''}>Outro / Personalizado</option>`;
  }
  const formTypeOptions = (selected='', emptyLabel='Selecione o tipo') => typeOptions(selected, emptyLabel, schoolForm());
  const ready = fetch(new URL('../data/event-types.json', source), {cache:'no-cache'})
    .then(response => { if(!response.ok) throw new Error('Não foi possível carregar os tipos de evento. Atualize a página.'); return response.json(); })
    .then(data => {
      catalog=data;
      types=Object.fromEntries(data.categories.flatMap(group=>group.types.map(([id,label,p])=>[id,{label,profile:p,category:group.id}])));
      types.outro={label:'Outro / Personalizado',profile:'general',category:'outros'};
    });
  // Evita rejeição sem tratador antes do DOMContentLoaded; o cadastro ainda exige ready.
  ready.catch(()=>{});

  function prepareForm(event={}) {
    const select=document.getElementById('eventKind');
    if(!select) return;
    select.innerHTML=typeOptions(event.eventKind || '', event.id ? 'Não informado (evento anterior)' : 'Selecione o tipo');
    select.required=!event.id;
    set('eventKind',event.eventKind || '');set('eventCustomKind',event.customEventKind || '');
    set('eventModality',event.modality || 'presencial');
    for(const [id,key] of [['eventRoom','room'],['eventAddress','address'],['eventPlatform','platform'],['eventOnlineUrl','accessUrl'],['eventOnlineInstructions','instructions']]) set(id,event.delivery?.[key] || '');
    document.getElementById('eventParticipationChoice').checked=Boolean(event.delivery?.allowChoice);
    for(const [id,key] of [['eventAllowPresenter','allowPresenter'],['eventAllowExhibitor','allowExhibitor'],['eventAllowVolunteer','allowVolunteer']]) document.getElementById(id).checked=Boolean(event.registrationOptions?.[key]);
    set('eventSpecific',JSON.stringify(event.specific || {}));set('eventMeetings',JSON.stringify(event.meetings || []));
  }

  function initForm() {
    const root=document.getElementById('eventSpecificFields'), meetings=document.getElementById('meetingEditor');
    if(!root) return;
    const fieldsState=document.getElementById('eventSpecific'), meetingState=document.getElementById('eventMeetings');
    const changed=el=>el.dispatchEvent(new Event('input',{bubbles:true}));
    function syncSpecific() {
      const data=json('eventSpecific');
      root.querySelectorAll('[data-specific]').forEach(el=>{data[el.dataset.specific]=el.type==='number' && el.value!==''?Number(el.value):el.value;});
      fieldsState.value=JSON.stringify(data);
    }
    function specific() {
      const p=profile({eventKind:value('eventKind')}), schema=catalog.profiles[p];
      const data=json('eventSpecific');
      document.getElementById('eventSpecificTitle').textContent=schema.label;
      root.innerHTML=schema.fields.map(([key,label,type])=>`<label class="form-field ${type==='textarea'?'wide':''}"><span>${esc(label)} (opcional)</span>${type==='textarea'?`<textarea id="specific-${key}" data-specific="${key}" rows="3" maxlength="8000">${esc(data[key])}</textarea>`:`<input id="specific-${key}" data-specific="${key}" type="${type}" value="${esc(data[key])}" ${type==='number'?'min="0" max="10000" step="0.01"':type==='datetime-local'?'max="9999-12-31T23:59"':'maxlength="255"'}>`}</label>`).join('');
      for(const [key,group] of [['Presenter','scientific'],['Exhibitor','fair'],['Volunteer','community']]) {
        const control=document.getElementById('eventAllow'+key);control.disabled=p!==group;control.closest('label').hidden=p!==group;
      }
      document.getElementById('eventCustomKindField').hidden=value('eventKind')!=='outro';
      document.getElementById('eventCustomKind').required=value('eventKind')==='outro';
      document.getElementById('eventCustomKind').disabled=value('eventKind')!=='outro';
      document.getElementById('eventProfileHint').textContent=p==='competition'?'Inscrição individual. Equipes, resultados e classificação automática ficam para uma próxima etapa.':p==='scientific'?'Os papéis de participante e apresentador identificam a inscrição. Submissão e avaliação de trabalhos ainda não estão disponíveis.':p==='meeting'?'A agenda é informativa. Não há reserva de horários individuais.':p==='ceremony'?'A inscrição registra a confirmação de participação. Convites e acompanhantes não possuem gerenciamento separado.':'Os campos são opcionais. A estrutura simples ou múltipla permanece uma escolha independente.';
    }
    function institutionTypes(changed=false) {
      const select=document.getElementById('eventKind');
      let selected=select.value;
      // Existing records/drafts retain their type; an explicit institution change refreshes the choices.
      if(changed && schoolForm() && !schoolTypes.has(selected)) selected='';
      select.innerHTML=formTypeOptions(selected,select.required?'Selecione o tipo':'Não informado (evento anterior)');
      select.value=selected;
      document.getElementById('eventTitle').placeholder=schoolForm()?'Ex.: Feira de Ciências do Ensino Fundamental':'Ex.: Semana Acadêmica de Direito';
      specific();
    }
    function delivery() {
      const mode=value('eventModality'), physical=mode!=='online', online=mode!=='presencial';
      for(const id of ['eventLocation','eventCity','eventRoom','eventAddress']) {
        const input=document.getElementById(id);input.disabled=!physical;input.closest('label').hidden=!physical;
      }
      document.getElementById('eventLocation').required=physical;
      document.getElementById('eventOnlineFields').hidden=!online;
      for(const id of ['eventPlatform','eventOnlineUrl','eventOnlineInstructions']) document.getElementById(id).disabled=!online;
      document.getElementById('eventPlatform').required=online;
      document.getElementById('eventParticipationChoiceField').hidden=mode!=='hibrido';
      document.getElementById('eventParticipationChoice').disabled=mode!=='hibrido';
    }
    function syncMeetings() {
      meetingState.value=JSON.stringify([...meetings.querySelectorAll('[data-meeting]')].map(row=>Object.fromEntries([...row.querySelectorAll('[data-meeting-field]')].map(el=>[el.dataset.meetingField,el.value]))));
    }
    function renderMeetings() {
      meetings.innerHTML=json('eventMeetings').map((m,i)=>`<article class="activity-card" data-meeting><h3>Encontro ${i+1}</h3><div class="form-grid">${[['title','Título','text'],['startAt','Início (Brasília)','datetime-local'],['endAt','Término (Brasília)','datetime-local'],['location','Local / plataforma','text']].map(([key,label,type])=>`<label class="form-field"><span>${label}${key==='location'?'':' *'}</span><input id="meeting-${i}-${key}" data-meeting-field="${key}" type="${type}" value="${esc(m[key])}" ${key!=='location'?'required':''} ${type==='text'?`maxlength="${key==='title'?200:255}"`:'max="9999-12-31T23:59"'}></label>`).join('')}</div><button class="btn btn-danger small" type="button" data-remove-meeting="${i}">Remover encontro</button></article>`).join('');
    }
    root.addEventListener('input',syncSpecific);root.addEventListener('change',syncSpecific);
    document.getElementById('eventKind').addEventListener('change',()=>{
      syncSpecific();specific();
      if(!value('eventCategory')) { const group=catalog.categories.find(c=>c.id===types[value('eventKind')]?.category);set('eventCategory',schoolForm()?'Pedagógico':group?.label || 'Outro'); }
      changed(fieldsState);
    });
    document.getElementById('eventModality').addEventListener('change',delivery);
    document.getElementById('eventInstitution').addEventListener('change',()=>{syncSpecific();institutionTypes(true);changed(fieldsState);});
    meetings.addEventListener('input',syncMeetings);meetings.addEventListener('change',syncMeetings);
    meetings.addEventListener('click',event=>{
      const button=event.target.closest('[data-remove-meeting]');if(!button)return;
      syncMeetings();const data=json('eventMeetings');data.splice(Number(button.dataset.removeMeeting),1);meetingState.value=JSON.stringify(data);renderMeetings();changed(meetingState);
    });
    document.getElementById('addMeeting').addEventListener('click',()=>{
      syncMeetings();const data=json('eventMeetings');if(data.length>=100)return;
      data.push({title:'',startAt:'',endAt:'',location:''});meetingState.value=JSON.stringify(data);renderMeetings();meetings.lastElementChild.querySelector('input').focus();changed(meetingState);
    });
    institutionTypes();delivery();renderMeetings();
  }

  function formData() {
    return {eventKind:value('eventKind'),customEventKind:value('eventCustomKind'),modality:value('eventModality'),
      delivery:{room:value('eventRoom'),address:value('eventAddress'),platform:value('eventPlatform'),accessUrl:value('eventOnlineUrl'),instructions:value('eventOnlineInstructions'),allowChoice:checked('eventParticipationChoice')},
      specific:json('eventSpecific'),meetings:json('eventMeetings'),registrationOptions:{allowPresenter:checked('eventAllowPresenter'),allowExhibitor:checked('eventAllowExhibitor'),allowVolunteer:checked('eventAllowVolunteer')}};
  }

  function details(event) {
    const d=event.delivery || {},schema=catalog.profiles[profile(event)];
    const fields=(schema?.fields || []).filter(([key])=>event.specific?.[key]!==undefined && event.specific[key]!=='');
    return `<section class="event-configuration"><div class="event-facts"><span>${esc(event.eventKindLabel || typeLabel(event.eventKind,event.customEventKind))}</span><span>${esc(modeLabels[event.modality || 'presencial'])}</span></div>
      ${d.room?`<p><strong>Sala / auditório:</strong> ${esc(d.room)}</p>`:''}${d.address?`<p><strong>Endereço:</strong> ${esc(d.address)}</p>`:''}
      ${d.platform?`<p><strong>Plataforma:</strong> ${esc(d.platform)}</p><p>O acesso online será disponibilizado no comprovante dos inscritos aprovados.</p>`:''}
      ${fields.length?`<h2>${esc(schema.label)}</h2><dl class="event-specific-details">${fields.map(([key,label,type])=>`<div><dt>${esc(label)}</dt><dd>${esc(type==='datetime-local'?date(event.specific[key]):event.specific[key])}</dd></div>`).join('')}</dl>`:''}
      ${event.meetings?.length?`<h2>Cronograma de encontros</h2><p>Uma inscrição abrange estes encontros. Horários de Brasília.</p><ol class="event-meetings">${event.meetings.map(m=>`<li><strong>${esc(m.title)}</strong><p>${esc(date(m.startAt))} até ${esc(date(m.endAt))}<br>${esc(m.location)}</p></li>`).join('')}</ol>`:''}</section>`;
  }

  function cardGuide(event) {
    const descriptions = {
      talk:'Apresentação sobre o tema do evento, conduzida pelo palestrante ou responsável.',
      course:'Formação orientada por um instrutor. Confira os pré-requisitos e materiais antes de participar.',
      program:'Programação com diferentes momentos. Confira os horários de cada atividade na página do evento.',
      visit:'Visita ao local informado pelo organizador. Confira ponto de saída, horários de ida e retorno e transporte.',
      competition:'Participação individual nas etapas da competição. Leia as regras antes de se inscrever.',
      scientific:'Encontro para acompanhar pesquisas e apresentações de trabalhos.',
      fair:'Visitação a projetos, exposições ou estandes, conforme a programação divulgada.',
      ceremony:'Cerimônia ou encontro institucional. Confira as orientações de participação e convites.',
      meeting:'Encontro com pauta e horários definidos. Consulte a agenda na página do evento.',
      community:'Atividade com a comunidade. Confira as orientações e os materiais necessários.',
      general:'Confira a proposta e a programação na página do evento antes de se inscrever.'
    };
    const modern = String(event.id || '').startsWith('evt-');
    let signup = 'Abra “Ver evento” e preencha o formulário de inscrição.';
    if (event.eventType === 'multiple') {
      signup += ' Escolha as atividades de que deseja participar; cada uma tem vagas e horários próprios. Não é possível escolher horários sobrepostos.';
    } else if (event.meetings?.length) {
      signup += ` Uma inscrição abrange os ${event.meetings.length} encontro(s) do cronograma.`;
    } else if (modern) signup += ' A inscrição é única para este evento.';
    if (event.institutionType === 'escola' || event.audience === 'escola' || event.institution === 'escola-ideau-santa-clara') {
      signup += ' O responsável informa seus dados e os do educando.';
    }
    if (event.accessMode === 'link') signup += ' Para se inscrever, use o link de acesso enviado pelo organizador.';
    const roles = [['allowPresenter','apresentador'],['allowExhibitor','expositor'],['allowVolunteer','voluntário']]
      .filter(([key]) => event.registrationOptions?.[key]).map(([,label]) => label);
    if (roles.length) signup += ` No formulário, você também pode escolher participar como ${roles.join(' ou ')}.`;
    const participation = event.modality === 'online'
      ? 'Participação pela internet. Após a aprovação da inscrição, consulte as orientações de acesso no comprovante.'
      : event.modality === 'hibrido'
        ? (event.delivery?.allowChoice ? 'Escolha no formulário se vai participar presencialmente ou online.' : 'O evento tem participação presencial e online. Confira com o organizador como será o acesso.')
        : 'Compareça ao local na data e no horário informados no evento.';
    // Só campos públicos; nunca expõe URL ou instruções de acesso reservadas aos inscritos.
    const guidance = ['prerequisites','materials','guidance','rules','transport']
      .filter(key => event.specific?.[key])
      .map(key => [({prerequisites:'Pré-requisitos',materials:'Materiais',guidance:'Orientações',rules:'Regras',transport:'Transporte'})[key],event.specific[key]]);
    return `<section class="card-guide" aria-label="Como funciona este evento"><h4>Como funciona</h4>
      <p>${esc(descriptions[profile(event)] || descriptions.general)}</p>
      <dl><div><dt>Inscrição</dt><dd>${esc(signup)}</dd></div><div><dt>Participação</dt><dd>${esc(participation)}</dd></div></dl>
      ${guidance.length ? `<details><summary>Orientações do organizador</summary>${guidance.map(([label,text])=>`<p><strong>${esc(label)}:</strong> ${esc(text)}</p>`).join('')}</details>` : ''}
      ${event.demoDataset || String(event.id || '').startsWith('evt-demo-') ? '<p class="card-demo-note">Demonstração: evento e programação fictícios. Use dados fictícios ao testar a inscrição.</p>' : ''}
    </section>`;
  }

  function registration(event) {
    const roles=[['participante',profile(event)==='fair'?'Visitante / participante':'Participante']];
    for(const [key,role] of [['allowPresenter','apresentador'],['allowExhibitor','expositor'],['allowVolunteer','voluntario']]) if(event.registrationOptions?.[key]) roles.push([role,roleLabels[role]]);
    return `${event.modality==='hibrido' && event.delivery?.allowChoice?'<label class="form-field"><span>Forma de participação *</span><select name="participationMode" required><option value="">Selecione</option><option value="presencial">Presencial</option><option value="online">Online</option></select></label>':''}
      ${roles.length>1?`<label class="form-field"><span>Participação no evento *</span><select name="eventRole" required>${roles.map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join('')}</select></label>`:''}`;
  }

  function status(event, now=Date.now()) {
    if(event.registrationClosed || event.closed || (event.registrationEndAt && new Date(event.registrationEndAt).getTime()<=now)) return 'closed';
    if((Number(event.seats)>0 && Number(event.registrationCount || event.inscritos || 0)>=Number(event.seats)) || (event.eventType==='multiple' && event.activities?.length && event.activities.every(a=>Number(a.remaining)<=0))) return 'full';
    return 'open';
  }
  function matches(event, filters, now=Date.now()) {
    if(filters.kind && (event.eventKind || 'unspecified')!==filters.kind) return false;
    if(filters.modality && (event.modality || 'presencial')!==filters.modality)return false;
    if(filters.institution && (event.institution || 'unspecified')!==filters.institution)return false;
    const start=(event.date || event.data_inicio || '').slice(0,10);
    const end=[start,(event.data_fim || '').slice(0,10),...(event.meetings || []).map(m=>m.endAt.slice(0,10)),...(event.activities || []).map(a=>a.endAt.slice(0,10))].sort().at(-1);
    if(filters.from && filters.to && filters.from>filters.to)return false;
    if(filters.from && (!end || end<filters.from))return false;
    if(filters.to && (!start || start>filters.to))return false;
    return !filters.status || status(event,now)===filters.status;
  }
  function initFilters(render) {
    const root=document.getElementById('eventPublicFilters');if(!root)return;
    const toggle=document.getElementById('toggleEventFilters');
    const updateToggle=()=>{
      const active=[...root.querySelectorAll('input,select')].filter(el=>el.value).length;
      if(toggle) toggle.textContent=active ? `Filtros (${active})` : 'Filtros';
    };
    toggle?.addEventListener('click',()=>{
      root.hidden=!root.hidden;
      toggle.setAttribute('aria-expanded',String(!root.hidden));
    });
    document.getElementById('eventKindFilter').innerHTML=typeOptions('','Todos os tipos')+'<option value="unspecified">Tipo não informado</option>';
    root.addEventListener('change',()=>{updateToggle();render();});
    document.getElementById('clearEventFilters').addEventListener('click',()=>{
      root.querySelectorAll('input,select').forEach(el=>el.value='');set('searchInput','');set('categoryFilter','todos');updateToggle();render();
    });
    updateToggle();
  }
  function filters() { return {kind:value('eventKindFilter'),modality:value('eventModalityFilter'),institution:value('eventInstitutionFilter'),from:value('eventDateFrom'),to:value('eventDateTo'),status:value('eventStatusFilter')}; }
  return {ready,prepareForm,initForm,formData,details,cardGuide,registration,typeOptions,formTypeOptions,typeLabel,modeLabels,roleLabels,institutions,matches,status,initFilters,filters};
})();
