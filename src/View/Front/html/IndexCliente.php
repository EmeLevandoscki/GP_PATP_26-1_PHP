<?php
    session_start();
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    require_once __DIR__ . '/../vendor/autoload.php';
    use App\Service\EventoService;
    $service = new EventoService();
    $eventos = $service->listarTodosEventos();
    var_dump($eventos)
?>

<html lang="pt-BR" data-theme="dark">
<!DOCTYPE html>
  <head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Eventos — IDEAU (Cliente)</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="css/IndexCliente.css"/>
</head>
<body>
<div id="cursor"></div>
<div id="cursor-ring"></div>
<nav>
  <a href="IndexCliente.html" class="nav-logo">
    <img src="logo__ideau.png" alt="Logo IDEAU"/>
    <div class="nav-logo-text">
      <span class="nav-logo-title">IDEAU Eventos</span>
      <span class="nav-logo-sub">Faculdades IDEAU</span>
    </div>
  </a>
  <ul>
    <li><a href="#eventos">Eventos</a></li>
    <li><a href="#categorias">Categorias</a></li>
    <li><a href="#destaque">Destaque</a></li>
  </ul>
  <div class="nav-right">
    <button class="theme-toggle" onclick="toggleTheme()" title="Alternar tema">🌙</button>

    <a href="ClientConfig.html#ingressos" class="btn-nav-ingressos">
      🎟️ Meus Ingressos <span class="ingressos-count">3</span>
    </a>

    <div class="nav-notif-wrap" id="notifWrap">
      <button class="nav-notif" id="notifBtn" onclick="toggleNotif()">
        🔔
        <span class="notif-dot" id="notifDot"></span>
      </button>
      <div class="notif-popup" id="notifPopup">
        <div class="np-header">
          <div class="np-header-left">
            <span class="np-title">Notificações</span>
            <span class="np-count-badge" id="npBadge">3</span>
          </div>
          <button class="np-mark-all" onclick="markAllRead()">Marcar todas como lidas</button>
        </div>
        <div class="np-list" id="npList"></div>
        <div class="np-footer">
          <a href="ClientConfig.html#notificacoes">Ver todas as notificações →</a>
        </div>
      </div>
    </div>

    <div class="nav-user" id="navUser">
      <div class="nav-avatar" onclick="toggleDropdown()">
        <div class="avatar-circle">MA</div>
        <div class="avatar-info">
          <span class="avatar-name">Maria A.</span>
          <span class="avatar-role">Cliente</span>
        </div>
        <span class="avatar-chevron">▾</span>
      </div>
      <div class="user-dropdown">
        <div class="dropdown-header">
          <div class="dh-name">Maria Aparecida</div>
          <div class="dh-email">maria.a@aluno.ideau.edu.br</div>
          <div class="dropdown-badge"><span class="dropdown-badge-dot"></span>Cliente</div>
        </div>
        <div class="dropdown-menu">
          <a href="ClientConfig.html#perfil"       class="dropdown-item"><span class="di-icon">🏠</span>Visão Geral</a>
          <a href="ClientConfig.html#ingressos"    class="dropdown-item"><span class="di-icon">🎟️</span>Meus Ingressos</a>
          <a href="ClientConfig.html#historico"    class="dropdown-item"><span class="di-icon">📋</span>Histórico</a>
          <a href="ClientConfig.html#recomendados" class="dropdown-item"><span class="di-icon">⭐</span>Recomendados</a>
          <div class="dropdown-divider"></div>
          <a href="ClientConfig.html#perfil"       class="dropdown-item"><span class="di-icon">👤</span>Perfil</a>
          <a href="#" class="dropdown-item danger"><span class="di-icon">↩</span>Sair</a>
        </div>
      </div>
    </div>
  </div>
</nav>

<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-welcome-bar">
    <div class="hwb-avatar">MA</div>
    <div class="hwb-text">
      <span class="hwb-greeting">Bem-vinda de volta</span>
      <span class="hwb-name">Maria Aparecida</span>
    </div>
    <div class="hwb-sep"></div>
    <div class="hwb-stat">
      <span class="hwb-stat-val">3</span>
      <span class="hwb-stat-label">Ingressos ativos</span>
    </div>
    <div class="hwb-sep"></div>
    <div class="hwb-stat">
      <span class="hwb-stat-val">2</span>
      <span class="hwb-stat-label">Esta semana</span>
    </div>
    <a href="ClientConfig.html#perfil" class="hwb-link">Ver painel →</a>
  </div>
  <div class="hero-eyebrow">Faculdades IDEAU — Alto Uruguai</div>
  <h1>VIVA<br><span class="line2">CADA</span><br><span class="accent-word">MOMENTO</span></h1>
  <p class="hero-sub">Descubra os melhores eventos acadêmicos, culturais e esportivos das Faculdades IDEAU e da região. Inscrição garantida, memória para sempre.</p>
  <div class="hero-actions">
    <button class="btn-primary" onclick="document.getElementById('eventos').scrollIntoView({behavior:'smooth'})">Explorar Eventos</button>
    <a href="ClientConfig.html#ingressos" class="btn-ingressos-hero">🎟️ Meus Ingressos</a>
    <a href="#categorias" class="btn-ghost">→ Categorias</a>
  </div>
  <div class="hero-stats">
    <div class="stat"><div class="stat-number">60+</div><div class="stat-label">Eventos ativos</div></div>
    <div class="stat"><div class="stat-number">4K+</div><div class="stat-label">Participantes</div></div>
    <div class="stat"><div class="stat-number">20+</div><div class="stat-label">Anos de história</div></div>
  </div>
  <div class="hero-ticker">↓ Role para explorar ↓</div>
