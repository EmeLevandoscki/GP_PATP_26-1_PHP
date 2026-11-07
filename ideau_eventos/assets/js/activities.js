/* Programação usa os mesmos formulários, sessão e API do painel. */
window.ActivityUI = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => { const [d, t] = String(value).split('T'); return `${d.split('-').reverse().join('/')} ${t || ''}`; };
  const info = a => `${date(a.startAt)} até ${date(a.endAt)} (Brasília) · ${a.location || 'Local a definir'} · ${a.speaker || 'Responsável a definir'} · ${a.hours} h`;
  const active = row => (row.activities || []).filter(a => !a.cancelledAt);
  function program(event, select = false) {
    if (event.eventType !== 'multiple') return '';
    return `<section class="activities"><h2>${select ? 'Escolha suas atividades' : 'Programação'}</h2><p>Vagas por atividade. Os horários seguem o horário de Brasília.</p>${(event.activities || []).map(a => `<article class="activity-card">${select ? `<label class="activity-choice"><input type="checkbox" name="activityIds" value="${esc(a.id)}" ${a.remaining <= 0 ? 'disabled' : ''}><strong>${esc(a.name)}</strong></label>` : `<h3>${esc(a.name)}</h3>`}<p>${esc(window.EventConfiguration?.typeLabel(a.type,a.customType) || a.type)} · ${esc(info(a))}</p><p>${esc(a.description)}</p><p><strong>${a.remaining} vagas disponíveis de ${a.seats}</strong></p></article>`).join('')}${select ? '<p id="activitySelectionSummary" role="status">Nenhuma atividade selecionada.</p><p id="activityConflict" role="alert"></p>' : ''}</section>`;
  }
  function selection(event, form = document.getElementById('registrationForm')) {
    if (!form || event.eventType !== 'multiple') return;
    function update() {
      const ids = new FormData(form).getAll('activityIds');
      const selected = event.activities.filter(a => ids.includes(a.id));
      const conflict = selected.some((a, i) => selected.slice(i + 1).some(b => a.startAt < b.endAt && b.startAt < a.endAt));
      document.getElementById('activitySelectionSummary').textContent = selected.length ? `Atividades selecionadas: ${selected.map(a => a.name).join(', ')}.` : 'Nenhuma atividade selecionada.';
      if (!event.activities.some(a => a.remaining > 0)) document.getElementById('activitySelectionSummary').textContent = 'Todas as atividades estão sem vagas no momento.';
      document.getElementById('activityConflict').textContent = conflict ? 'Há conflito de horários. Escolha atividades em horários diferentes.' : '';
      const first = form.querySelector('[name="activityIds"]:not(:disabled)');
      first?.setCustomValidity(!ids.length ? 'Selecione pelo menos uma atividade.' : conflict ? 'As atividades selecionadas têm horários conflitantes.' : '');
      form.querySelector('[type="submit"]').disabled = !ids.length || conflict;
    }
    form.addEventListener('change', update); update();
  }
  function editor(event) {
    const state = document.getElementById('eventActivities');
    const type = document.getElementById('eventType');
    const list = document.getElementById('activityEditor');
    if (!state || !list) return;
    let items;
    try { items = JSON.parse(state.value || '[]'); } catch { items = event?.activities || []; }
    function sync() {
      items = [...list.querySelectorAll('[data-activity-card]')].map(card => {
        const a = {id: card.dataset.activityCard};
        card.querySelectorAll('[data-field]').forEach(input => { a[input.dataset.field] = input.type === 'number' ? Number(input.value) : input.value; });
        return a;
      });
      state.value = JSON.stringify(items);
    }
    function render() {
      list.innerHTML = items.map((a, i) => `<article class="activity-card" data-activity-card="${esc(a.id || '')}"><h3>Atividade ${i + 1}</h3><div class="form-grid">${[
        ['name','Nome *','text'], ['type','Tipo','select'], ['customType','Tipo personalizado (se Outro)','text'], ['startAt','Início *','datetime-local'], ['endAt','Término *','datetime-local'], ['location','Local / sala','text'], ['speaker','Palestrante / responsável','text'], ['seats','Vagas *','number'], ['hours','Carga horária (h)','number'], ['description','Descrição','textarea']
      ].map(([key,label,kind]) => `<label class="form-field"><span>${label}</span>${kind === 'select' ? `<select data-field="${key}" id="activity-${i}-${key}">${window.EventConfiguration?.formTypeOptions(a[key] || 'outro', 'Selecione o tipo') || ['palestra','oficina','minicurso','outro'].map(t => `<option ${a[key] === t ? 'selected' : ''}>${t}</option>`).join('')}</select>` : kind === 'textarea' ? `<textarea data-field="${key}" id="activity-${i}-${key}" maxlength="10000">${esc(a[key])}</textarea>` : `<input id="activity-${i}-${key}" data-field="${key}" type="${kind}" value="${esc(a[key])}" ${['name','startAt','endAt','seats'].includes(key) ? 'required' : ''} ${kind === 'number' ? `min="${key === 'seats' ? 1 : 0}" step="${key === 'seats' ? 1 : '0.01'}"` : 'maxlength="255"'}>`}</label>`).join('')}</div><button class="btn btn-danger small" type="button" data-remove-activity="${i}">Excluir atividade</button></article>`).join('');
      toggle(); sync();
    }
    function toggle() {
      const multiple = type.value === 'multiple';
      document.getElementById('activityEditorSection').hidden = !multiple;
      list.querySelectorAll('input,select,textarea,button').forEach(el => { el.disabled = !multiple; });
    }
    list.addEventListener('input', sync);
    list.addEventListener('change', sync);
    list.addEventListener('click', e => {
      const button = e.target.closest('[data-remove-activity]'); if (!button) return;
      if (!confirm('Excluir esta atividade? Se houver inscritos ativos, cancele suas inscrições antes.')) return;
      sync(); items.splice(Number(button.dataset.removeActivity), 1); render(); state.dispatchEvent(new Event('input', {bubbles:true}));
    });
    document.getElementById('addActivity').addEventListener('click', () => {
      sync(); items.push({name:'', type:'palestra', startAt:'', endAt:'', seats:30, hours:1}); render();
      list.lastElementChild.querySelector('input').focus(); state.dispatchEvent(new Event('input', {bubbles:true}));
    });
    document.getElementById('eventInstitution')?.addEventListener('change', () => { sync(); render(); });
    type.addEventListener('change', toggle); render();
  }
  function participant(row) {
    return (row.activities || []).map(a => `<div class="activity-participant"><strong>${esc(a.name)}</strong>${a.cancelledAt ? ' · Cancelada' : `<button type="button" class="btn btn-danger small" data-cancel-activity="${esc(a.id)}" data-registration="${esc(row.id)}" data-event="${esc(row.eventId)}">Cancelar atividade</button>`}</div>`).join('');
  }
  function report(event) {
    let root = document.getElementById('activityReport');
    if (!root) { root = document.createElement('section'); root.id = 'activityReport'; document.getElementById('reportReviewControls').after(root); }
    root.hidden = event.eventType !== 'multiple';
    if (root.hidden) return;
    const previous = root.querySelector('select')?.value || '';
    root.innerHTML = `<h2>Atividades</h2><div class="activity-stats">${event.activities.map(a => `<article class="activity-card"><strong>${esc(a.name)}</strong><p>${a.registrationCount} ocupadas · ${a.remaining} disponíveis / ${a.seats}</p></article>`).join('')}</div><label class="form-field"><span>Participantes por atividade (também filtra as exportações)</span><select id="reportActivityFilter"><option value="">Todas as atividades</option>${event.activities.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></label>`;
    root.querySelector('select').value = previous;
  }
  return {program, selection, editor, active, participant, report};
})();
