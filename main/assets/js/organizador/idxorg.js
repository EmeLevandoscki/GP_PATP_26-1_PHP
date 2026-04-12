 // Cursor
  const cur = document.getElementById('cursor'), ring = document.getElementById('cursor-ring');
  document.addEventListener('mousemove', e => {
    cur.style.left = e.clientX - 5 + 'px'; cur.style.top = e.clientY - 5 + 'px';
    ring.style.left = e.clientX - 16 + 'px'; ring.style.top = e.clientY - 16 + 'px';
  });

  // Theme
  function toggleTheme() {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('.theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';
  }

  // Dropdown
  function toggleDropdown() { document.getElementById('navUser').classList.toggle('open'); }
  document.addEventListener('click', e => { if (!e.target.closest('#navUser')) document.getElementById('navUser').classList.remove('open'); });

  // Modal
  function openModal(name) {
    document.getElementById('modalEventName').textContent = name;
    document.getElementById('modalSuccess').style.display = 'none';
    document.getElementById('modalForm').style.display = 'block';
    document.getElementById('modalOverlay').classList.add('open');
  }
  function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
  function closeModalOutside(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
  function submitReserva() { document.getElementById('modalForm').style.display='none'; document.getElementById('modalSuccess').style.display='block'; }

  // IDs dos eventos que pertencem a este organizador
  const OWN_EVENT_IDS = [0, 1, 2];

  const events = [
    { id:0, title:'Semana Acadêmica de Direito 2025', cat:'tech', tag:'Acadêmico', date:'14', month:'ABR', local:'Campus GV', img:'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80', desc:'Três dias de palestras, workshops e networking.', price:'GRÁTIS', inscritos:142, vagas:150 },
    { id:1, title:'Festival Gastronômico IDEAU', cat:'gastronomia', tag:'Gastronomia', date:'19', month:'ABR', local:'Praça Central', img:'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80', desc:'Sabores regionais e expositores locais.', price:'GRÁTIS', inscritos:98, vagas:200 },
    { id:2, title:'Mostra de Arte & Design', cat:'arte', tag:'Arte', date:'02', month:'MAI', local:'Galeria IDEAU', img:'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80', desc:'Obras dos alunos de Comunicação e Design.', price:'GRÁTIS', inscritos:64, vagas:100 },
    { id:3, title:'Noite de Jazz IDEAU', cat:'musica', tag:'Música', date:'05', month:'MAI', local:'Auditório Central', img:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80', desc:'Uma noite especial com músicos ao vivo.', price:'GRÁTIS', inscritos:45, vagas:80 },
    { id:4, title:'Congresso de Medicina 2025', cat:'tech', tag:'Acadêmico', date:'28', month:'ABR', local:'Campus Erechim', img:'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80', desc:'Três dias de palestras com especialistas nacionais.', price:'GRÁTIS', inscritos:88, vagas:120 },
    { id:5, title:'Olimpíadas IDEAU 2025', cat:'esporte', tag:'Esporte', date:'30', month:'MAI', local:'Ginásio IDEAU', img:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80', desc:'Competições esportivas entre os cursos.', price:'GRÁTIS', inscritos:210, vagas:500 },
  ];

  let currentFilter = 'todos';
  function renderEvents(list) {
    const grid = document.getElementById('eventsGrid');
    if (!list.length) { grid.innerHTML='<div class="no-results"><h3>Nenhum evento encontrado</h3><p>Tente outros filtros.</p></div>'; return; }
    grid.innerHTML = list.map(ev => {
      const own = OWN_EVENT_IDS.includes(ev.id);
      const pct = Math.round(ev.inscritos / ev.vagas * 100);
      return `<div class="event-card fade-up">
        <div class="card-img">
          <img src="${ev.img}" alt="${ev.title}" loading="lazy"/>
          ${own
            ? `<span class="card-own-badge">★ Seu evento</span>`
            : `<span class="card-tag">${ev.tag}</span>`
          }
          <div class="card-date-badge"><span class="day">${ev.date}</span><span class="month">${ev.month}</span></div>
          ${own ? `<div class="card-vagas-pill">${ev.inscritos}/${ev.vagas} inscritos · ${pct}%</div>` : ''}
        </div>
        <div class="card-body">
          <div class="card-meta"><span>📍 ${ev.local}</span>${own ? `<span>👥 ${ev.inscritos} inscritos</span>` : ''}</div>
          <div class="card-title">${ev.title}</div>
          <div class="card-desc">${ev.desc}</div>
          <div class="card-footer">
            <div class="card-price">${ev.price}</div>
            ${own
              ? `<button class="card-btn-manage" onclick="window.location='organizador-dashboard.html'">✏️ Gerenciar</button>`
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
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), { threshold:0.1 });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  }

  renderEvents(events);
  observeFadeUps();