</section>

<div class="marquee-bar">
  <div class="marquee-track">
    <span class="marquee-item">Semanas Acadêmicas <span class="marquee-dot"></span></span>
    <span class="marquee-item">Festivais Culturais <span class="marquee-dot"></span></span>
    <span class="marquee-item">Congressos <span class="marquee-dot"></span></span>
    <span class="marquee-item">Exposições <span class="marquee-dot"></span></span>
    <span class="marquee-item">Esportes <span class="marquee-dot"></span></span>
    <span class="marquee-item">Gastronomia <span class="marquee-dot"></span></span>
    <span class="marquee-item">Arte & Cultura <span class="marquee-dot"></span></span>
    <span class="marquee-item">Formandos <span class="marquee-dot"></span></span>
    <span class="marquee-item">Semanas Acadêmicas <span class="marquee-dot"></span></span>
    <span class="marquee-item">Festivais Culturais <span class="marquee-dot"></span></span>
    <span class="marquee-item">Congressos <span class="marquee-dot"></span></span>
    <span class="marquee-item">Exposições <span class="marquee-dot"></span></span>
    <span class="marquee-item">Esportes <span class="marquee-dot"></span></span>
    <span class="marquee-item">Gastronomia <span class="marquee-dot"></span></span>
    <span class="marquee-item">Arte & Cultura <span class="marquee-dot"></span></span>
    <span class="marquee-item">Formandos <span class="marquee-dot"></span></span>
  </div>
</div>

<div class="search-section" style="padding-top:60px">
  <div class="search-wrap">
    <span>🔍</span>
    <input type="text" id="searchInput" placeholder="Buscar eventos, cursos, locais..." oninput="filterEvents()"/>
    <div class="search-divider"></div>
    <select id="stateFilter">
      <option value="">Estado</option>
      <option value="RS">RS — Rio Grande do Sul</option>
    </select>
    <div class="search-divider"></div>
    <select id="cityFilter"><option value="">Cidade</option>
      <option value="PF">Passo Fundo, RS</option>
      <option value="BG">Bagé, RS</option>
      <option value="CS">Caxias do Sul, RS</option>
      <option value="GV">Getúlio Vargas, RS</option></select>
    <button onclick="filterEvents()">Buscar</button>
  </div>
</div>

<section id="eventos">
  <div class="section-label">Agenda</div>
  <h2 class="section-title">PRÓXIMOS EVENTOS</h2>
  <div class="filter-bar">
    <button class="filter-btn active" onclick="setFilter(this,'todos')">Todos</button>
    <button class="filter-btn" onclick="setFilter(this,'musica')">🎵 Música</button>
    <button class="filter-btn" onclick="setFilter(this,'tech')">🎓 Acadêmico</button>
    <button class="filter-btn" onclick="setFilter(this,'arte')">🎨 Arte</button>
    <button class="filter-btn" onclick="setFilter(this,'gastronomia')">🍽️ Gastronomia</button>
    <button class="filter-btn" onclick="setFilter(this,'esporte')">⚽ Esporte</button>
  </div>
  <div class="events-grid" id="eventsGrid"></div>
</section>

<section id="destaque" class="featured-section">
  <div class="section-label">Em destaque</div>
  <h2 class="section-title">EVENTO DO SEMESTRE</h2>
  <div class="featured-wrap fade-up">
    <div class="featured-img">
      <div class="featured-badge">⭐ Destaque</div>
      <img src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80" alt="Semana Acadêmica"/>
    </div>
    <div class="featured-content">
      <div class="section-label" style="margin-bottom:8px">Acadêmico</div>
      <h2>SEMANA ACADÊMICA DE DIREITO 2025</h2>
      <p>O maior evento acadêmico do semestre reúne professores, profissionais e estudantes para três dias de intenso aprendizado e networking.</p>
      <div class="featured-details">
        <div class="detail-row"><div class="detail-icon">📅</div><div><div class="detail-label">Data</div><div class="detail-val">14, 15 e 16 de Abril, 2025</div></div></div>
        <div class="detail-row"><div class="detail-icon">📍</div><div><div class="detail-label">Local</div><div class="detail-val">Campus IDEAU — Passo Fundo, RS</div></div></div>
        <div class="detail-row"><div class="detail-icon">🎟️</div><div><div class="detail-label">Inscrição</div><div class="detail-val">Gratuita — Vagas limitadas</div></div></div>
      </div>
      <div class="featured-actions">
        <button class="btn-primary" onclick="openModal('Semana Acadêmica de Direito 2025')">Inscrever-se Agora</button>
      </div>
    </div>
  </div>
