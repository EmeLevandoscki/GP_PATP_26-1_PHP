<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Eventos — IDEAU </title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="css/style.css"/>
  <link rel="icon" type="image/png" href="favicon.png">
</head>
<body>

<div id="cursor"></div>
<div id="cursor-ring"></div>

<nav>
  <a href="index.html" class="nav-logo">
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
  <div style="display:flex;align-items:center;gap:10px;">
    <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Alternar tema">🌙</button>
    <div class="nav-auth" id="navAuth"></div>
  </div>
</nav>

<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-eyebrow">Faculdades IDEAU — Alto Uruguai</div>
  <h1>
    VIVA<br>
    <span class="line2">CADA</span><br>
    <span class="accent-word">MOMENTO</span>
  </h1>
  <p class="hero-sub">Descubra os melhores eventos acadêmicos, culturais e esportivos das Faculdades IDEAU e da região. Inscrição garantida, memória para sempre.</p>
  <div class="hero-actions">
    <button class="btn-primary" onclick="document.getElementById('eventos').scrollIntoView({behavior:'smooth'})">Explorar Eventos</button>
    <a href="#categorias" class="btn-ghost">→ Ver categorias</a>
  </div>
  <div class="hero-stats">
    <div class="stat"><div class="stat-number" id="totalEventos">0</div><div class="stat-label">Eventos ativos</div></div>
    <div class="stat"><div class="stat-number" id="totalParticipantes">0</div><div class="stat-label">Participantes</div></div>
  </div>
  <div class="hero-ticker">↓ Role para explorar ↓</div>
</section>

<div class="marquee-bar">
  <div class="marquee-track" id="marqueeTrack">
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
    <select id="stateFilter" onchange="onStateChange()">
      <option value="">Estado</option>
      <option value="RS">RS — Rio Grande do Sul</option>
      <option value="SC">SC — Santa Catarina</option>
      <option value="PR">PR — Paraná</option>
    </select>
    <div class="search-divider"></div>
    <select id="cityFilter" onchange="filterEvents()" disabled>
      <option value="">Cidade</option>
    </select>
    <button onclick="filterEvents()">Buscar</button>
  </div>
</div>

<section id="eventos">
  <div class="section-label">Agenda</div>
  <h2 class="section-title">PRÓXIMOS EVENTOS</h2>
  <div class="filter-bar" id="filterBar">
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
        <div class="detail-row">
          <div class="detail-icon">📅</div>
          <div><div class="detail-label">Data</div><div class="detail-val">14, 15 e 16 de Abril, 2025</div></div>
        </div>
        <div class="detail-row">
          <div class="detail-icon">📍</div>
          <div><div class="detail-label">Local</div><div class="detail-val">Campus IDEAU — Passo Fundo, RS</div></div>
        </div>
        <div class="detail-row">
          <div class="detail-icon">🎟️</div>
          <div><div class="detail-label">Inscrição</div><div class="detail-val">Gratuita — Vagas limitadas</div></div>
        </div>
      </div>
      <button class="btn-primary" onclick="openModal('Semana Acadêmica de Direito 2025', '0')">Inscrever-se Agora</button>
    </div>
  </div>
</section>

<section id="categorias">
  <div class="section-label">Navegue por</div>
  <h2 class="section-title">CATEGORIAS</h2>
  <div class="categories-grid" id="categoriesGrid">
  </div>
</section>

<div class="newsletter-section">
  <div>
    <h2>FIQUE POR<br><span>DENTRO DE</span><br>TUDO</h2>
  </div>
  <div class="newsletter-form">
    <input type="email" placeholder="seu@email.com" id="newsletterEmail"/>
    <button onclick="subscribeNewsletter()">Me avisar</button>
  </div>
</div>

