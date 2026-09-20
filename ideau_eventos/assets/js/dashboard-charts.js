(() => {
  'use strict';
  const groups = [
    { key: 'published', label: 'Publicados', color: '#48b968' },
    { key: 'scheduled', label: 'Agendados', color: '#d9ab45' },
    { key: 'draft', label: 'Rascunhos', color: '#709fcb' },
    { key: 'closed', label: 'Encerrados', color: '#9a87be' }
  ];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = event => event.closed ? 'closed' : event.published ? 'published' : ['scheduled', 'automatic'].includes(event.mode) ? 'scheduled' : 'draft';
  const number = value => new Intl.NumberFormat('pt-BR').format(value);
  window.renderDashboardCharts = function(events) {
    const bars = document.getElementById('dashboardRegistrationChart');
    const donut = document.getElementById('dashboardStatusChart');
    const filter = document.getElementById('dashboardChartScope');
    if (!bars || !donut || !filter) return;
    const render = () => {
      const selected = events.filter(event => filter.value === 'all' || (filter.value === 'history' ? event.closed : !event.closed));
      if (!selected.length) {
        bars.innerHTML = donut.innerHTML = '<p class="empty-state">Nenhum evento neste filtro.</p>';
        return;
      }
      const ranked = selected.map(event => ({...event, count: Math.max(0, Number(event.count) || 0)}))
        .sort((a,b) => b.count - a.count || String(a.title).localeCompare(String(b.title), 'pt-BR')).slice(0,5);
      const max = Math.max(1, ...ranked.map(event => event.count));
      bars.innerHTML = '<ol class="chart-ranking">' + ranked.map(event => `<li><a class="chart-bar-link" href="relatorios.html?event=${encodeURIComponent(event.id)}" aria-label="${escape(event.title)}: ${number(event.count)} inscrições. Abrir relatório."><div class="chart-bar-label"><span>${escape(event.title)}</span><strong>${number(event.count)}</strong></div><div class="chart-bar-track" aria-hidden="true"><span style="width:${event.count / max * 100}%"></span></div></a></li>`).join('') + '</ol>';
      if (ranked.every(event => event.count === 0)) bars.innerHTML += '<p class="chart-hint">Estes eventos ainda não têm inscrições.</p>';
      const totals = groups.map(group => ({...group, count:selected.filter(event => status(event) === group.key).length}));
      const circumference = 2 * Math.PI * 68;
      let offset = 0;
      const segments = totals.filter(group => group.count).map(group => {
        const length = group.count / selected.length * circumference;
        const segment = `<circle cx="90" cy="90" r="68" fill="none" stroke="${group.color}" stroke-width="21" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"><title>${group.label}: ${number(group.count)} eventos</title></circle>`;
        offset += length;
        return segment;
      }).join('');
      donut.innerHTML = `<div class="chart-status-layout"><div class="chart-donut"><svg viewBox="0 0 180 180" aria-hidden="true">${segments}</svg><div class="chart-donut-total"><strong>${number(selected.length)}</strong><span>${selected.length === 1 ? 'evento' : 'eventos'}</span></div></div><ul class="chart-legend">${totals.map(group => `<li><span class="chart-legend-dot" style="background:${group.color}" aria-hidden="true"></span><span>${group.label}</span><strong>${number(group.count)}</strong><small>${Math.round(group.count / selected.length * 100)}%</small></li>`).join('')}</ul></div>`;
    };
    filter.onchange = render;
    render();
  };
})();