</section>

<section id="categorias">
  <div class="section-label">Navegue por</div>
  <h2 class="section-title">CATEGORIAS</h2>
  <div class="categories-grid">
    <div class="cat-card fade-up" onclick="setFilterByName('musica')">
      <div class="cat-icon">🎵</div><div class="cat-name">Música</div><div class="cat-count">Shows & festivais</div><div class="cat-arrow">↗</div>
    </div>
    <div class="cat-card fade-up" style="transition-delay:0.1s" onclick="setFilterByName('tech')">
      <div class="cat-icon">🎓</div><div class="cat-name">Acadêmico</div><div class="cat-count">Congressos & semanas</div><div class="cat-arrow">↗</div>
    </div>
    <div class="cat-card fade-up" style="transition-delay:0.2s" onclick="setFilterByName('arte')">
      <div class="cat-icon">🎨</div><div class="cat-name">Arte & Cultura</div><div class="cat-count">Exposições & mostras</div><div class="cat-arrow">↗</div>
    </div>
    <div class="cat-card fade-up" style="transition-delay:0.3s" onclick="setFilterByName('gastronomia')">
      <div class="cat-icon">🍽️</div><div class="cat-name">Gastronomia</div><div class="cat-count">Feiras & degustações</div><div class="cat-arrow">↗</div>
    </div>
  </div>
</section>

<div class="newsletter-section">
  <div><h2>FIQUE POR<br><span>DENTRO DE</span><br>TUDO</h2></div>
  <div class="newsletter-form">
    <input type="email" placeholder="seu@email.com" id="newsletterEmail"/>
    <button>Me avisar</button>
  </div>
</div>

<footer>
  <div class="footer-top">
    <div class="footer-brand">
      <div class="footer-logo"><img src="logo__ideau.png" alt="IDEAU"/><span class="footer-logo-name">IDEAU EVENTOS</span></div>
      <p>A plataforma oficial de eventos das Faculdades IDEAU — Instituto de Desenvolvimento Educacional do Alto Uruguai.</p>
    </div>
    <div class="footer-col"><h4>Eventos</h4><ul><li><a href="#">Música</a></li><li><a href="#">Acadêmico</a></li><li><a href="#">Arte</a></li><li><a href="#">Gastronomia</a></li></ul></div>
    <div class="footer-col"><h4>IDEAU</h4><ul><li><a href="https://www.ideau.com.br/?unidade=6" target="_blank">Site Oficial</a></li><li><a href="#">Cursos</a></li><li><a href="#">Campus</a></li><li><a href="#">Contato</a></li></ul></div>
    <div class="footer-col"><h4>Minha Conta</h4><ul>
      <li><a href="ClientConfig.html#ingressos">Meus Ingressos</a></li>
      <li><a href="ClientConfig.html#historico">Histórico</a></li>
      <li><a href="ClientConfig.html#perfil">Perfil</a></li>
      <li><a href="#">Privacidade</a></li>
    </ul></div>
  </div>
  <div class="footer-bottom">
    <p>© 2025 Faculdades IDEAU. Todos os direitos reservados.</p>
    <div class="socials">
      <a href="https://www.instagram.com/faculdadeideau" target="_blank" class="social-btn">ig</a>
      <a href="https://www.facebook.com/share/1ArAE5uzHj/" target="_blank" class="social-btn">fb</a>
      <a href="https://youtube.com/@faculdadesideau" class="social-btn">yt</a>
      <a href="#" class="social-btn">in</a>
    </div>
  </div>
</footer>

<div class="modal-overlay" id="modalOverlay" onclick="closeModalOutside(event)">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div id="modalForm">
      <h3>RESERVAR VAGA</h3>
      <div class="modal-event-name" id="modalEventName"></div>
      <div class="modal-prefilled-note">✅ Seus dados foram preenchidos automaticamente com sua conta.</div>
      <label>Nome completo</label>
      <input type="text" id="modalName" value="Maria Aparecida Souza"/>
      <label>E-mail</label>
      <input type="email" id="modalEmail" value="maria.a@aluno.ideau.edu.br"/>
      <label>Tipo de ingresso</label>
      <select id="modalTicket"><option>Entrada Gratuita</option></select>
      <label>Quantidade</label>
      <select id="modalQty"><option>1 ingresso</option><option>2 ingressos</option><option>3 ingressos</option><option>4 ingressos</option></select>
      <button class="modal-submit" onclick="submitReserva()">Confirmar Inscrição</button>
    </div>
    <div class="modal-success" id="modalSuccess">
      <span class="check">✅</span>
      <h3>INSCRIÇÃO CONFIRMADA!</h3>
      <p>Sua vaga está garantida. Você receberá os detalhes por e-mail. Até o evento!</p>
    </div>
  </div>
</div>
<div id="toastMsg" class="toast"></div>

<script>
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
</script>
</body>
</html>