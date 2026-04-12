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

  function toggleDropdown() {
    document.getElementById('navUser').classList.toggle('open');
    document.getElementById('notifPopup').classList.remove('open');
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#navUser')) document.getElementById('navUser').classList.remove('open');
    if (!e.target.closest('#notifWrap')) document.getElementById('notifPopup').classList.remove('open');
  });

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
    document.getElementById('navUser').classList.remove('open');
    document.getElementById('notifPopup').classList.toggle('open');
  }
  renderNotifs();

  function openModal(name) {
    document.getElementById('modalEventName').textContent = name;
    document.getElementById('modalSuccess').style.display = 'none';
    document.getElementById('modalForm').style.display = 'block';
    document.getElementById('modalOverlay').classList.add('open');
  }
  function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
  function closeModalOutside(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
  function submitReserva() {
    document.getElementById('modalForm').style.display = 'none';
    document.getElementById('modalSuccess').style.display = 'block';
  }

  const ENROLLED_IDS = [0, 2];
  const events = [
    { id:0, title:'Semana Acadêmica de Direito 2025', cat:'tech', tag:'Acadêmico', date:'14', month:'ABR', local:'Campus PF', img:'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80', desc:'Três dias de palestras, workshops e muito networking.', price:'GRÁTIS' },
    { id:1, title:'Festival Gastronômico IDEAU', cat:'gastronomia', tag:'Gastronomia', date:'19', month:'ABR', local:'Praça Central', img:'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80', desc:'Sabores regionais, expositores locais e muito mais.', price:'GRÁTIS' },
    { id:2, title:'Festival Gastronômico IDEAU', cat:'gastronomia', tag:'Gastronomia', date:'19', month:'ABR', local:'Praça Central', img:'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80', desc:'Sabores regionais, expositores locais e muito mais.', price:'GRÁTIS' },
    { id:3, title:'Noite de Jazz IDEAU', cat:'musica', tag:'Música', date:'05', month:'MAI', local:'Auditório Central', img:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80', desc:'Uma noite especial com músicos da região ao vivo.', price:'GRÁTIS' },
    { id:4, title:'Mostra de Arte & Design', cat:'arte', tag:'Arte', date:'02', month:'MAI', local:'Galeria IDEAU', img:'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80', desc:'Obras dos alunos de Comunicação e Design.', price:'GRÁTIS' },
    { id:5, title:'Olimpíadas IDEAU 2025', cat:'esporte', tag:'Esporte', date:'30', month:'MAI', local:'Ginásio IDEAU', img:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80', desc:'Competições esportivas entre os cursos.', price:'GRÁTIS' },
  ];
  let currentFilter = 'todos';
  function renderEvents(list) {
    const grid = document.getElementById('eventsGrid');
    if (!list.length) { grid.innerHTML = '<div class="no-results"><h3>Nenhum evento encontrado</h3><p>Tente outros filtros.</p></div>'; return; }
    grid.innerHTML = list.map(ev => {
      const enrolled = ENROLLED_IDS.includes(ev.id);
      return `<div class="event-card fade-up">
        <div class="card-img">
          <img src="${ev.img}" alt="${ev.title}" loading="lazy"/>
          ${enrolled ? `<span class="card-enrolled-badge">✓ Inscrito</span>` : `<span class="card-tag">${ev.tag}</span>`}
          <div class="card-date-badge"><span class="day">${ev.date}</span><span class="month">${ev.month}</span></div>
        </div>
        <div class="card-body">
          <div class="card-meta"><span>📍 ${ev.local}</span></div>
          <div class="card-title">${ev.title}</div>
          <div class="card-desc">${ev.desc}</div>
          <div class="card-footer">
            <div class="card-price">${ev.price}</div>
            ${enrolled
              ? `<button class="card-btn-enrolled" onclick="alert('Ver ingresso')">🎟️ Ver Ingresso</button>`
              : `<button class="card-btn" onclick="openModal('${ev.title}')">Inscrever-se</button>`
            }
          </div>
        </div>
      </div>`;
    }).join('');
    observeFadeUps();
  }
  function setFilter(btn, cat) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentFilter = cat; filterEvents();
  }
  function filterEvents() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    let list = events;
    if (currentFilter !== 'todos') list = list.filter(e => e.cat === currentFilter);
    if (q) list = list.filter(e => e.title.toLowerCase().includes(q) || e.local.toLowerCase().includes(q));
    renderEvents(list);
  }
  function setFilterByName(cat) {
    document.getElementById('eventos').scrollIntoView({ behavior:'smooth' });
    setTimeout(() => {
      const btn = [...document.querySelectorAll('.filter-btn')].find(b => b.getAttribute('onclick')?.includes(cat));
      if (btn) btn.click();
    }, 400);
  }
  function observeFadeUps() {
    const obs = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }), { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  }
  renderEvents(events);
  observeFadeUps();