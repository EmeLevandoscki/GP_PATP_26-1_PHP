<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IDEAU Eventos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="ideau_eventos/assets/css/app.css" />
</head>
<body data-page="home">
  <header class="site-header">
    <a class="brand" href="index.php" aria-label="Página inicial IDEAU Eventos">
      <span class="brand-mark">LOGO</span>
      <span class="brand-text"><strong>IDEAU Eventos</strong><small>Faculdades IDEAU</small></span>
    </a>
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="Abrir menu" aria-expanded="false">Menu</button>
    <nav class="main-nav" id="mainNav">
      <a href="#eventos">Eventos</a>
      <a href="ideau_eventos/login.html" class="nav-cta">Organizador</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">Plataforma institucional de eventos</p>
        <h1>EVENTOS<br><span class="outline-word">IDEAU</span></h1>
        <p class="hero-copy">Encontre eventos acadêmicos, institucionais e abertos à comunidade. Cada evento possui uma página própria para divulgação e inscrição.</p>
        <div class="hero-actions">
          <a href="#eventos" class="btn btn-primary">Ver eventos</a>
          <a href="ideau_eventos/login.html" class="btn btn-secondary">Área do organizador</a>
        </div>
      </div>
      <aside class="hero-panel" aria-label="Resumo da plataforma">
        <div><span class="panel-number" id="statEventos">0</span><span class="panel-label">Eventos publicados</span></div>
        <div><span class="panel-number" id="statInscricdefaultoes">0</span><span class="panel-label">Inscrições registradas</span></div>
      </aside>
    </section>

    <section id="eventos" class="section-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Agenda</p>
          <h2>Próximos eventos</h2>
        </div>
        <div class="toolbar compact">
          <label class="search-box">
            <span class="sr-only">Buscar evento</span>
            <input id="searchInput" type="search" placeholder="Buscar por nome, curso, cidade ou local" />
          </label>
          <label class="select-box">
            <span class="sr-only">Filtrar categoria</span>
            <select id="categoryFilter">
              <option value="todos">Todas as categorias</option>
              <option value="recreativo">Recreativo</option>
              <!-- <option value="academico">Acadêmico</option>
              <option value="institucional">Institucional</option>
              <option value="comunidade">Comunidade</option>
              <option value="cultural">Cultural</option>
              <option value="esportivo">Esportivo</option> -->
            </select>
          </label>
        </div>
      </div>
      <div class="events-grid" id="eventsGrid"></div>
    </section>

    <section id="como-funciona" class="section-block surface-section">
    </section>
  </main>

  <footer class="site-footer">
    <div><strong>IDEAU Eventos</strong></div>
    <div class="footer-links"><a href="ideau_eventos/login.html">Organizador</a><a href="#eventos">Eventos</a></div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script src="ideau_eventos/assets/js/app.js"></script>
  <script>
    //Pegando o nome da pasta base, isso é pq o nome da pasta base do projeto no git é diferente do nome da pasta na hostinger
    const PASTA_BASE = "<?php echo dirname($_SERVER['SCRIPT_NAME']) ?>";
  </script>

</body>
</html>
