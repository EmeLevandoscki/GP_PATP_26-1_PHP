
  const cur = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  document.addEventListener('mousemove', e => {
    cur.style.left = e.clientX - 5 + 'px'; cur.style.top = e.clientY - 5 + 'px';
    ring.style.left = e.clientX - 16 + 'px'; ring.style.top = e.clientY - 16 + 'px';
  });

  function toggleTheme() {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('.theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';
  }

  /* ── NOTIFICAÇÕES ── */
  const NOTIFS = [
    { id:1, icon:'🎟️', color:'green', text:'Sua inscrição na <b>Semana Acadêmica de Direito</b> foi confirmada!', time:'Agora mesmo', unread:true },
    { id:2, icon:'📅', color:'amber', text:'Lembrete: <b>Festival Gastronômico IDEAU</b> começa em 2 dias.', time:'Há 1 hora', unread:true },
    { id:3, icon:'⭐', color:'red',   text:'Novo evento recomendado: <b>Olimpíadas IDEAU 2025</b>.', time:'Há 3 horas', unread:true },
    { id:4, icon:'✅', color:'',      text:'Seu cadastro foi verificado com sucesso.', time:'Ontem', unread:false },
    { id:5, icon:'📋', color:'',      text:'Histórico de inscrições atualizado.', time:'2 dias atrás', unread:false },
  ];
  let unreadSet = new Set(NOTIFS.filter(n => n.unread).map(n => n.id));

  function renderNotifs() {
    const list = document.getElementById('npList');
    const count = unreadSet.size;
    list.innerHTML = NOTIFS.map(n => {
      const isUnread = unreadSet.has(n.id);
      return `<div class="np-item ${isUnread?'unread':''}" onclick="readNotif(${n.id})">
        <div class="np-icon-wrap ${n.color}">${n.icon}</div>
        <div class="np-body"><div class="np-text">${n.text}</div><div class="np-time">${n.time}</div></div>
        ${isUnread ? '<div class="np-unread-dot"></div>' : ''}
      </div>`;
    }).join('');
    const badge = document.getElementById('npBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
    document.getElementById('notifDot').style.display = count > 0 ? 'block' : 'none';
  }
  function readNotif(id) { unreadSet.delete(id); renderNotifs(); }
  function markAllRead() { unreadSet.clear(); renderNotifs(); }
  function toggleNotif() {
    document.getElementById('notifPopup').classList.toggle('open');
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#notifWrap')) document.getElementById('notifPopup').classList.remove('open');
  });
  renderNotifs();

  /* ── TABS ── */
  const HASH_MAP = {
    'perfil':'perfil','ingressos':'ingressos','historico':'historico',
    'recomendados':'recomendados','seguranca':'seguranca',
    'notificacoes':'notificacoes','privacidade':'privacidade',
  };

  function switchTab(id, sidebarEl, tabBtn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('panel-' + id);
    if (panel) panel.classList.add('active');
    if (tabBtn) { tabBtn.classList.add('active'); }
    else {
      const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.getAttribute('onclick')?.includes("'" + id + "'"));
      if (btn) btn.classList.add('active');
    }
    if (sidebarEl) { sidebarEl.classList.add('active'); }
    else {
      const sItem = [...document.querySelectorAll('.sidebar-item')].find(b => b.getAttribute('onclick')?.includes("'" + id + "'"));
      if (sItem) sItem.classList.add('active');
    }
    history.replaceState(null, '', '#' + id);
    document.getElementById('notifPopup').classList.remove('open');
  }

  function abrirAbaPorHash() {
    const hash = window.location.hash.replace('#', '');
    const id = HASH_MAP[hash] || 'perfil';
    switchTab(id);
  }
  window.addEventListener('DOMContentLoaded', abrirAbaPorHash);

  function showSaveToast(msg) {
    const t = document.getElementById('saveToast');
    t.textContent = msg || '✅ Alterações salvas com sucesso!';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── HISTÓRICO ── */
  const historico = [
    ['Semana Acadêmica de Administração','15 Mar 2025','Acadêmico','Participou'],
    ['Festival de Música Sertaneja','02 Mar 2025','Música','Participou'],
    ['Exposição de Fotografia','18 Fev 2025','Arte','Participou'],
    ['Congresso de Psicologia','05 Fev 2025','Acadêmico','Participou'],
    ['Festival Gastronômico IDEAU 2024','10 Jan 2025','Gastronomia','Participou'],
    ['Corrida IDEAU 5K','10 Mar 2025','Esporte','Cancelou'],
    ['Noite de Jazz','28 Fev 2025','Música','Participou'],
  ];
  const tbody = document.getElementById('historicoTable');
  historico.forEach(([nome,data,cat,status]) => {
    const isCancel = status === 'Cancelou';
    tbody.innerHTML += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:12px 0;font-size:0.86rem;font-weight:500">${nome}</td>
      <td style="padding:12px 0;font-size:0.82rem;color:var(--muted)">${data}</td>
      <td style="padding:12px 0;font-size:0.82rem;color:var(--muted)">${cat}</td>
      <td style="padding:12px 0"><span style="font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;background:${isCancel?'rgba(224,32,32,0.08)':'rgba(46,168,46,0.08)'};color:${isCancel?'var(--red)':'var(--green-light)'};border:1px solid ${isCancel?'rgba(224,32,32,0.2)':'rgba(46,168,46,0.2)'};">${status}</span></td>
    </tr>`;
  });