<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IDEAU Eventos</title>
  <link rel="icon" type="image/png" href="ideau_eventos/assets/img/logo__ideau.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="ideau_eventos/assets/css/home.css" />
</head>
<body data-page="home">
  <header class="site-header">
    <a class="brand" href="index.php" aria-label="Página inicial IDEAU Eventos">
      <img src="ideau_eventos/assets/img/logo__ideau.png" alt="IDEAU" />
      <span class="brand-text"><strong>IDEAU Eventos</strong><small>Faculdades IDEAU</small></span>
    </a>
    <nav class="main-nav" id="mainNav">
      <a href="#eventos">Eventos</a>
      <a href="ideau_eventos/login.html" class="nav-cta">Organizador</a>
    </nav>
    <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Alternar tema" aria-label="Alternar tema claro/escuro">🌙</button>
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="Abrir menu" aria-expanded="false">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
  </header>

  <!-- Sidebar mobile -->
  <aside class="sidebar-overlay" id="sidebarOverlay"></aside>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Menu</span>
      <button class="sidebar-close" id="sidebarClose" aria-label="Fechar menu">&times;</button>
    </div>
    <nav class="sidebar-nav">
      <a href="#eventos" class="sidebar-link" data-nav-link>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Eventos
      </a>
      <a href="ideau_eventos/login.html" class="sidebar-link" data-nav-link>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Organizador
      </a>
      <hr class="sidebar-divider">
      <button class="sidebar-link sidebar-theme-btn" id="sidebarThemeToggle">
        <span class="sidebar-theme-icon" id="sidebarThemeIcon">🌙</span>
        <span id="sidebarThemeLabel">Tema escuro</span>
      </button>
    </nav>
  </aside>

  <main>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-grid"></div>
      <div class="hero-eyebrow">Plataforma institucional de eventos</div>
      <h1>
        EVENTOS<br>
        <span class="line2">IDEAU</span>
      </h1>
      <p class="hero-sub">Encontre eventos acadêmicos, institucionais e abertos à comunidade. Cada evento possui uma página própria para divulgação e inscrição.</p>
      <div class="hero-actions">
        <a href="#eventos" class="btn-primary">Explorar Eventos</a>
      </div>
      <div class="hero-stats">
        <div class="stat">
          <div class="stat-number" id="statEventos">0</div>
          <div class="stat-label">Eventos publicados</div>
        </div>
        <div class="stat">
          <div class="stat-number" id="statInscricoes">0</div>
          <div class="stat-label">Inscrições registradas</div>
        </div>
      </div>
      <div class="hero-ticker">Role para explorar</div>
    </section>

    <!-- MARQUEE -->
    <div class="marquee-bar">
      <div class="marquee-track" id="marqueeTrack">
        <span class="marquee-item">Colônia de Férias <span class="marquee-dot"></span></span>
        <span class="marquee-item">Semanas Acadêmicas <span class="marquee-dot"></span></span>
        <span class="marquee-item">Workshops <span class="marquee-dot"></span></span>
        <span class="marquee-item">Palestras <span class="marquee-dot"></span></span>
        <span class="marquee-item">Cursos <span class="marquee-dot"></span></span>
        <span class="marquee-item">Eventos Culturais <span class="marquee-dot"></span></span>
      </div>
    </div>

    <!-- BUSCA -->
    <div class="search-section" style="padding-top:60px">
      <div class="search-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="searchInput" placeholder="Buscar por nome, curso, cidade ou local" oninput="renderHomeEvents()" />
        <div class="search-divider"></div>
        <select id="categoryFilter" onchange="renderHomeEvents()">
          <option value="todos">Todas as categorias</option>
          <option value="recreativo">Recreativo</option>
        </select>
        <button onclick="renderHomeEvents()">Buscar</button>
      </div>
    </div>

    <!-- EVENTOS -->
    <section id="eventos">
      <div class="section-label">Agenda</div>
      <h2 class="section-title">PRÓXIMOS EVENTOS</h2>
      <div class="events-grid" id="eventsGrid">
        <!-- Fallback estático enquanto o JS carrega -->
        <article class="event-card fade-up">
          <a class="card-img" href="ideau_eventos/evento.html?id=1" aria-label="Abrir Colônia de Férias de Inverno 2026">
            <img src="https://plus.unsplash.com/premium_photo-1686920245950-58617c8a602e?q=80&w=600&auto=format&fit=crop" alt="Colônia de Férias de Inverno 2026" loading="lazy" />
            <span class="card-tag">Recreativo</span>
            <div class="card-date-badge">
              <span class="day">27</span>
              <span class="month">JUL</span>
            </div>
          </a>
          <div class="card-body">
            <div class="card-meta">
              <span>Ideau Santa Clara</span>
              <span>Passo Fundo</span>
            </div>
            <h3 class="card-title">Colônia de Férias de Inverno 2026</h3>
            <p class="card-desc">Colônia de férias com atividades lúdicas, esportivas e culturais para crianças e adolescentes.</p>
            <div class="card-footer">
              <span style="font-size:0.75rem;color:var(--muted);margin-right:auto">Livre</span>
              <a class="card-btn" href="ideau_eventos/evento.html?id=1">Ver evento</a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- DESTAQUE -->
    <section id="destaque" class="featured-section">
      <div class="section-label">Em destaque</div>
      <h2 class="section-title">COLÔNIA DE FÉRIAS DE INVERNO 2026</h2>
      <div class="featured-wrap fade-up">
        <div class="featured-img">
          <div class="featured-badge">Destaque</div>
          <img src="https://plus.unsplash.com/premium_photo-1686920245950-58617c8a602e?q=80&w=800&auto=format&fit=crop" alt="Colônia de Férias" />
        </div>
        <div class="featured-content">
          <div class="section-label" style="margin-bottom:8px">Recreativo</div>
          <h2>COLÔNIA DE FÉRIAS DE INVERNO 2026</h2>
          <p>Colônia de férias com atividades lúdicas, esportivas e culturais para crianças e adolescentes.</p>
          <div class="featured-details">
            <div class="detail-row">
              <div class="detail-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div class="detail-label">Data</div>
                <div class="detail-val">27 a 31 de Julho, 2026</div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <div class="detail-label">Local</div>
                <div class="detail-val">Ideau Santa Clara — Passo Fundo</div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
              </div>
              <div>
                <div class="detail-label">Inscrição</div>
                <div class="detail-val">Gratuita — Vagas limitadas</div>
              </div>
            </div>
          </div>
          <a class="btn-primary" href="ideau_eventos/evento.html?id=1" style="display:inline-flex; text-decoration:none;">Ver Detalhes</a>
        </div>
      </div>
    </section>

  </main>

  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">
          <img src="ideau_eventos/assets/img/logo__ideau.png" alt="IDEAU" />
          <span class="footer-logo-name">IDEAU EVENTOS</span>
        </div>
        <p>A plataforma oficial de eventos das Faculdades IDEAU — Instituto de Desenvolvimento Educacional do Alto Uruguai.</p>
      </div>
      <div class="footer-col">
        <h4>Eventos</h4>
        <ul>
          <li><a href="#eventos">Próximos eventos</a></li>
          <li><a href="#destaque">Em destaque</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>IDEAU</h4>
        <ul>
          <li><a href="https://www.ideau.com.br/?unidade=6" target="_blank">Site Oficial</a></li>
          <li><a href="#">Cursos</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Acesso</h4>
        <ul>
          <li><a href="ideau_eventos/login.html">Organizador</a></li>
          <li><a href="#eventos">Eventos</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Faculdades IDEAU. Todos os direitos reservados.</p>
      <div class="socials">
        <a href="https://www.instagram.com/faculdadeideau?igsh=MXVlaHF0NjRtbzgyYw==" target="_blank" class="social-btn">ig</a>
        <a href="https://www.facebook.com/share/1ArAE5uzHj/" target="_blank" class="social-btn">fb</a>
        <a href="https://youtube.com/@faculdadesideau?si=_nvgR1ZzYD-umHM2" class="social-btn">yt</a>
      </div>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <script>
    const PASTA_BASE = "<?php echo dirname($_SERVER['SCRIPT_NAME']) ?>";
  </script>
  <script src="ideau_eventos/assets/js/app.js"></script>
  <script src="ideau_eventos/assets/js/home.js"></script>
</body>
</html>
