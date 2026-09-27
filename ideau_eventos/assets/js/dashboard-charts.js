(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => value == null ? '—' : new Intl.NumberFormat('pt-BR', {maximumFractionDigits:1}).format(value);
  const date = value => value ? new Date(value.length === 10 ? value+'T12:00:00-03:00' : value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '—';
  const dateTime = value => value ? new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}) : '—';
  const empty = message => `<p class="empty-state">${escape(message || 'Não há inscrições nos filtros selecionados.')}</p>`;
  const report = id => `relatorios.html?event=${encodeURIComponent(id)}`;
  const groups = [
    {key:'published',label:'Publicados',color:'#48b968'}, {key:'scheduled',label:'Agendados',color:'#d9ab45'},
    {key:'draft',label:'Rascunhos',color:'#709fcb'}, {key:'closed',label:'Encerrados',color:'#9a87be'}
  ];
  const state = e => e.closed ? groups[3] : e.published ? groups[0] : ['scheduled','automatic'].includes(e.mode) ? groups[1] : groups[2];
  const put = (id, html) => { document.getElementById(id).innerHTML = html; };
  function bars(items) {
    if (!items.length || !items.some(e => e.count)) return empty();
    const max = Math.max(1,...items.map(e=>e.count));
    return '<ol class="chart-ranking">'+items.map(e=>`<li><${e.id ? `a href="${report(e.id)}"` : 'div'} class="chart-bar-link"><div class="chart-bar-label"><span>${escape(e.name)}</span><strong>${number(e.count)}</strong></div><div class="chart-bar-track" aria-hidden="true"><span style="width:${e.count/max*100}%"></span></div></${e.id?'a':'div'}></li>`).join('')+'</ol>';
  }
  function donut(items, unit='inscrições') {
    const total=items.reduce((sum,e)=>sum+e.count,0);
    if (!total) return empty(unit==='eventos' ? 'Nenhum evento neste filtro.' : undefined);
    let offset=0; const circumference=2*Math.PI*68;
    const segments=items.filter(e=>e.count).map(e=>{
      const length=e.count/total*circumference;
      const segment=`<circle cx="90" cy="90" r="68" fill="none" stroke="${e.color}" stroke-width="21" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"><title>${escape(e.label)}: ${number(e.count)}</title></circle>`;
      offset+=length; return segment;
    }).join('');
    return `<div class="chart-status-layout"><div class="chart-donut"><svg viewBox="0 0 180 180" aria-hidden="true">${segments}</svg><div class="chart-donut-total"><strong>${number(total)}</strong><span>${unit}</span></div></div><ul class="chart-legend">${items.map(e=>`<li><span class="chart-legend-dot" style="background:${e.color}" aria-hidden="true"></span><span>${escape(e.label)}</span><strong>${number(e.count)}</strong><small>${number(e.count/total*100)}%</small></li>`).join('')}</ul></div>`;
  }
  function timeline(points) {
    if (!points.some(p=>p.count)) return empty('Não há inscrições no intervalo exibido.');
    const max=Math.max(1,...points.map(p=>p.count));
    const xy=points.map((p,i)=>[48+i/Math.max(1,points.length-1)*820,190-p.count/max*155]);
    const grid=[0,.5,1].map(n=>`<line x1="48" y1="${190-n*155}" x2="868" y2="${190-n*155}" class="chart-grid-line"/><text x="38" y="${194-n*155}" text-anchor="end">${number(max*n)}</text>`).join('');
    const labels=[...new Set([0,Math.floor((points.length-1)/2),points.length-1])].map(i=>`<text x="${xy[i][0]}" y="220" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}">${date(points[i].date)}</text>`).join('');
    return `<div class="timeline-scroll"><svg class="timeline-svg" viewBox="0 0 900 235" role="img" aria-label="Inscrições por dia, detalhes na tabela abaixo"><title>Inscrições realizadas por dia</title>${grid}<polygon points="48,190 ${xy.map(p=>p.join(',')).join(' ')} 868,190" fill="rgba(72,185,104,.12)"/><polyline points="${xy.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#48b968" stroke-width="3"/>${xy.map((p,i)=>`<circle tabindex="0" class="timeline-point" cx="${p[0]}" cy="${p[1]}" r="4" fill="#48b968" aria-label="${date(points[i].date)}: ${number(points[i].count)} inscrições"><title>${date(points[i].date)}: ${number(points[i].count)} inscrições</title></circle>`).join('')}${labels}</svg></div><details class="chart-data-details"><summary>Ver dados por dia</summary><div class="chart-scroll"><table><thead><tr><th>Data</th><th>Inscrições</th></tr></thead><tbody>${points.map(p=>`<tr><td>${date(p.date)}</td><td>${number(p.count)}</td></tr>`).join('')}</tbody></table></div></details>`;
  }
  function render(data) {
    const m=data.metrics, events=data.events;
    const cards=[
      ['current','Eventos atuais','Publicados, agendados e rascunhos','calendar'],
      ['closed','Eventos encerrados','Retirados manualmente ou por prazo','archive'],
      ['active','Inscrições ativas','Inscrições feitas no período selecionado','people'],
      ['cancelled','Inscrições canceladas','Somente cancelamentos registrados após a atualização','cancel'],
      ['institutions','Instituições com inscrições','Somente instituições identificadas','building'],
      ['occupancy','Ocupação média atual','Média dos eventos com limite de vagas','chart'],
      ['available','Vagas disponíveis','Eventos publicados com limite de vagas','ticket'],
      ['unlimited','Eventos sem limite','Não entram no cálculo de ocupação','infinity'],
      ['events','Eventos cadastrados','Eventos correspondentes aos filtros','calendar'],
      ['published','Eventos publicados','Disponíveis no site público','globe']
    ];
    const paths={calendar:'M5 5h14v15H5z M8 2v6 M16 2v6 M5 10h14',archive:'M3 4h18v5H3z M5 9v12h14V9 M9 13h6',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6',cancel:'M6 6l12 12 M18 6 6 18',building:'M4 21V3h12v18 M16 10h4v11 M8 7h4 M8 11h4 M8 15h4',chart:'M4 20V10 M11 20V4 M18 20v-8',ticket:'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z M15 5v14',infinity:'M12 12c-3-7-10-7-10 0s7 7 10 0 10-7 10 0-7 7-10 0',globe:'M2 12h20 M12 2c-8 8-8 12 0 20 8-8 8-12 0-20 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'};
    put('dashboardMetrics',cards.map(([key,label,hint,icon])=>`<article class="metric-card"><div class="metric-top"><span>${label}</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[icon]}"/></svg></div><strong class="metric-value" data-metric="${key}">${number(m[key])}${key==='occupancy'&&m[key]!=null?'%':''}</strong><small>${hint}</small></article>`).join(''));
    document.getElementById('dashboardDataNote').textContent=(data.cancellationTracking ? 'Cancelamentos anteriores à instalação do histórico não estão disponíveis.' : 'Histórico de cancelamentos ainda não instalado. Execute db/dashboard_cancelamentos.sql; cancelamentos não serão apresentados como zero.')+' O período considera a data da inscrição, no horário de Brasília. Com período ativo, os eventos exibidos são os que tiveram inscrições nesse intervalo. Vagas e ocupação mostram a situação atual desses eventos, incluindo todos os públicos. Instituições sem vínculo no cadastro antigo aparecem como não informadas.';
    document.getElementById('dashboardTimelineHint').textContent=(data.period.from ? 'Intervalo selecionado' : 'Últimos 30 dias')+' · Inscrições ativas + cancelamentos conhecidos, pela data da inscrição original.';
    put('dashboardTimelineChart',timeline(data.daily));
    put('dashboardRegistrationChart',bars(events.filter(e=>e.active).slice().sort((a,b)=>b.active-a.active).slice(0,5).map(e=>({id:e.id,name:e.title,count:e.active}))));
    put('dashboardInstitutionChart',bars(data.institutions.slice().sort((a,b)=>b.count-a.count).map(e=>({name:e.name,count:e.count}))));
    put('dashboardAudienceChart',donut([{label:'Escola',count:data.audiences.escola||0,color:'#48b968'},{label:'Faculdade',count:data.audiences.faculdade||0,color:'#709fcb'},{label:'Não informado',count:data.audiences.unknown||0,color:'#9a87be'}]));
    put('dashboardCancellationChart',data.cancellationTracking ? donut([{label:'Ativas',count:m.active,color:'#48b968'},{label:'Canceladas',count:m.cancelled,color:'#d9ab45'}]) : empty('Histórico de cancelamentos indisponível até instalar a atualização do banco.'));
    put('dashboardStatusChart',donut(groups.map(g=>({...g,count:events.filter(e=>state(e).key===g.key).length})),'eventos'));
    put('dashboardOccupancyChart',events.length?'<ul class="chart-ranking">'+events.map(e=>`<li><a class="chart-bar-link" href="${report(e.id)}"><div class="chart-bar-label"><span>${escape(e.title)}</span><strong>${e.occupancy==null?'Sem limite':number(e.occupancy)+'%'}</strong></div><small>${number(e.totalActive)} inscritos atuais${e.seats>0?' / '+number(e.seats)+' vagas':''}</small>${e.occupancy==null?'':`<div class="chart-bar-track" aria-hidden="true"><span style="width:${Math.min(100,e.occupancy)}%"></span></div>`}</a></li>`).join('')+'</ul>':empty('Nenhum evento neste filtro.'));
    put('dashboardEventTable',events.length?events.map(e=>`<tr><td><strong>${escape(e.title)}</strong><small>${escape(e.institutionName)}</small></td><td><span class="status-pill ${e.closed?'closed':e.published?'':'off'}">${state(e).label}</span></td><td>${number(e.active)}</td><td>${data.cancellationTracking?number(e.cancelled):'—'}</td><td>${e.seats>0?number(e.seats):'Sem limite'}</td><td>${e.occupancy==null?'Não se aplica':number(e.occupancy)+'%'}<small>${number(e.totalActive)} inscritos atuais</small></td><td>${date(e.date)}</td><td>${e.published?'No ar':e.closed?'Fora do ar':e.mode==='automatic'?dateTime(e.publishAt):e.mode==='scheduled'?'Aguardando publicação manual':'Rascunho'}</td><td><a href="${report(e.id)}">Relatório →</a><a href="eventos.html${e.closed?'?view=history':''}">Gerenciar →</a></td></tr>`).join(''):'<tr><td colspan="9">Nenhum evento corresponde aos filtros.</td></tr>');
    put('dashboardEvents',events.slice(0,5).map(e=>`<div class="mini-item"><strong>${escape(e.title)}</strong><span>${date(e.date)} · ${state(e).label}</span></div>`).join('')||empty('Nenhum evento neste filtro.'));
    put('dashboardRegistrations',data.latest.map(r=>`<div class="mini-item"><strong>${escape(r.title)}</strong><span>${dateTime(r.date)}</span></div>`).join('')||empty());
  }
  window.initDashboard = request => {
    const form=document.getElementById('dashboardFilters'), feedback=document.getElementById('dashboardFeedback'), content=document.getElementById('dashboardContent');
    if (!form) return;
    let sequence=0, currentQuery='';
    const dates=()=>{
      const custom=form.elements.period.value==='custom'; document.getElementById('dashboardCustomDates').hidden=!custom;
      ['from','to'].forEach(key=>{form.elements[key].disabled=!custom;form.elements[key].required=custom;});
    };
    const load=async query=>{
      const ticket=++sequence; content.setAttribute('aria-busy','true');feedback.classList.remove('dashboard-error');feedback.textContent='Atualizando indicadores...';
      try {
        const data=await request('dashboard'+(query?'&'+query:''));
        if(ticket!==sequence) return;
        {
          const selectedEvent=form.elements.event.value, selectedInstitution=form.elements.institution.value;
          put('dashboardEvent','<option value="">Todos os eventos</option>'+data.options.map(e=>`<option value="${escape(e.id)}">${escape(e.title)}</option>`).join(''));
          const institutions=new Map(data.options.map(e=>[e.institution,e.institutionName]));
          put('dashboardInstitution','<option value="">Todas as instituições</option>'+[...institutions].map(([id,name])=>`<option value="${escape(id)}">${escape(name)}</option>`).join(''));
          form.elements.event.value=selectedEvent; form.elements.institution.value=selectedInstitution;
        }
        render(data);content.hidden=false;currentQuery=query;
        feedback.textContent=`${number(data.metrics.events)} eventos · ${number(data.metrics.active)} inscrições ativas · Atualizado às ${new Date(data.generatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}`;
      } catch(error) {
        if(ticket!==sequence) return;
        content.hidden=true;feedback.classList.add('dashboard-error');feedback.textContent=(error.message||'Não foi possível carregar o dashboard.')+' Use Aplicar filtros para tentar novamente.';
      } finally {if(ticket===sequence) content.setAttribute('aria-busy','false');}
    };
    form.elements.period.addEventListener('change',dates);
    form.addEventListener('submit',e=>{e.preventDefault();load(new URLSearchParams(new FormData(form)).toString());});
    form.addEventListener('reset',()=>setTimeout(()=>{dates();load('');},0));
    dates();load('');
    setInterval(()=>{if(!document.hidden && content.getAttribute('aria-busy')!=='true')load(currentQuery);},60000);
  };
})();
