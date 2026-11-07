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
  <title>Inscritos — IDEAU Eventos</title>
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
<body data-page="registrations" class="admin-page">
  <aside class="admin-sidebar">
    <a class="brand admin-brand" href="dashboard.php"><img src="assets/img/logo__ideau.png" alt="IDEAU" width="44" height="44"><span class="brand-text"><strong>IDEAU Eventos</strong><small>Organizador</small></span></a>
    <nav class="admin-nav">
      <a href="dashboard.php">Dashboard</a>
      <a href="eventos.php">Eventos</a>
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
      <div><p class="eyebrow">Controle</p><h1>Inscritos</h1></div>
      <div class="dashboard-actions"><button id="exportCsvButton" class="btn btn-primary" type="button">Exportar CSV</button></div>
    </header>

    <section class="panel-card">
      <div class="panel-heading"><h2>Lista de inscrições</h2><p class="muted">Filtre por evento e exporte os dados para planilha.</p></div>
      <!-- <div class="toolbar in-panel"><label class="select-box"><select id="registrationEventFilter"><option value="todos">Todos os eventos</option></select></label><label class="search-box"><input id="registrationSearch" type="search" placeholder="Buscar por nome, CPF, e-mail ou telefone"></label></div> -->
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Educando</th><th>Evento</th><th>Turma</th><th>Data</th><th>Ações</th></tr></thead><tbody id="registrationsTable"></tbody></table></div>
    </section>
  </main>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script src="assets/js/admin-sidebar.js?v=20261024-organizer-nav-1"></script>
  <script src="assets/js/event-configuration.js?v=1"></script>
  <script src="assets/js/app.js?v=20261104-capas-leves-1"></script>
  <script src="assets/js/organizer-navigation.js?v=6"></script>
</body>
</html>
