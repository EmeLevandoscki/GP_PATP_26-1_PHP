<?php
require_once __DIR__ . '/../src/Config/runtime.php';
require_once __DIR__ . '/../vendor/autoload.php';
\App\Service\RequestSecurity::organizerPage('login.html');
?>
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="referrer" content="no-referrer" />
  <script src="assets/js/theme.js?v=browser-theme-1"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eventos — Organizador IDEAU</title>
  <link rel="icon" type="image/png" href="assets/img/logo__ideau.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/app.css?v=20261103-self-registration-1" />
  <link rel="stylesheet" href="assets/css/admin-sidebar.css?v=20261104-menu-mobile-1" />
  <script src="assets/js/activities.js?v=3"></script>
  <link rel="stylesheet" href="assets/css/event-configuration.css?v=1">
  <link rel="stylesheet" href="assets/css/activities.css?v=1">
</head>
<body data-page="admin-events" class="admin-page">
  <aside class="admin-sidebar">
    <a class="brand admin-brand" href="dashboard.php"><img src="assets/img/logo__ideau.png" alt="IDEAU" width="44" height="44"><span class="brand-text"><strong>IDEAU Eventos</strong><small>Organizador</small></span></a>
    <nav class="admin-nav">
      <a href="dashboard.php">Dashboard</a>
      <a class="active" href="eventos.php">Eventos</a>
      <a href="evento-form.php">Novo evento</a>
      <a href="relatorios.php">Relatórios/Inscritos</a>
      <a href="configuracoes.php">Configurações</a>
    </nav>
    <div class="admin-sidebar-actions">
      <a class="btn admin-public-link full" href="../organizador/index.php"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M5 12h14"/></svg>Visualizar site</a>
      <button class="btn btn-danger full" id="logoutButton" type="button">Sair</button>
    </div>
  </aside>

  <main class="admin-main">
    <header class="admin-topbar">
      <div><p class="eyebrow">Gestão</p><h1>Eventos</h1></div>
      <div class="dashboard-actions">
        <a href="dashboard.php" class="btn btn-secondary">← Voltar ao Painel do Organizador</a>
        <details class="public-share" id="publicEventsShare">
          <summary class="btn btn-secondary"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2"/></svg>Compartilhar link público</summary>
          <div class="public-share-popover">
            <label for="publicEventsLink">Link para os participantes</label>
            <div class="public-share-copy">
              <input type="url" id="publicEventsLink" readonly spellcheck="false" aria-describedby="publicEventsLinkHint">
              <button type="button" class="btn btn-primary small" id="copyPublicEventsLink">Copiar</button>
            </div>
            <p id="publicEventsLinkHint">Página pública com os eventos disponíveis.</p>
            <div class="public-share-qr">
              <img id="publicEventsQr" width="200" height="200" alt="QR Code para abrir a página dos participantes" hidden>
              <p id="publicEventsQrStatus" role="status">Gerando QR Code...</p>
            </div>
            <div class="public-share-actions">
              <a class="btn btn-primary" id="openParticipantsPage" href="../participantes/index.php">Abrir página do participante</a>
              <a class="btn btn-secondary small" id="downloadPublicEventsQr" download="ideau-eventos-participantes.png" hidden>Baixar QR Code</a>
            </div>
            <p class="public-share-local-hint" id="publicEventsLocalHint" hidden>Este link usa localhost e só abre neste computador. Para compartilhar com outros aparelhos, acesse o sistema pelo endereço da rede ou pelo domínio publicado.</p>
          </div>
        </details>
        <a href="evento-form.php" class="btn btn-primary">Novo evento</a>
      </div>
    </header>

    <section class="panel-card">
      <div class="event-view-switch" role="group" aria-label="Visualizar eventos">
        <button type="button" class="btn btn-secondary" data-event-view="current" aria-pressed="true">Atuais <span id="currentEventsCount">0</span></button>
        <button type="button" class="btn btn-secondary" data-event-view="history" aria-pressed="false">Histórico <span id="historyEventsCount">0</span></button>
      </div>
      <div class="panel-heading"><h2 id="eventsListTitle">Eventos atuais</h2><p class="muted" id="eventsListHint">Publicados, agendados e rascunhos.</p></div>
      <div class="admin-event-search">
        <label class="form-field" for="adminEventSearch">Pesquisar eventos
          <input type="search" id="adminEventSearch" placeholder="Buscar por nome, cidade ou local" aria-controls="adminEventsTable" autocomplete="off">
        </label>
        <button type="button" class="btn btn-secondary" id="clearAdminEventSearch">Limpar busca</button>
      </div>
      <p class="muted" id="adminEventSearchCount" role="status" aria-live="polite"></p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Evento</th><th>Data</th><th>Vagas</th><th>Inscritos</th><th>Status</th><th>Ações</th></tr></thead><tbody id="adminEventsTable"></tbody></table></div>
    </section>
  </main>

  <dialog id="organizerRegistrationDialog" class="organizer-registration-dialog" aria-labelledby="organizerRegistrationTitle"
    data-organizer-email="<?= htmlspecialchars((string) ($_SESSION['publication_organizer'] ?? ''), ENT_QUOTES, 'UTF-8') ?>"></dialog>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script src="assets/js/admin-sidebar.js?v=20261024-organizer-nav-1"></script>
  <script src="assets/js/event-configuration.js?v=1"></script>
  <script src="assets/js/vendor/qrcode.js?v=83b7e8f"></script>
  <script src="assets/js/app.js?v=20261104-capas-leves-1"></script>
  <script src="assets/js/organizer-navigation.js?v=6"></script>
</body>
</html>
