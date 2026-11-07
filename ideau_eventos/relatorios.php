<?php
require_once __DIR__ . '/../src/Config/runtime.php';
require_once __DIR__ . '/../vendor/autoload.php';
\App\Service\RequestSecurity::organizerPage('login.html');
?>
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <script src="assets/js/theme.js?v=browser-theme-1"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatórios — IDEAU Eventos</title>
  <link rel="icon" type="image/png" href="assets/img/logo__ideau.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/app.css?v=20261103-self-registration-1" />
  <link rel="stylesheet" href="assets/css/admin-sidebar.css?v=20261104-menu-mobile-1" />
  <link rel="stylesheet" href="assets/css/activities.css?v=1">
  <script src="assets/js/activities.js?v=2"></script>
  <link rel="stylesheet" href="assets/css/event-configuration.css?v=1">
</head>
<body data-page="reports" class="admin-page">
  <aside class="admin-sidebar">
    <a class="brand admin-brand" href="dashboard.php"><img src="assets/img/logo__ideau.png" alt="IDEAU" width="44" height="44"><span class="brand-text"><strong>IDEAU Eventos</strong><small>Organizador</small></span></a>
    <nav class="admin-nav">
      <a href="dashboard.php">Dashboard</a>
      <a href="eventos.php">Eventos</a>
      <a href="evento-form.php">Novo evento</a>
      <a class="active" href="relatorios.php">Relatórios/Inscritos</a>
      <a href="configuracoes.php">Configurações</a>
    </nav>
    <div class="admin-sidebar-actions">
      <a class="btn admin-public-link full" href="../organizador/index.php"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M5 12h14"/></svg>Visualizar site</a>
      <button class="btn btn-danger full" id="logoutButton" type="button">Sair</button>
    </div>
  </aside>

  <main class="admin-main">
    <header class="admin-topbar">
      <div><p class="eyebrow">Relatórios por evento</p><h1>Relatórios</h1></div>
      <div class="dashboard-actions" id="reportExportActions" hidden>
        <button class="btn btn-primary" id="printFilteredPdf" type="button">Gerar PDF</button>
        <button class="btn btn-secondary" id="exportFilteredExcel" type="button">Exportar Excel</button>
      </div>
    </header>

    <section class="panel-card" id="reportEventsOverview">
      <div class="panel-heading"><div><h2>Escolha um evento</h2><p class="muted">Os eventos mais recentes aparecem primeiro. Entre no card para consultar os inscritos e gerar o relatório.</p></div></div>
      <label class="search-box report-search"><input id="reportEventSearch" type="search" placeholder="Buscar evento pelo nome" aria-label="Buscar evento pelo nome"></label>
      <div class="report-grid" id="reportEventCards"></div>
    </section>

    <section class="panel-card" id="reportEventDetail" hidden>
      <a class="btn btn-secondary" href="relatorios.php">← Voltar aos eventos</a>
      <div class="report-detail-heading"><h2 id="reportSelectedTitle"></h2><p class="muted" id="reportSelectedMeta"></p><p id="reportSelectedCount" aria-live="polite"></p></div>
      <label class="search-box report-search" id="reportParticipantSearch"><input id="reportSearch" type="search" placeholder="Buscar participante, responsável, turma ou curso" aria-label="Buscar inscritos deste evento"></label>
      <div id="reportReviewControls" class="top-gap" hidden>
        <p id="reportReviewSummary" class="muted" aria-live="polite"></p>
        <label class="form-field"><span>Mostrar inscrições</span><select id="reportReviewFilter"><option value="all">Todas</option><option value="pending">Aguardando aprovação</option><option value="approved">Confirmadas</option></select></label>
      </div>
      <div class="table-wrap">
        <table class="data-table report-registration-table">
          <thead><tr id="reportRegistrationsHead"></tr></thead>
          <tbody id="reportRegistrationsTable"></tbody>
        </table>
      </div>
    </section>
  </main>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script src="assets/js/admin-sidebar.js?v=20261024-organizer-nav-1"></script>
  <script src="assets/js/event-configuration.js?v=1"></script>
  <script src="assets/js/app.js?v=20261104-capas-leves-1"></script>
  <script src="assets/js/organizer-navigation.js?v=6"></script>
</body>
</html>