<footer>
  <div class="footer-top">
    <div class="footer-brand">
      <div class="footer-logo">
        <img src="logo__ideau.png" alt="IDEAU"/>
        <span class="footer-logo-name">IDEAU EVENTOS</span>
      </div>
      <p>A plataforma oficial de eventos das Faculdades IDEAU — Instituto de Desenvolvimento Educacional do Alto Uruguai.</p>
    </div>
    <div class="footer-col">
      <h4>Eventos</h4>
      <ul>
        <li><a href="#" onclick="setFilterByName('musica')">Música</a></li>
        <li><a href="#" onclick="setFilterByName('tech')">Acadêmico</a></li>
        <li><a href="#" onclick="setFilterByName('arte')">Arte</a></li>
        <li><a href="#" onclick="setFilterByName('gastronomia')">Gastronomia</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>IDEAU</h4>
      <ul>
        <li><a href="https://www.ideau.com.br/?unidade=6" target="_blank">Site Oficial</a></li>
        <li><a href="#">Cursos</a></li>
        <li><a href="#">Campus</a></li>
        <li><a href="#">Contato</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Suporte</h4>
      <ul>
        <li><a href="#">FAQ</a></li>
        <li><a href="meus-ingressos.html">Meus Ingressos</a></li>
        <li><a href="#">Reembolsos</a></li>
        <li><a href="#">Privacidade</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2025 Faculdades IDEAU. Todos os direitos reservados.</p>
    <div class="socials">
      <a href="https://www.instagram.com/faculdadeideau?igsh=MXVlaHF0NjRtbzgyYw==" target="_blank" class="social-btn">ig</a>
      <a href="https://www.facebook.com/share/1ArAE5uzHj/" target="_blank" class="social-btn">fb</a>
      <a href="https://youtube.com/@faculdadesideau?si=_nvgR1ZzYD-umHM2" class="social-btn">yt</a>
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
      <label>Nome completo</label>
      <input type="text" id="modalName" placeholder="Seu nome completo"/>
      <label>E-mail</label>
      <input type="email" id="modalEmail" placeholder="seu@email.com"/>
       <label>CPF</label>
       <input type="text" id="modalCPF" placeholder="Seu CPF"/>
      <button class="modal-submit" onclick="submitReserva()">Confirmar Inscrição</button>
    </div>
    <div class="modal-success" id="modalSuccess">
      <span class="check">✅</span>
      <h3>INSCRIÇÃO CONFIRMADA!</h3>
      <p>Sua vaga está garantida. Você receberá os detalhes por e-mail. Até o evento!</p>
    </div>
  </div>
</div>

<div class="modal-overlay" id="eventDetailOverlay" onclick="closeDetailOverlay(event)">
  <div class="modal event-detail-modal">
    <button class="modal-close" onclick="closeEventDetails()">✕</button>
    <div class="detail-header">
      <h3 id="detailEventTitle">Detalhes do Evento</h3>
      <div class="detail-category" id="detailEventCategory"></div>
      <div class="detail-meta" id="detailEventMeta"></div>
    </div>
    <div class="detail-body">
      <div class="detail-image-wrapper">
        <img id="detailEventImage" src="" alt="Evento" />
      </div>
      <div class="detail-text">
        <div class="detail-section">
          <h4>Sobre o evento</h4>
          <div class="detail-description" id="detailEventDescription"></div>
        </div>
        <div class="detail-section">
          <h4>Atividades</h4>
          <div id="detailScheduleList" class="detail-schedule-list"></div>
        </div>
      </div>
    </div>
    <button class="modal-submit" id="detailReserveBtn" onclick="openModalFromDetails()">Inscrever-se</button>
  </div>
</div>

<script>
  //Pegando o nome da pasta base, isso é pq o nome da pasta base do projeto no git é diferente do nome da pasta na hostinger
  const PASTA_BASE = "<?php echo dirname($_SERVER['SCRIPT_NAME']) ?>";
</script>
<script src="js/script.js"></script>
<script>
function setFilterByName(cat) {
  document.getElementById('eventos').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const btn = [...document.querySelectorAll('.filter-btn')].find(b => {
      return b.getAttribute('onclick')?.includes(cat);
    });
    if (btn) btn.click();
  }, 400);
}
function submitReserva() {
  const nome = document.getElementById('modalName').value.trim();
  const email = document.getElementById('modalEmail').value.trim();
  const cpf = document.getElementById('modalCPF').value.trim();

  if (!nome || !email || !cpf) {
    alert('Por favor, preencha todos os campos.');
     return;
  }

  const formData = new URLSearchParams();
  formData.append('reservar', '1');
  formData.append('id_evento', id_evento);
  formData.append('id_usuario', id_usuario);
  //verificar: reservar para mais de um dia, caso o evento seja de mais de um dia ex semana academica
  //acho que nao precisa de nome email e cpf. refazer


  fetch('src/Controller/EventoController.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Mostrar mensagem de sucesso
      document.getElementById('modalForm').style.display = 'none';
      document.getElementById('modalSuccess').style.display = 'block';
    } else {
      alert('Erro ao reservar vaga: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Erro:', error);
    alert('Ocorreu um erro ao reservar vaga. Tente novamente mais tarde.');
  });
}
</script>
</body>
</html>