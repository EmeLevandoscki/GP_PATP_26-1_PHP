const EVENTOS_BASE = new URL('../../../', document.currentScript.src).pathname.replace(/\/$/, '');
function getPastaBase() {
  if (typeof PASTA_BASE === 'undefined') return EVENTOS_BASE;
  if (PASTA_BASE === '/') {
    return '';
  }

  return PASTA_BASE;
}

/* TEMA + SIDEBAR: lógica compartilhada entre todas as páginas */
(function () {

  /* TEMA: lê preferência salva ou detecta o sistema */
  var saved      = localStorage.getItem('ideau-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme      = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  /* TEMA: atualiza ícones do botão do header e do sidebar */
  function _syncIcons(t) {
    var btn    = document.getElementById('themeToggle');
    var sIcon  = document.getElementById('sidebarThemeIcon');
    var sLabel = document.getElementById('sidebarThemeLabel');
    if (btn)    btn.textContent    = t === 'dark' ? '🌙' : '☀️';
    if (sIcon)  sIcon.textContent  = t === 'dark' ? '🌙' : '☀️';
    if (sLabel) sLabel.textContent = t === 'dark' ? 'Tema escuro' : 'Tema claro';
  }
  _syncIcons(theme);

  /* TEMA: alterna entre claro e escuro e persiste no localStorage */
  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ideau-theme', next);
    _syncIcons(next);
  };

  /* SIDEBAR: referências aos elementos do DOM */
  var toggle    = document.getElementById('menuToggle');
  var sidebarEl = document.getElementById('sidebar');
  var overlay   = document.getElementById('sidebarOverlay');
  var closeBtn  = document.getElementById('sidebarClose');
  var themeBtn  = document.getElementById('sidebarThemeToggle');

  /* SIDEBAR: só inicializa se os elementos existirem na página */
  if (!toggle || !sidebarEl) return;

  /* SIDEBAR: abre o painel e bloqueia scroll da página */
  function openSidebar() {
    sidebarEl.classList.add('open');
    overlay.classList.add('open');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  /* SIDEBAR: fecha o painel e restaura scroll da página */
  function closeSidebar() {
    sidebarEl.classList.remove('open');
    overlay.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* SIDEBAR: eventos de interação (hambúrguer, overlay, fechar, tema, links) */
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  if (overlay)  overlay.addEventListener('click', closeSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (themeBtn) themeBtn.addEventListener('click', window.toggleTheme);
  document.querySelectorAll('[data-nav-link]').forEach(function (link) {
    link.addEventListener('click', closeSidebar);
  });

})();
(function () {
  'use strict';
  const KEYS = {
    events: 'ideauEventos.events.v3.separated',
    registrations: 'ideauEventos.registrations.v3.separated',
    session: 'ideauEventos.organizerSession.v3.separated',
    settings: 'ideauEventos.settings.v1.audienceFields'
  };

  const API_ENDPOINT = `${EVENTOS_BASE}/src/Controller/EventoController.php`;
  const PUBLICATION_ENDPOINT = new URL('../../../src/Controller/PublicacaoController.php', document.currentScript.src).href;
  let serverEvents = [], legacyEvents = [], serverRegistrations = [], legacyRegistrationCount = 0;
  let serverSession = { authenticated: false, csrf: '' };
  let eventFormDraft = null;
  let adminEventView = 'current';

  async function publicationRequest(action, data) {
    const response = await fetch(`${PUBLICATION_ENDPOINT}?action=${action}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...(data === undefined ? {} : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': serverSession.csrf },
        body: JSON.stringify(data)
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Não foi possível acessar as publicações.');
    return result;
  }

  async function loadServerEvents() {
    const adminPage = !['home', 'event-detail', 'registration', 'login'].includes(document.body.dataset.page);
    const scope = adminPage && serverSession.authenticated ? '&scope=admin' : '';
    serverEvents = await publicationRequest(`events${scope}`);
    const legacy = await listarEventosApi(Boolean(scope));
    legacyEvents = legacy.map(event => ({
      ...(DEFAULT_EVENTS.find(item => item.id === String(event.id)) || {}),
      id: String(event.id), title: event.titulo, category: event.categoria,
      createdAt: event.criado_timestamp ? new Date(Number(event.criado_timestamp) * 1000).toISOString() : null,
      date: event.data_inicio.slice(0, 10), time: event.data_inicio.slice(11, 16),
      date_begin: event.data_inicio.slice(0, 10), date_end: event.data_fim.slice(0, 10),
      time_begin: event.data_inicio.slice(11, 16), time_end: event.data_fim.slice(11, 16),
      location: event.nome_local || '', city: event.cidade || '', seats: -1,
      cover: event.foto_path || DEFAULT_EVENTS.find(item => item.id === String(event.id))?.cover || '',
      summary: event.descricao || '', description: event.descricao || '',
      publicationMode: 'published', published: event.published, closed: event.closed,
      closedAt: event.closedAt, closeReason: event.closeReason, effectiveEndAt: event.effectiveEndAt,
      registrationCount: Number(event.inscritos || 0)
    }));
    if (scope) serverRegistrations = await publicationRequest('registrations');
  }

  async function saveServerEvent(event) {
    const saved = await publicationRequest('save', event);
    serverEvents = serverEvents.filter(item => item.id !== saved.id).concat(saved);
    return saved;
  }

  const ORGANIZER = {
    email: 'organizador@ideau.edu.br',
    name: 'Organizador IDEAU'
  };

  const COURSES = [
    'Administração',
    'Análise e Desenvolvimento de Sistemas',
    'Arquitetura e Urbanismo',
    'Biomedicina',
    'Ciências Contábeis',
    'Direito',
    'Educação Física',
    'Enfermagem',
    'Engenharia Civil',
    'Estética e Cosmética',
    'Farmácia',
    'Fisioterapia',
    'Gastronomia',
    'Medicina Veterinária',
    'Nutrição',
    'Pedagogia',
    'Psicologia'
  ];

  const CATEGORIES = {
    academico: 'Acadêmico',
    institucional: 'Institucional',
    comunidade: 'Comunidade',
    cultural: 'Cultural',
    esportivo: 'Esportivo',
    recreativo: 'Recreativo'
  };

  const AUDIENCES = {
    todos: 'Todos os públicos',
    graduacao: 'Graduação',
    escola: 'Escola'
  };

  const SCHOOL_CLASSES = [
    'Berçário I',
    'Berçário II',
    'Maternal I',
    'Maternal II A',
    'Maternal II B',
    'Pré-Escola I',
    'Pré-Escola II',
    '1º Ano',
    '2º Ano',
    '3º Ano'
  ];

  const DEFAULT_SETTINGS = {
    defaults: {
      graduacao: {
        cpf: true,
        email: true,
        phone: true,
        course: true,
        community: true,
        notes: false,
        relationship: false,
        responsibleName: false,
        studentName: false,
        studentClass: false,
        extras: []
      },
      escola: {
        responsibleCPF: true,
        responsibleName: true,
        relationship: true,
        studentName: true,
        studentClass: true,
        cpf: false,
        email: true,
        phone: true,
        notes: false,
        extras: []
      }
    }
  };

  const DEFAULT_EVENTS = [
    {
      id: '1',
      title: 'Colônia de Férias de Inverno 2026',
      category: 'recreativo',
      audience: 'escola',
      date_begin: '2026-07-27',
      date_end: '2026-07-31',
      time_begin: '12:30', //será mudada a lógica na versão final
      time_end: '18:30', //será mudada a lógica na versão final
      location: 'Ideau Santa Clara',
      city: 'Passo Fundo',
      seats: '-1',
      cover: 'https://plus.unsplash.com/premium_photo-1686920245950-58617c8a602e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      summary: 'Colônia de férias com atividades lúdicas, esportivas e culturais para crianças e adolescentes.',
      description: `COLÔNIA DE FÉRIAS INFANTIL\n
                    Diversão, aprendizado e muitas aventuras esperam pelas crianças na nossa Colônia de Férias! Durante o evento, os participantes poderão aproveitar atividades recreativas, brincadeiras em grupo, oficinas criativas, jogos, esportes, música, dança e momentos de integração em um ambiente seguro e acolhedor.\n
                    Nossa programação foi pensada para estimular a criatividade, a socialização e o desenvolvimento das crianças de forma leve e divertida, sempre acompanhadas por monitores preparados.\n
                    Venha viver dias inesquecíveis cheios de alegria, amizade e novas descobertas!\n
                    Atividades recreativas\n
                    Oficinas criativas\n
                    Jogos e esportes\n
                    Música e dança\n
                    Momentos de lazer e integração`,
      published: true,
      fields: {
        cpf: false,
        email: false,
        phone: false,
        course: true,
        community: true,
        notes: false,
        responsibleName: true,
        responsibleCPF: true,
        studentName: true,
        studentClass: true,
        extras: [{ label: 'Matrícula', required: false }]
      }
    }
  ];

  let apiRegistrations = [];

  async function fetchRegistrationsFromApi() {
    const res = await fetch(`${API_ENDPOINT}?action=inscricoes_evento&id=1`); //charque arrumar
    if (!res.ok) throw new Error('Falha ao carregar inscritos');
  
    return res.json();
  }

  async function fetchRegistrationsCount() {
    const res = await fetch(`${API_ENDPOINT}?action=qtd_inscricoes_evento&id=1`); //charque arrumar
    const data = await res.json();

    return data.count;
  }

  /* EVENTOS REAIS (banco de dados)
     Trazido de js/script.js: busca os eventos e categorias direto do
     EventoController.php, em vez do localStorage mockado. */
  function eventoApiUrl(query) {
    return `${getPastaBase()}/src/Controller/EventoController.php?${query}`;
  }

  async function listarEventosApi(admin = false) {
    const res = await fetch(eventoApiUrl(`action=eventos${admin ? '&scope=admin' : ''}`), { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar eventos');
    return res.json();
  }

  async function fetchTotalEventosAtivos() {
    const res = await fetch(eventoApiUrl('action=qtdAtivos'));
    if (!res.ok) throw new Error('Falha ao carregar total de eventos ativos');
    return res.json();
  }

  function retornaDiaEvento(data) {
    if (!data) return '--';
    return data.substring(8, 10);
  }

  const NOMES_MESES_ABREV = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  function retornaMesEvento(data) {
    if (!data) return '';
    const mes = parseInt(data.substring(5, 7), 10);
    return NOMES_MESES_ABREV[mes] || '';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    seedData();
    initMenu();
    initLogout();
    const page = document.body.dataset.page;
    try {
      serverSession = await publicationRequest('session');
      await loadServerEvents();
    } catch (error) {
      showToast(error.message);
    }
    try { legacyRegistrationCount = Number(await fetchRegistrationsCount()) || 0; }
    catch (error) { console.error(error); }

    if (page === 'home') initHomePage();
    if (page === 'event-detail') initEventDetailPage();
    if (page === 'registration') initRegistrationPage();
    if (page === 'login') initLoginPage();
    if (page === 'dashboard') initDashboardPage();
    if (page === 'admin-events') initAdminEventsPage();
    if (page === 'event-form') initEventFormPage();
    if (page === 'registrations') initRegistrationsPage();
    if (page === 'reports') initReportsPage();
    if (page === 'settings') initSettingsPage();
    if (['home', 'event-detail', 'registration', 'admin-events', 'dashboard'].includes(page)) {
      let visibleState = '';
      setInterval(() => {
        if (document.hidden) return;
        document.querySelectorAll('[data-countdown]').forEach(element => {
          element.textContent = countdownLabel(element.dataset.countdown);
        });
        const currentId = new URLSearchParams(window.location.search).get('id');
        const relevantEvents = ['event-detail', 'registration'].includes(page) ? getEvents().filter(event => event.id === currentId) : getEvents();
        const state = JSON.stringify(relevantEvents.map(event => [event.id, event.published, eventIsClosed(event)]));
        if (state === visibleState) return;
        const previousState = visibleState;
        visibleState = state;
        if (!previousState) return;
        if (page === 'home') { renderHomeEvents(); renderPublicStats(); }
        if (page === 'event-detail') renderEventDetail();
        if (page === 'registration') initRegistrationPage();
        if (page === 'admin-events') renderAdminEventsTable();
        if (page === 'dashboard') renderDashboard();
      }, 1000);
      setInterval(async () => {
        if (document.hidden) return;
        const previous = JSON.stringify(serverEvents.concat(legacyEvents));
        try {
          await loadServerEvents();
          if (previous === JSON.stringify(serverEvents.concat(legacyEvents))) return;
          if (page === 'home') { renderHomeEvents(); renderPublicStats(); }
          const id = new URLSearchParams(window.location.search).get('id');
          const currentChanged = JSON.stringify(JSON.parse(previous).find(event => event.id === id)) !== JSON.stringify(getEvents().find(event => event.id === id));
          if (page === 'event-detail' && currentChanged) renderEventDetail();
          if (page === 'registration' && JSON.parse(previous).find(event => event.id === id)?.published !== getEvents().find(event => event.id === id)?.published) initRegistrationPage();
          if (page === 'admin-events') renderAdminEventsTable();
          if (page === 'dashboard') renderDashboard();
        } catch (error) { console.error(error); }
      }, 30000);
    }
  });

  function seedData() {
    if (!localStorage.getItem(KEYS.events)) saveEvents(DEFAULT_EVENTS);
    if (!localStorage.getItem(KEYS.registrations)) saveRegistrations([]);
    if (!localStorage.getItem(KEYS.settings)) saveSettings(DEFAULT_SETTINGS);
  }

  function initMenu() {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  function initLogout() {
    document.getElementById('logoutButton')?.addEventListener('click', async () => {
      try { await publicationRequest('logout', {}); }
      catch (error) { showToast(error.message); return; }
      sessionStorage.removeItem(KEYS.session);
      window.location.href = 'login.html';
    });
  }

  function initHomePage() {
    renderPublicStats();
    renderHomeEvents();
    document.getElementById('searchInput')?.addEventListener('input', renderHomeEvents);
    document.getElementById('categoryFilter')?.addEventListener('change', renderHomeEvents);
  }

  function initEventDetailPage() {
    renderEventDetail();
  }

  function initLoginPage() {
    if (isLogged()) {
      window.location.href = 'dashboard.html';
      return;
    }
    document.getElementById('loginForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const email = getValue('loginEmail').trim().toLowerCase();
      const password = getValue('loginPassword');
      try {
        serverSession = await publicationRequest('session');
        await publicationRequest('login', { email, password });
      } catch (error) {
        showToast(error.message);
        return;
      }
      sessionStorage.setItem(KEYS.session, JSON.stringify({ email, name: ORGANIZER.name, loggedAt: new Date().toISOString() }));
      window.location.href = 'dashboard.html';
    });
  }

  async function initDashboardPage() {
    if (!requireAuth()) return;
    apiRegistrations = await fetchRegistrationsFromApi();
    renderDashboard();
  }

  function initAdminEventsPage() {
    if (!requireAuth()) return;
    renderAdminEventsTable();
    document.querySelectorAll('[data-event-view]').forEach(button => {
      button.addEventListener('click', () => {
        adminEventView = button.dataset.eventView;
        renderAdminEventsTable();
      });
    });
    document.getElementById('resetDemoData')?.addEventListener('click', () => {
      if (!confirm('Restaurar eventos de demonstração? Isso remove alterações locais.')) return;
      saveEvents(DEFAULT_EVENTS);
      saveRegistrations([]);
      renderAdminEventsTable();
      showToast('Dados de demonstração restaurados.');
    });
    document.addEventListener('click', handleAdminEventActions);
  }

  function initEventFormPage() {
    if (!requireAuth()) return;
    const editing = getEvents().find(event => event.id === new URLSearchParams(window.location.search).get('id'));
    if (editing && eventIsClosed(editing)) {
      document.getElementById('eventForm').innerHTML = '<section class="panel-card"><h2>Evento encerrado</h2><p class="muted">Este evento está no histórico. Os dados e as inscrições foram preservados.</p><a class="btn btn-secondary" href="eventos.html">Voltar para eventos</a></section>';
      return;
    }
    initEventAudienceControls();
    initEventCoverUpload();
    document.querySelectorAll('input[name="publicationMode"]').forEach(option => {
      option.addEventListener('change', () => {
        setValue('eventPublicationMode', option.value);
        togglePublicationFields();
      });
    });
    togglePublicationFields();
    populateEventForm();
    eventFormDraft = initEventFormDraft();
    const form = document.getElementById('eventForm');
    form.noValidate = true;
    form?.addEventListener('input', event => {
      if (event.target.matches('input:not([type="file"]), select, textarea')) {
        event.target.setCustomValidity('');
      }
      showEventFormErrors(false);
    });
    form.addEventListener('change', () => showEventFormErrors(false));
    form.addEventListener('click', event => {
      const link = event.target.closest('[data-error-field]');
      if (!link) return;
      event.preventDefault();
      const field = document.getElementById(link.dataset.errorField);
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    form?.addEventListener('submit', handleEventFormSubmit);
    form.setAttribute('aria-busy', 'false');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Salvar evento';
  }

  function initEventFormDraft() {
    const form = document.getElementById('eventForm');
    const eventId = new URLSearchParams(window.location.search).get('id') || 'new';
    const key = `ideauEventos.eventForm.v1:${window.location.pathname}:${eventId}`;
    const coverKey = `${key}:cover`;
    const fields = [...form.querySelectorAll('input[id], select[id], textarea[id]')]
      .filter(field => !['eventId', 'eventCover', 'eventCoverFile', 'eventAudience'].includes(field.id));
    let active = true;
    let warned = false;
    let storedCover = null;
    const warn = () => {
      if (warned) return;
      warned = true;
      showToast('Não foi possível guardar todo o preenchimento nesta aba. Salve o evento antes de atualizar.');
    };

    try {
      const draft = JSON.parse(sessionStorage.getItem(key) || 'null');
      storedCover = sessionStorage.getItem(coverKey);
      if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
        fields.filter(field => field.type !== 'checkbox').forEach(field => {
          if (typeof draft[field.id] === 'string') field.value = draft[field.id];
        });
        // A instituição define as opções disponíveis antes de restaurar as escolhas.
        syncEventInstitution();
        fields.filter(field => field.type === 'checkbox').forEach(field => {
          if (typeof draft[field.id] === 'boolean') field.checked = draft[field.id];
        });
        toggleAudienceFieldGroups();
        togglePublicationFields();
        if (storedCover !== null) {
          setValue('eventCover', storedCover);
          showEventCoverPreview(storedCover);
        }
      }
    } catch { warn(); }

    function save() {
      if (!active) return;
      const draft = Object.fromEntries(fields.map(field => [field.id, field.type === 'checkbox' ? field.checked : field.value]));
      // O evento input do rádio ocorre antes do change que atualiza o campo oculto.
      draft.eventPublicationMode = form.querySelector('input[name="publicationMode"]:checked')?.value || getValue('eventPublicationMode');
      try {
        sessionStorage.setItem(key, JSON.stringify(draft));
        const cover = getValue('eventCover');
        if (cover !== storedCover) {
          // Evita gravar a imagem novamente a cada tecla digitada.
          sessionStorage.removeItem(coverKey);
          storedCover = null;
          sessionStorage.setItem(coverKey, cover);
          storedCover = cover;
        }
      } catch { warn(); }
    }

    function clear() {
      active = false;
      try {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(coverKey);
      } catch { /* O evento já foi salvo no servidor. */ }
    }

    form.addEventListener('input', save);
    form.addEventListener('change', save);
    document.getElementById('applyAudienceDefaults')?.addEventListener('click', save);
    window.addEventListener('pagehide', save);
    return { save, clear };
  }

  function initEventCoverUpload() {
    const input = document.getElementById('eventCoverFile');
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.setCustomValidity('');
      if (!file) {
        input.required = !getValue('eventCover');
        return;
      }
      setValue('eventCover', '');
      showEventCoverPreview('');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        input.value = '';
        input.setCustomValidity('Escolha uma imagem PNG, JPG ou WEBP.');
        showToast('Escolha uma imagem PNG, JPG ou WEBP.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        input.value = '';
        input.setCustomValidity('A imagem deve ter no máximo 2 MB.');
        showToast('A imagem deve ter no máximo 2 MB.');
        return;
      }
      const reader = new FileReader();
      input.setCustomValidity('Aguarde o carregamento da imagem antes de salvar.');
      reader.addEventListener('load', () => {
        if (input.files?.[0] !== file) return;
        setValue('eventCover', String(reader.result || ''));
        showEventCoverPreview(String(reader.result || ''));
        input.setCustomValidity('');
        eventFormDraft?.save();
        showEventFormErrors(false);
      });
      reader.addEventListener('error', () => {
        if (input.files?.[0] !== file) return;
        input.value = '';
        input.setCustomValidity('Não foi possível carregar a imagem. Selecione o arquivo novamente.');
        showToast('Não foi possível carregar a imagem. Selecione o arquivo novamente.');
      });
      reader.readAsDataURL(file);
    });
  }

  function showEventCoverPreview(source) {
    const input = document.getElementById('eventCoverFile');
    if (input) input.required = !source;
    const preview = document.getElementById('eventCoverPreview');
    if (!preview) return;
    preview.src = source;
    preview.hidden = !source;
  }

  async function initRegistrationsPage() {
    if (!requireAuth()) return;

    apiRegistrations = await fetchRegistrationsFromApi();
    renderRegistrationFilters();
    setValue('registrationEventFilter', new URLSearchParams(window.location.search).get('event') || 'todos');
    renderRegistrationsTable();

    document.getElementById('registrationEventFilter')?.addEventListener('change', renderRegistrationsTable);
    document.getElementById('registrationSearch')?.addEventListener('input', renderRegistrationsTable);
    document.getElementById('exportCsvButton')?.addEventListener('click', exportRegistrationsCsv);
    document.addEventListener('click', event => {
      const removeId = event.target.closest('[data-remove-registration]')?.dataset.removeRegistration;
      if (!removeId) return;
      if (!confirm('Excluir esta inscrição?')) return;
      saveRegistrations(getRegistrations().filter(item => item.id !== removeId));
      renderRegistrationsTable();
      showToast('Inscrição excluída.');
    });
  }

  async function initReportsPage() {
    if (!requireAuth()) return;

    apiRegistrations = await fetchRegistrationsFromApi();
    renderReportsPage();
    
    document.getElementById('reportEventSearch')?.addEventListener('input', renderReportsPage);
    document.getElementById('reportSearch')?.addEventListener('input', renderReportsPage);
    const selectedId = new URLSearchParams(window.location.search).get('event');
    document.getElementById('exportFilteredExcel')?.addEventListener('click', () => {
      if (getEvents().some(event => String(event.id) === selectedId)) exportEventExcel(selectedId);
    });
    document.getElementById('printFilteredPdf')?.addEventListener('click', () => {
      if (getEvents().some(event => String(event.id) === selectedId)) printEventReport(selectedId);
    });
    document.getElementById('reportEventCards')?.addEventListener('click', event => {
      const button = event.target.closest('[data-report-export]');
      if (!button) return;
      const eventId = button.dataset.eventId;
      if (!getEvents().some(item => String(item.id) === eventId)) return;
      if (button.dataset.reportExport === 'pdf') printEventReport(eventId);
      if (button.dataset.reportExport === 'excel') exportEventExcel(eventId);
    });
  }

  function initEventAudienceControls() {
    const select = document.getElementById('eventAudience');
    if (!select) return;
    select.addEventListener('change', () => {
      syncEventInstitution();
    });
    document.getElementById('eventInstitution')?.addEventListener('change', () => syncEventInstitution());
    document.getElementById('applyAudienceDefaults')?.addEventListener('click', () => {
      if (!select.value) return;
      applyDefaultFields(select.value);
      toggleAudienceFieldGroups();
      showToast('Padrão de campos aplicado.');
    });
    syncEventInstitution();
  }

  function syncEventInstitution() {
    const institution = document.getElementById('eventInstitution');
    const select = document.getElementById('eventAudience');
    if (!institution || !select) return;
    const type = institution.selectedOptions[0]?.dataset.type;
    const audience = type === 'escola' ? 'escola' : type === 'faculdade' ? 'graduacao' : '';
    const changed = select.value !== audience;
    const label = audience === 'escola' ? 'Escola / Educação Infantil'
      : audience === 'graduacao' ? 'Faculdade / Graduação' : 'Selecione primeiro a instituição';
    select.replaceChildren(new Option(label, audience));
    select.disabled = !audience;
    document.getElementById('applyAudienceDefaults').disabled = !audience;
    setText('eventAudienceHint', audience === 'escola'
      ? 'Os pais ou responsáveis fazem a inscrição, informando seus dados e os do educando.'
      : audience === 'graduacao' ? 'O participante faz a própria inscrição com seus dados acadêmicos.'
      : 'Selecione a instituição para ver os campos de inscrição.');
    if (changed && audience) applyDefaultFields(audience);
    toggleAudienceFieldGroups();
  }

  function initSettingsPage() {
    if (!requireAuth()) return;
    renderSettingsForms();
    document.getElementById('settingsForm')?.addEventListener('submit', handleSettingsSubmit);
    document.getElementById('resetSettingsButton')?.addEventListener('click', () => {
      if (!confirm('Restaurar os padrões de campos para graduação e escola?')) return;
      saveSettings(DEFAULT_SETTINGS);
      renderSettingsForms();
      showToast('Configurações restauradas.');
    });
  }

  function requireAuth() {
    if (isLogged()) return true;
    window.location.href = 'login.html';
    return false;
  }

  function isLogged() {
    return serverSession.authenticated;
  }

  async function renderPublicStats() {
    let totalAtivos = 0;
    try {
      totalAtivos = await fetchTotalEventosAtivos();
    } catch (error) {
      console.error(error);
    }
    setText('statEventos', Number(totalAtivos) + serverEvents.filter(event => event.published && !eventIsClosed(event)).length);
    const publishedEvents = getEvents().filter(event => event.published && !eventIsClosed(event));
    setText('statInscricoes', publishedEvents.reduce((total, event) => total + countRegistrations(event.id), 0));
  }

  async function renderHomeEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    const query = getValue('searchInput').toLowerCase();
    const category = (getValue('categoryFilter') || 'todos').toLowerCase();

    let eventos;
    try {
      eventos = await listarEventosApi();
    } catch (error) {
      console.error(error);
      if (!serverEvents.some(event => event.published && !eventIsClosed(event))) {
        renderFeaturedEvent([]);
        grid.innerHTML = '<div class="empty-state">Não foi possível carregar os eventos. Tente novamente mais tarde.</div>';
        return;
      }
      eventos = [];
    }

    eventos = eventos.concat(serverEvents.filter(event => event.published && !eventIsClosed(event)).map(event => ({
      id: event.id, titulo: event.title, descricao: event.summary, categoria: CATEGORIES[event.category] || event.category,
      data_inicio: `${event.date} ${event.time}`, foto_path: event.cover, nome_local: event.location, cidade: event.city, valor: 0
    })));

    renderFeaturedEvent(eventos);

    const events = eventos
      .filter(evento => category === 'todos' || (evento.categoria || '').toLowerCase() === category)
      .filter(evento => !query || [evento.titulo, evento.descricao, evento.nome_local, evento.cidade, evento.categoria].join(' ').toLowerCase().includes(query))
      .sort((a, b) => String(a.data_inicio || '').localeCompare(String(b.data_inicio || '')));

    if (!events.length) {
      grid.innerHTML = '<div class="empty-state">Nenhum evento publicado encontrado.</div>';
      return;
    }

    grid.innerHTML = events.map(eventCardTemplate).join('');
  }

  function renderFeaturedEvent(events) {
    const section = document.getElementById('destaque');
    if (!section) return;
    const event = events.find(item => Number(item.destaque) === 1) || events[0];
    section.hidden = !event;
    document.querySelectorAll('a[href="#destaque"]').forEach(link => { link.hidden = !event; });
    if (!event) { section.innerHTML = ''; return; }
    const date = String(event.data_inicio || '').slice(0, 10);
    const end = String(event.data_fim || '').slice(0, 10);
    const price = Number(event.valor) > 0 ? `R$ ${Number(event.valor).toFixed(2).replace('.', ',')}` : 'Gratuita';
    section.innerHTML = `<div class="section-label">Em destaque</div><h2 class="section-title">${escapeHtml(event.titulo)}</h2>
      <div class="featured-wrap"><div class="featured-img"><div class="featured-badge">Destaque</div><img src="${escapeAttr(event.foto_path || `${getPastaBase()}/uploads/foto_generica_1.png`)}" alt="${escapeAttr(event.titulo)}" loading="lazy"></div>
      <div class="featured-content"><div class="section-label">${escapeHtml(event.categoria || 'Evento')}</div><h2>${escapeHtml(event.titulo)}</h2><p>${escapeHtml(event.descricao || '')}</p>
      <div class="featured-details"><div class="detail-row"><div><div class="detail-label">Data</div><div class="detail-val">${escapeHtml(formatDate(date))}${end && end !== date ? ` — ${escapeHtml(formatDate(end))}` : ''}</div></div></div>
      <div class="detail-row"><div><div class="detail-label">Local</div><div class="detail-val">${escapeHtml([event.nome_local, event.cidade].filter(Boolean).join(' — '))}</div></div></div>
      <div class="detail-row"><div><div class="detail-label">Inscrição</div><div class="detail-val">${price}</div></div></div></div>
      <a class="btn-primary" href="ideau_eventos/evento.html?id=${encodeURIComponent(event.id)}">Ver detalhes</a></div></div>`;
  }

  function eventCardTemplate(evento) {
    const capaPadrao = `${getPastaBase()}/uploads/foto_generica_1.png`;
    const preco = Number(evento.valor) > 0
      ? `R$ ${Number(evento.valor).toFixed(2).replace('.', ',')}`
      : 'Gratuito';
    return `
      <article class="event-card">
        <a class="card-img" href="ideau_eventos/evento.html?id=${encodeURIComponent(evento.id)}" aria-label="Abrir ${escapeAttr(evento.titulo)}">
          <img src="${escapeAttr(evento.foto_path || capaPadrao)}" alt="${escapeAttr(evento.titulo)}" loading="lazy" onerror="this.onerror=null; this.src='${capaPadrao}'" />
          <span class="card-tag">${escapeHtml(evento.categoria || 'Evento')}</span>
          <div class="card-date-badge">
            <span class="day">${retornaDiaEvento(evento.data_inicio)}</span>
            <span class="month">${retornaMesEvento(evento.data_inicio)}</span>
          </div>
        </a>
        <div class="card-body">
          <div class="card-meta">
            <span>${escapeHtml(evento.cidade || '')}</span>
            <span>${evento.nome_local ? escapeHtml(evento.nome_local) : ''}</span>
          </div>
          <h3 class="card-title">${escapeHtml(evento.titulo)}</h3>
          <p class="card-desc">${escapeHtml(evento.descricao || '')}</p>
          <div class="card-footer">
            <span style="font-size:0.75rem;color:var(--muted);margin-right:auto">${preco}</span>
            <a class="card-btn" href="ideau_eventos/evento.html?id=${encodeURIComponent(evento.id)}">Ver evento</a>
          </div>
        </div>
      </article>`;
  }

  function renderEventDetail() {
    const root = document.getElementById('eventDetailRoot');
    if (!root) return;
    root.querySelector('.evento-layout')?.remove();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const event = getEvents().find(item => item.id === id && item.published);

    const navRegistration = document.getElementById('eventRegistrationNav');
    if (navRegistration && id) navRegistration.href = eventRegistrationUrl(id);

    if (!event) {
      root.innerHTML += `
        <div class="evento-layout" style="place-items:center">
          <div class="empty-state">
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:2rem">Evento indisponível</h2>
            <p style="margin:8px 0 18px">O evento pode ter sido encerrado ou retirado do ar. As inscrições não estão disponíveis.</p>
            <a class="btn btn-primary" href="../index.php#eventos" style="display:inline-flex;width:auto;padding:10px 24px">Voltar para eventos</a>
          </div>
        </div>`;
      return;
    }

    document.title = `Evento — ${event.title}`;

    const remaining = event.seats != -1 ? Math.max(Number(event.seats || 0) - countRegistrations(event.id), 0) : -1;
    const seatsLabel = event.seats == -1 ? 'Livre' : `${remaining} de ${Number(event.seats || 0)}`;
    const isSoldOut = event.seats != -1 && remaining <= 0;
    const cover = event.cover ? `<img src="${escapeAttr(event.cover)}" alt="${escapeAttr(event.title)}">` : '';
    const ICO_CAL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    const ICO_CLK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    const ICO_PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    const categoryLabel = escapeHtml(CATEGORIES[event.category] || event.category);

    root.innerHTML += `
      <div class="evento-layout">
        <div class="evento-visual">
          <div class="evento-cover">
            ${cover || '<div class="cover-placeholder"></div>'}
            <div class="cover-overlay"></div>
            <span class="cover-badge">${categoryLabel}</span>
          </div>
          <div class="evento-meta-card">
            <div class="meta-item">
              <span class="meta-icon">${ICO_CAL}</span>
              <div class="meta-content">
                <span class="meta-label">Data de início</span>
                <span class="meta-value">${formatDate(event.date_begin)}</span>
              </div>
            </div>
            <div class="meta-item">
              <span class="meta-icon">${ICO_CAL}</span>
              <div class="meta-content">
                <span class="meta-label">Encerramento</span>
                <span class="meta-value">${formatDate(event.date_end)}</span>
              </div>
            </div>
            <div class="meta-item">
              <span class="meta-icon">${ICO_CLK}</span>
              <div class="meta-content">
                <span class="meta-label">Horário</span>
                <span class="meta-value">${escapeHtml(event.time_begin)} — ${escapeHtml(event.time_end)}</span>
              </div>
            </div>
            <div class="meta-item">
              <span class="meta-icon">${ICO_PIN}</span>
              <div class="meta-content">
                <span class="meta-label">Local</span>
                <span class="meta-value">${escapeHtml(event.location)}</span>
                <span class="meta-sub">${escapeHtml(event.city)}</span>
              </div>
            </div>
          </div>
          <div class="evento-actions">
            ${isSoldOut
              ? '<button class="btn-inscricao" type="button" disabled>Vagas esgotadas</button>'
              : `<a class="btn-inscricao" href="${eventRegistrationUrl(event.id)}">Ir para inscrição <span aria-hidden="true">→</span></a>`}
            <a class="btn-outros" href="../index.php#eventos">Ver outros eventos</a>
          </div>
        </div>
        <div class="evento-info-wrap">
          <div class="evento-kicker">
            <span class="vagas-pill${isSoldOut ? ' esgotada' : ''}">${isSoldOut ? 'Vagas esgotadas' : (event.seats == -1 ? 'Entrada livre' : `${remaining} vagas disponíveis`)}</span>
          </div>
          <h1>${escapeHtml(event.title)}</h1>
          ${event.effectiveEndAt ? `<p class="muted">Inscrições até ${escapeHtml(formatDateTime(event.effectiveEndAt))}<br><span data-countdown="${escapeAttr(event.effectiveEndAt)}">${countdownLabel(event.effectiveEndAt)}</span></p>` : ''}
          <p class="evento-summary">${escapeHtml(event.summary)}</p>
          ${event.description ? `
          <div class="evento-descricao">
            <div class="descricao-header">
              <span class="descricao-line"></span>
              <span class="descricao-label">Sobre o evento</span>
            </div>
            <div class="descricao-text">${escapeHtml(event.description)}</div>
          </div>` : ''}
        </div>
      </div>`;
  }

  function eventRegistrationUrl(eventId) {
    return `inscricao.html?id=${encodeURIComponent(eventId)}`;
  }

  function initRegistrationPage() {
    const root = document.getElementById('registrationRoot');
    if (!root) return;
    root.querySelector('.inscricao-layout')?.remove();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const event = getEvents().find(item => item.id === id && item.published);
    const receipts = (serverSession.receipts || []).filter(item => item.eventId === id);
    const receiptLinks = receipts.length ? `<section class="confirmed-registration" data-registration-receipts>
      <div class="confirmed-registration-heading">
        <span class="confirmed-registration-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></span>
        <div><h2>Inscrição confirmada</h2><p>Seu comprovante está disponível para download.</p></div>
      </div>` + receipts.map(item =>
      `<div class="confirmed-registration-person"><div><span>Participante</span><strong>${escapeHtml(item.name)}</strong></div><nav class="confirmed-registration-actions" aria-label="Ações da inscrição de ${escapeAttr(item.name)}"><a class="confirmed-registration-link" href="comprovante.php?id=${encodeURIComponent(item.id)}" aria-label="Ver comprovante de ${escapeAttr(item.name)}">Ver comprovante <span aria-hidden="true">→</span></a><a class="confirmed-registration-link confirmed-registration-cancel" href="comprovante.php?id=${encodeURIComponent(item.id)}&amp;cancel=1#cancelar-inscricao" aria-label="Cancelar inscrição de ${escapeAttr(item.name)}">Cancelar inscrição</a></nav></div>`).join('') + '</section>' : '';

    const navDetails = document.getElementById('eventDetailsNav');
    if (navDetails && id) navDetails.href = `evento.html?id=${encodeURIComponent(id)}`;

    if (!event) {
      root.innerHTML += `
        <div class="inscricao-layout" style="place-items:center">
          <div class="empty-state">
            ${receiptLinks}
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:2rem">Inscrições encerradas ou indisponíveis</h2>
            <p style="margin:8px 0 18px">O evento pode ter sido encerrado ou retirado do ar.</p>
            <a class="btn-primary" href="../index.php#eventos" style="display:inline-flex;width:auto;padding:10px 24px">Voltar para eventos</a>
          </div>
        </div>`;
      return;
    }

    document.title = `Inscrição — ${event.title}`;

    const remaining = event.seats != -1 ? Math.max(Number(event.seats || 0) - countRegistrations(event.id), 0) : -1;
    const seatsLabel = remaining === -1 ? 'Ilimitadas' : `${remaining} disponíveis de ${Number(event.seats || 0)}`;
    const isSoldOut = event.seats != -1 && remaining <= 0;

    root.innerHTML += `
      <div class="inscricao-layout">
        <div class="inscricao-info">
          <div class="inscricao-eyebrow">${escapeHtml(CATEGORIES[event.category] || event.category)}</div>
          <h1>${escapeHtml(event.title)}</h1>
          <p class="inscricao-sub">Preencha os dados ao lado para confirmar sua participação neste evento.</p>
          ${event.effectiveEndAt ? `<p>Inscrições até ${escapeHtml(formatDateTime(event.effectiveEndAt))}<br><span data-countdown="${escapeAttr(event.effectiveEndAt)}">${countdownLabel(event.effectiveEndAt)}</span></p>` : ''}
          <div class="inscricao-meta">
            <div class="inscricao-meta-item"><strong>Data</strong> ${formatDate(event.date_begin)} — ${formatDate(event.date_end)}</div>
            <div class="inscricao-meta-item"><strong>Horário</strong> ${escapeHtml(event.time_begin)} — ${escapeHtml(event.time_end)}</div>
            <div class="inscricao-meta-item"><strong>Local</strong> ${escapeHtml(event.location)} — ${escapeHtml(event.city)}</div>
            <div class="inscricao-meta-item inscricao-seats"><span class="seats-pill">${seatsLabel}</span></div>
          </div>
          <a class="inscricao-back-btn" href="evento.html?id=${encodeURIComponent(event.id)}">&larr; Voltar para o evento</a>
          ${receiptLinks}
        </div>
        <div class="inscricao-form-wrap" id="inscricao">
          <div class="audience-pill">${escapeHtml(AUDIENCES[getEventAudience(event)])}</div>
          <h2 class="inscricao-form-title">Confirmar inscrição</h2>
          <p class="inscricao-form-sub">Dados do participante</p><p class="inscricao-form-sub">Já se inscreveu? <a href="consultar-inscricao.php">Consultar minha inscrição</a></p>
          ${isSoldOut ? '<div class="empty-state">Vagas esgotadas. Se você já se inscreveu, informe os mesmos dados abaixo para recuperar seu comprovante.</div>' : ''}
          ${registrationFormTemplate(event)}
        </div>
      </div>`;

    document.getElementById('registrationForm')?.addEventListener('submit', submitRegistration);
    document.getElementById('participantType')?.addEventListener('change', updateCourseVisibility);
    updateCourseVisibility();
  }

  function requestedFieldsSummary(fields = {}, audience = 'graduacao') {
    const names = [];
    if (audience === 'escola') {
      if (fields.responsibleCPF) names.push('CPF do responsável');
      if (fields.responsibleName !== false) names.push('Nome do responsável');
      if (fields.relationship !== false) names.push('Grau de parentesco');
      if (fields.studentName !== false) names.push('Nome do educando');
      if (fields.studentClass !== false) names.push('Turma do educando');
    } else {
      names.push('Nome completo');
      if (fields.course) names.push('Curso');
      if (fields.community) names.push('Comunidade externa');
    }
    if (fields.cpf) names.push('CPF');
    if (fields.email) names.push('E-mail');
    if (fields.phone) names.push('Telefone');
    if (fields.notes) names.push('Observações');
    const extras = Array.isArray(fields.extras) ? fields.extras.map(extra => extra.label).filter(Boolean) : [];
    return names.concat(extras).join(', ');
  }
  function registrationFormTemplate(event) {
    const audience = getEventAudience(event);
    const fields = event.fields || {};
    const extras = Array.isArray(fields.extras) ? fields.extras : [];
    const courseOptions = COURSES.map(course => `<option value="${escapeAttr(course)}">${escapeHtml(course)}</option>`).join('');
    const relationshipOptions = ['Pai', 'Mãe', 'Tio(a)', 'Avô(ó)', 'Responsável legal', 'Outro'].map(rel => `<option value="${escapeAttr(rel)}">${escapeHtml(rel)}</option>`).join('');
    const classOptions = SCHOOL_CLASSES.map(item => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join('');
    const showGraduationTypeSelect = audience === 'graduacao' && Boolean(fields.course || fields.community);

    const graduationFields = audience === 'graduacao' ? `
        <label class="form-field"><span>Nome completo *</span><input name="name" required maxlength="255" autocomplete="name" placeholder="Seu nome completo"></label>
        ${showGraduationTypeSelect ? participantTypeTemplate(fields) : ''}
        ${fields.course ? `<label class="form-field" id="courseField"><span>Curso *</span><select name="course" id="courseSelect"><option value="">Selecione o curso</option>${courseOptions}</select></label>` : ''}` : '';

    const schoolFields = audience === 'escola' ? `
        <input type="hidden" name="participantType" value="escola">
        ${fields.responsibleName !== false ? '<label class="form-field"><span>Nome do responsável *</span><input name="responsibleName" required maxlength="255" autocomplete="name" placeholder="Nome completo do responsável"></label>' : ''}
        ${fields.responsibleCPF ? '<label class="form-field"><span>CPF do responsável *</span><input name="responsibleCpf" required inputmode="numeric" pattern="[0-9]{11}" maxlength="11" minlength="11" placeholder="000.000.000-00"></label>' : ''}
        ${fields.relationship !== false ? `<label class="form-field"><span>Grau de Parentesco *</span><select name="relationship" required><option value="">Selecione o Grau de Parentesco</option>${relationshipOptions}</select></label>` : ''}
        ${fields.studentName !== false ? '<label class="form-field"><span>Nome do educando *</span><input name="studentName" required maxlength="255" placeholder="Nome completo do educando"></label>' : ''}
        ${fields.studentClass !== false ? `<label class="form-field"><span>Turma do educando *</span><select name="studentClass" required><option value="">Selecione a turma</option>${classOptions}</select></label>` : ''}` : '';

    return `
      <form class="form-stack" id="registrationForm" data-event-id="${escapeAttr(event.id)}">
        ${graduationFields}
        ${schoolFields}
        ${fields.cpf ? '<label class="form-field"><span>CPF *</span><input name="cpf" required inputmode="numeric" pattern="[0-9]{11}" maxlength="11" minlength="11" placeholder="000.000.000-00"></label>' : ''}
        ${fields.email ? '<label class="form-field"><span>E-mail *</span><input name="email" type="email" required autocomplete="email" placeholder="seu@email.com"></label>' : ''}
        ${fields.phone ? '<label class="form-field"><span>Telefone *</span><input name="phone" required inputmode="tel" autocomplete="tel" placeholder="(54) 99999-9999"></label>' : ''}
        ${extras.map(extra => `<label class="form-field"><span>${escapeHtml(extra.label)} ${extra.required ? '*' : ''}</span><input name="extra_${slugify(extra.label)}" ${extra.required ? 'required' : ''} placeholder="${escapeAttr(extra.label)}"></label>`).join('')}
        ${fields.notes ? '<label class="form-field"><span>Observações</span><textarea name="notes" rows="3" placeholder="Informações adicionais"></textarea></label>' : ''}
        <button class="btn btn-primary full" type="submit">Confirmar inscrição</button>
      </form>`;
  }

  function participantTypeTemplate(fields) {
    if (fields.course && fields.community) {
      return `<label class="form-field"><span>Vínculo *</span><select name="participantType" id="participantType" required><option value="aluno">Sou aluno(a) / curso IDEAU</option><option value="comunidade">Sou da comunidade</option></select></label>`;
    }
    if (fields.course) {
      return '<input type="hidden" name="participantType" value="aluno">';
    }
    return `<label class="form-field"><span>Vínculo *</span><select name="participantType" id="participantType" required><option value="comunidade">Comunidade</option></select></label>`;
  }

  function updateCourseVisibility() {
    const type = document.getElementById('participantType')?.value;
    const courseField = document.getElementById('courseField');
    const courseSelect = document.getElementById('courseSelect');
    if (!courseField || !courseSelect) return;
    const isCommunity = type === 'comunidade';
    courseField.hidden = isCommunity;
    courseSelect.required = !isCommunity;
    if (isCommunity) courseSelect.value = '';
  }

  function openRegistrationReceipt(result, form) {
    if (!result.success || !/^comprovante\.php\?id=[a-f0-9]{64}$/.test(result.receiptUrl || '')) {
      throw new Error('Não foi possível abrir o comprovante. Tente novamente com os mesmos dados.');
    }
    if (result.alreadyRegistered) {
      let notice = form.querySelector('[data-registration-notice]');
      if (!notice) {
        notice = document.createElement('div');
        notice.dataset.registrationNotice = '';
        notice.className = 'registration-notice';
        notice.setAttribute('role', 'status');
        notice.tabIndex = -1;
        form.querySelector('button[type="submit"]').before(notice);
      }
      notice.innerHTML = `<strong>Você já está inscrito neste evento.</strong><p>Sua inscrição continua confirmada. Não é necessário enviar novamente.</p><div class="registration-notice-actions"><a href="${escapeAttr(result.receiptUrl)}">Ver meu comprovante <span aria-hidden="true">→</span></a><a class="registration-notice-cancel" href="${escapeAttr(result.receiptUrl)}&amp;cancel=1#cancelar-inscricao">Cancelar inscrição</a></div>`;
      form.querySelector('button[type="submit"]').disabled = false;
      notice.focus();
      return;
    }
    window.location.assign(result.receiptUrl);
  }

  async function submitRegistration(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const eventId = form.dataset.eventId;
    const targetEvent = getEvents().find(item => item.id === eventId);
    if (!targetEvent) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const extraValues = {};
    Object.keys(data).forEach(key => {
      if (key.startsWith('extra_')) extraValues[key.replace('extra_', '')] = data[key];
    });

    const audience = getEventAudience(targetEvent);
    const responsibleName = clean(data.responsibleName);
    const studentName = clean(data.studentName);
    const registration = {
      id: `reg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      eventId,
      createdAt: new Date().toISOString(),
      audience,
      name: audience === 'escola' ? (studentName || responsibleName) : clean(data.name || responsibleName || studentName),
      responsibleName,
      responsibleCpf: clean(data.responsibleCpf),
      studentName,
      studentClass: clean(data.studentClass),
      cpf: clean(data.cpf),
      email: clean(data.email),
      phone: clean(data.phone),
      participantType: clean(data.participantType || (audience === 'escola' ? 'escola' : 'participante')),
      course: clean(data.course),
      notes: clean(data.notes),
      relationship: clean(data.relationship),
      extras: extraValues
    };

    if (String(eventId).startsWith('evt-')) {
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const result = await publicationRequest('register', registration);
        openRegistrationReceipt(result, form);
      } catch (error) { showToast(error.message); button.disabled = false; }
      return;
    }

    const payload = new URLSearchParams();
    payload.append('inscrever', '1');
    payload.append('event_id', eventId);
    payload.append('audience', audience);
    payload.append('name', registration.name || '');
    payload.append('responsible_name', registration.responsibleName || '');
    payload.append('responsible_cpf', registration.responsibleCpf || '');
    payload.append('relationship', registration.relationship || '');
    payload.append('student_name', registration.studentName || '');
    payload.append('student_class', registration.studentClass || '');
    payload.append('cpf', registration.cpf || '');
    payload.append('email', registration.email || '');
    payload.append('phone', registration.phone || '');
    payload.append('participant_type', registration.participantType || '');
    payload.append('course', registration.course || '');
    payload.append('notes', registration.notes || '');
    payload.append('extras', JSON.stringify(registration.extras || {}));

    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          button.disabled = false;
          showToast(data.message || 'Erro ao registrar inscrição.');
          return;
        }

        openRegistrationReceipt(data, form);
      })
      .catch((error) => {
        console.log(error);
        button.disabled = false;
        showToast('Erro ao enviar inscrição. Tente novamente mais tarde. ' + (error.message || ''));
      });
  }

  function renderDashboard() {
    const events = getEvents();
    const regs = getRegistrations();
    window.renderDashboardCharts?.(events.map(event => ({
      id: event.id, title: event.title, count: countRegistrations(event.id),
      closed: eventIsClosed(event), published: event.published, mode: event.publicationMode
    })));
    const published = events.filter(event => event.published);
    const totalSeats = events.reduce((sum, event) => sum + Number(event.seats || 0), 0);
    const avg = totalSeats ? Math.round((regs.length / totalSeats) * 100) : 0;

    setText('metricEvents', events.length);
    setText('metricPublished', published.length);
    setText('metricRegistrations', regs.length);
    // setText('metricSeats', `${avg}%`);
    setText('metricSeats', `Vagas Ilimitadas`);

    const dashEvents = document.getElementById('dashboardEvents');
    if (dashEvents) {
      dashEvents.innerHTML = events.slice().sort(compareEventsByDate).slice(0, 5).map(event => {
        const used = countRegistrations(event.id);
        return `<div class="mini-item"><strong>${escapeHtml(event.title)}</strong><span>${formatDate(event.date_begin || event.date)} - ${formatDate(event.date_end || event.date)} · ${event.seats == -1 ? 'Vagas Ilimitadas · ' : used + '/' + Number(event.seats || 0) + 'inscritos · '}${publicationLabel(event)}</span></div>`;
      }).join('') || '<div class="empty-state">Nenhum evento cadastrado.</div>';
    }

    const dashRegs = document.getElementById('dashboardRegistrations');
    if (dashRegs) {
      dashRegs.innerHTML = regs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(reg => {
        const event = events.find(item => item.id == reg.eventId);
        return `<div class="mini-item"><strong>${escapeHtml(event?.title || 'Evento removido')}</strong><span>${formatDateTime(reg.createdAt)}</span></div>`;
      }).join('') || '<div class="empty-state">Nenhuma inscrição registrada.</div>';
    }
  }

  async function renderAdminEventsTable() {
    const tbody = document.getElementById('adminEventsTable');
    if (!tbody) return;
    const allEvents = getEvents();
    const history = adminEventView === 'history';
    setText('currentEventsCount', allEvents.filter(event => !eventIsClosed(event)).length);
    setText('historyEventsCount', allEvents.filter(eventIsClosed).length);
    setText('eventsListTitle', history ? 'Histórico de eventos' : 'Eventos atuais');
    setText('eventsListHint', history ? 'Eventos encerrados. Os inscritos e relatórios continuam disponíveis.' : 'Publicados, agendados e rascunhos.');
    document.querySelectorAll('[data-event-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eventView === adminEventView)));
    const events = allEvents.filter(event => eventIsClosed(event) === history)
      .sort(history ? (a, b) => String(b.closedAt || b.effectiveEndAt || '').localeCompare(String(a.closedAt || a.effectiveEndAt || '')) : compareEventsByDate);
    if (!events.length) {
      tbody.innerHTML = `<tr><td colspan="6">${history ? 'Nenhum evento encerrado ainda.' : 'Nenhum evento atual. Consulte o histórico para ver eventos encerrados.'}</td></tr>`;
      return;
    }
    tbody.innerHTML = events.map(event => {
      const used = countRegistrations(event.id);
      return `
        <tr>
          <td><strong>${escapeHtml(event.title)}</strong><br><span class="muted">${escapeHtml(CATEGORIES[event.category] || event.category)} · ${escapeHtml(AUDIENCES[getEventAudience(event)])} · ${escapeHtml(event.city)}</span></td>
          <td>${formatDate(event.date_begin || event.date)}<br><span class="muted">${escapeHtml(event.time_begin || event.time)}</span></td>
          
          <td>${event.seats == -1 ? 'Ilimitadas' : Number(event.seats || 0)}</td>
          <td>${used}</td>
          <td><span class="status-pill ${history ? 'closed' : event.published ? '' : 'off'}">${publicationLabel(event)}</span>
            ${history ? `<br><small>${event.closeReason === 'manual' ? 'Retirado manualmente' : 'Prazo encerrado'}<br>${escapeHtml(formatDateTime(event.closedAt || event.effectiveEndAt))}</small>`
              : `${event.publicationMode === 'automatic' ? `<br><small>Publicação: ${escapeHtml(formatDateTime(event.publishAt))}</small>` : ''}${event.publicationMode !== 'draft' && event.effectiveEndAt ? `<br><small>Limite: ${escapeHtml(formatDateTime(event.effectiveEndAt))}</small><span class="event-countdown" data-countdown="${escapeAttr(event.effectiveEndAt)}">${countdownLabel(event.effectiveEndAt)}</span>` : ''}`}</td>
          <td>
            <div class="row-actions">
              ${event.published && !history ? `<a class="btn btn-light small" href="evento.html?id=${encodeURIComponent(event.id)}" target="_blank">Divulgação</a><a class="btn btn-light small" href="${eventRegistrationUrl(event.id)}" target="_blank">Inscrição</a><button class="btn btn-light small" type="button" data-copy-link="${escapeAttr(event.id)}">Copiar link</button>` : ''}
              ${String(event.id).startsWith('evt-') && !history ? `<a class="btn btn-secondary small" href="evento-form.html?id=${encodeURIComponent(event.id)}">Editar</a>` : ''}
              ${String(event.id).startsWith('evt-') && !event.published && !history ? `<button class="btn btn-primary small" type="button" data-publish-event="${escapeAttr(event.id)}">Publicar agora</button>` : ''}
              ${!history && event.publicationMode !== 'draft' ? `<button class="btn btn-danger small" type="button" data-close-event="${escapeAttr(event.id)}">Tirar do ar</button>` : ''}
              <a class="btn btn-secondary small" href="relatorios.html?event=${encodeURIComponent(event.id)}">Ver inscritos</a>
              <a class="btn btn-secondary small" href="relatorios.html?event=${encodeURIComponent(event.id)}">Relatório</a>
              <!-- TODO <button class="btn btn-danger small" type="button" data-delete-event="${escapeAttr(event.id)}">Excluir</button> -->
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  async function handleAdminEventActions(event) {
    const closeButton = event.target.closest('[data-close-event]');
    if (closeButton) {
      if (closeButton.disabled) return;
      const target = getEvents().find(item => item.id === closeButton.dataset.closeEvent);
      if (!target || eventIsClosed(target)) return;
      if (!confirm(`Tirar "${target.title}" do ar e encerrar as inscrições? O evento ficará no histórico com os inscritos e relatórios preservados.`)) return;
      closeButton.disabled = true;
      try {
        await publicationRequest('close', { id: target.id });
        await loadServerEvents();
        await renderAdminEventsTable();
        showToast('Evento encerrado. Você pode consultá-lo no histórico.');
      } catch (error) { showToast(error.message); closeButton.disabled = false; }
      return;
    }
    const publishButton = event.target.closest('[data-publish-event]');
    if (publishButton) {
      if (publishButton.disabled) return;
      const target = getEvents().find(item => item.id === publishButton.dataset.publishEvent);
      if (!target || eventIsClosed(target)) return;
      publishButton.disabled = true;
      try {
        await saveServerEvent({ ...target, publicationMode: 'published', publishAt: null });
        await renderAdminEventsTable();
        showToast('Evento publicado.');
      } catch (error) { showToast(error.message); publishButton.disabled = false; }
      return;
    }
    const copyId = event.target.closest('[data-copy-link]')?.dataset.copyLink;
    if (copyId) {
      const link = `${window.location.origin}${window.location.pathname.replace('eventos.html', '')}evento.html?id=${encodeURIComponent(copyId)}`;
      navigator.clipboard?.writeText(link).then(() => showToast('Link copiado.')).catch(() => showToast(link));
      return;
    }

    const deleteId = event.target.closest('[data-delete-event]')?.dataset.deleteEvent;
    if (deleteId) {
      const target = getEvents().find(item => item.id === deleteId);
      if (!confirm(`Excluir o evento "${target?.title || deleteId}"? As inscrições dele também serão removidas.`)) return;
      saveEvents(getEvents().filter(item => item.id !== deleteId));
      saveRegistrations(getRegistrations().filter(item => item.eventId !== deleteId));
      renderAdminEventsTable();
      showToast('Evento excluído.');
    }
  }

  function populateEventForm() {
    const id = new URLSearchParams(window.location.search).get('id');
    const event = getEvents().find(item => item.id === id);
    if (!event) {
      syncEventInstitution();
      return;
    }

    setText('formPageTitle', 'Editar evento');
    setValue('eventId', event.id);
    setValue('eventTitle', event.title);
    setValue('eventInstitution', event.institution || '');
    setValue('eventCategory', event.category);
    syncEventInstitution();
    setValue('eventDate', event.date);
    setValue('eventTime', event.time);
    setValue('eventSeats', event.seats == -1 ? '' : event.seats);
    setValue('eventCity', event.city);
    setValue('eventLocation', event.location);
    setValue('eventCover', event.cover);
    showEventCoverPreview(event.cover || '');
    setValue('eventSummary', event.summary);
    setValue('eventDescription', event.description);
    setChecked('fieldCpf', Boolean(event.fields?.cpf));
    setChecked('fieldEmail', Boolean(event.fields?.email));
    setChecked('fieldPhone', Boolean(event.fields?.phone));
    setChecked('fieldCourse', Boolean(event.fields?.course));
    setChecked('fieldCommunity', Boolean(event.fields?.community));
    setChecked('fieldNotes', Boolean(event.fields?.notes));
    setChecked('fieldResponsibleCPF', event.fields?.responsibleCPF !== false);
    setChecked('fieldResponsibleName', event.fields?.responsibleName !== false);
    setChecked('fieldRelationship', event.fields?.relationship !== false);
    setChecked('fieldStudentName', event.fields?.studentName !== false);
    setChecked('fieldStudentClass', event.fields?.studentClass !== false);
    setValue('eventPublicationMode', event.publicationMode || (event.published ? 'published' : 'draft'));
    setValue('eventPublishAt', toLocalDateTime(event.publishAt));
    setValue('eventEndAt', toLocalDateTime(event.endAt));
    togglePublicationFields();
    setValue('eventExtraFields', (event.fields?.extras || []).map(extra => `${extra.label}${extra.required ? '|required' : ''}`).join('\n'));
    toggleAudienceFieldGroups();
  }

  function toLocalDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function publicationLabel(event) {
    if (eventIsClosed(event)) return 'Encerrado';
    if (event.published) return 'Publicado';
    if (event.publicationMode === 'automatic') return 'Agendado — automático';
    if (event.publicationMode === 'scheduled') return 'Agendado — manual';
    return 'Rascunho';
  }

  function eventIsClosed(event) {
    return Boolean(event.closed || event.closedAt || (event.publicationMode !== 'draft' && event.effectiveEndAt && new Date(event.effectiveEndAt).getTime() <= Date.now()));
  }

  function countdownLabel(endAt) {
    const remaining = Math.ceil((new Date(endAt).getTime() - Date.now()) / 1000);
    if (!Number.isFinite(remaining) || remaining <= 0) return 'Prazo encerrado';
    const days = Math.floor(remaining / 86400);
    const hours = String(Math.floor(remaining % 86400 / 3600)).padStart(2, '0');
    const minutes = String(Math.floor(remaining % 3600 / 60)).padStart(2, '0');
    const seconds = String(remaining % 60).padStart(2, '0');
    return `Encerra em ${days ? days + 'd ' : ''}${hours}:${minutes}:${seconds}`;
  }

  function togglePublicationFields() {
    const mode = getValue('eventPublicationMode');
    document.querySelectorAll('input[name="publicationMode"]').forEach(option => {
      option.checked = option.value === mode;
    });
    const automatic = mode === 'automatic';
    const input = document.getElementById('eventPublishAt');
    document.getElementById('eventPublishAtGroup').hidden = !automatic;
    input.disabled = !automatic;
    input.required = automatic;
    input.setCustomValidity('');
    input.min = toLocalDateTime(Date.now() + 60000);
    const hints = {
      published: 'O evento ficará disponível assim que você salvar.',
      scheduled: 'O evento fica agendado e oculto ao público até você clicar em Publicar agora na lista de eventos.',
      automatic: 'O evento será liberado no horário escolhido, mesmo com o navegador fechado.',
      draft: 'O evento fica salvo e oculto ao público até você decidir publicar.'
    };
    setText('eventPublicationHint', hints[getValue('eventPublicationMode')] || '');
  }

  function validateEventForm() {
    const form = document.getElementById('eventForm');
    form.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
      if (field.disabled || field.type === 'file') return;
      field.setCustomValidity(field.value.trim() ? '' : 'Preencha este campo.');
    });
    const cover = document.getElementById('eventCoverFile');
    if (!getValue('eventCover') && !cover.files?.length && !cover.validity?.customError) {
      cover.setCustomValidity('Selecione uma imagem de capa.');
    }
    if (getValue('eventPublicationMode') === 'automatic') {
      const time = new Date(getValue('eventPublishAt')).getTime();
      document.getElementById('eventPublishAt').setCustomValidity(Number.isFinite(time) && time > Date.now()
        ? '' : 'Escolha uma data e horário futuros para a publicação.');
    }
    const endInput = document.getElementById('eventEndAt');
    if (endInput) {
      const endTime = new Date(endInput.value).getTime();
      const publishTime = getValue('eventPublicationMode') === 'automatic' ? new Date(getValue('eventPublishAt')).getTime() : Date.now();
      endInput.setCustomValidity(!endInput.value || (Number.isFinite(endTime) && endTime > Date.now() && endTime > publishTime)
        ? '' : 'Escolha um limite futuro e posterior à publicação.');
    }
    return form.checkValidity();
  }

  function showEventFormErrors(focus = true) {
    const form = document.getElementById('eventForm');
    const summary = document.getElementById('eventFormErrors');
    if (!summary || (!focus && summary.hidden)) return;
    const errors = [];
    form.querySelectorAll('input[id], select[id], textarea[id]').forEach(field => {
      const errorId = `${field.id}Error`;
      document.getElementById(errorId)?.remove();
      const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== errorId);
      field.removeAttribute('aria-invalid');
      if (field.willValidate && !field.validity.valid) {
        field.setAttribute('aria-invalid', 'true');
        const label = field.closest('.form-field');
        const name = label?.querySelector('span')?.textContent.replace(/\s*\*$/, '') || 'Campo';
        const message = field.validationMessage || 'Verifique este campo.';
        const hint = document.createElement('small');
        hint.id = errorId;
        hint.className = 'field-error';
        hint.textContent = `${name}: ${message}`;
        label?.append(hint);
        descriptions.push(errorId);
        errors.push({ field, name, message });
      }
      if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
      else field.removeAttribute('aria-describedby');
    });
    summary.hidden = !errors.length;
    summary.innerHTML = errors.length ? `<strong>O evento ainda não foi salvo. Corrija ${errors.length === 1 ? 'o campo indicado' : 'os campos indicados'}:</strong><p>Clique no nome do campo para ir até ele.</p><ul>${errors.map(({ field, name, message }) => `<li><a href="#${escapeAttr(field.id)}" data-error-field="${escapeAttr(field.id)}">${escapeHtml(name)}: ${escapeHtml(message)}</a></li>`).join('')}</ul>` : '';
    if (focus && errors.length) {
      summary.focus({ preventScroll: true });
      summary.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  async function handleEventFormSubmit(event) {
    event.preventDefault();
    const button = document.querySelector('#eventForm button[type="submit"]');
    if (button.disabled) return;
    syncEventInstitution();
    if (!validateEventForm()) {
      showEventFormErrors();
      return;
    }
    if (!getValue('eventInstitution') || !getValue('eventAudience')) {
      showToast('Selecione a instituição responsável.');
      return;
    }
    const existingId = getValue('eventId');
    const title = clean(getValue('eventTitle'));
    const id = existingId || `evt-${slugify(title)}-${Date.now().toString(36)}`;
    const nextEvent = {
      id,
      title,
      institution: getValue('eventInstitution'),
      institutionType: document.getElementById('eventInstitution')?.selectedOptions[0]?.dataset.type || '',
      category: getValue('eventCategory'),
      audience: getValue('eventAudience') || 'graduacao',
      date: getValue('eventDate'),
      time: getValue('eventTime'),
      seats: getValue('eventSeats') === '' ? -1 : Number(getValue('eventSeats')),
      city: clean(getValue('eventCity')),
      location: clean(getValue('eventLocation')),
      cover: clean(getValue('eventCover')),
      summary: clean(getValue('eventSummary')),
      description: clean(getValue('eventDescription')),
      publicationMode: getValue('eventPublicationMode'),
      published: getValue('eventPublicationMode') === 'published',
      publishAt: getValue('eventPublicationMode') === 'automatic' ? new Date(getValue('eventPublishAt')).toISOString() : null,
      endAt: getValue('eventEndAt') ? new Date(getValue('eventEndAt')).toISOString() : null,
      fields: {
        cpf: getChecked('fieldCpf'),
        email: getChecked('fieldEmail'),
        phone: getChecked('fieldPhone'),
        course: getChecked('fieldCourse'),
        community: getChecked('fieldCommunity'),
        notes: getChecked('fieldNotes'),
        responsibleCPF: getChecked('fieldResponsibleCPF'),
        responsibleName: getChecked('fieldResponsibleName'),
        relationship: getChecked('fieldRelationship'),
        studentName: getChecked('fieldStudentName'),
        studentClass: getChecked('fieldStudentClass'),
        extras: parseExtraFields(getValue('eventExtraFields'))
      }
    };

    button.disabled = true;
    try {
      await saveServerEvent(nextEvent);
      eventFormDraft?.clear();
      showToast(['scheduled', 'automatic'].includes(nextEvent.publicationMode) ? 'Evento agendado com sucesso.' : 'Evento salvo com sucesso.');
      setTimeout(() => window.location.href = 'eventos.html', 500);
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
      const summary = document.getElementById('eventFormErrors');
      summary.textContent = error.message;
      summary.hidden = false;
      summary.focus();
    }
  }

  function renderRegistrationFilters() {
    const select = document.getElementById('registrationEventFilter');
    if (!select) return;
    const events = getEvents().sort(compareEventsByDate);
    select.innerHTML = '<option value="todos">Todos os eventos</option>' + events.map(event => `<option value="${escapeAttr(event.id)}">${escapeHtml(event.title)}</option>`).join('');
  }

  function renderRegistrationsTable() {
    const tbody = document.getElementById('registrationsTable');
    if (!tbody) return;
    const eventFilter = getValue('registrationEventFilter') || 'todos';
    const query = getValue('registrationSearch').toLowerCase();
    const events = getEvents();
    console.log(getRegistrations());
    const rows = getRegistrations()
      .filter(reg => eventFilter === 'todos' || reg.eventId === eventFilter)
      .filter(reg => !query || [reg.name, reg.cpf, reg.email, reg.phone, reg.course].join(' ').toLowerCase().includes(query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhuma inscrição encontrada.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(reg => {
      const event = events.find(item => item.id == reg.eventId);
      const link = event ? `evento.html?id=${encodeURIComponent(event.id)}` : '#';
      return `
        <tr>
          <td><strong>${escapeHtml(registrationPrimaryName(reg))}</strong><br><span class="muted">${escapeHtml(registrationSecondaryLine(reg))}</span></td>
          <td><a href="${link}" target="_blank">${escapeHtml(event?.title || 'Evento removido')}</a></td>
          <!-- <td>${escapeHtml(reg.email || '—')}<br><span class="muted">${escapeHtml(reg.phone || '—')}</span></td> -->
          <td>${escapeHtml(labelParticipant(reg.course))}<br><span class="muted">${escapeHtml(registrationAudienceLine(reg))}</span></td>
          <td>${formatDateTime(reg.createdAt)}</td>
          <td><button class="btn btn-danger small" type="button" data-remove-registration="${escapeAttr(reg.id)}">Excluir</button></td>
        </tr>`;
    }).join('');
  }

  function exportRegistrationsCsv() {
    const events = getEvents();
    const rows = getRegistrations().map(reg => {
      const event = events.find(item => item.id == reg.eventId);
      return {
        evento: event.title || 'Evento removido',
        data_evento: formatDate(event.date_begin),
        data_inscricao: formatDateTime(reg.createdAt),
        educando: registrationPrimaryName(reg),
        responsavel: reg.responsibleName || '',
        cpf_responsavel: reg.responsiblecpf || '',
        parentesco: reg.relationship || '',
        turma: reg.studentClass || '',
        curso: reg.course || ''
      };
    });
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscricoes-ideau-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('CSV exportado.');
  }

  function renderReportsPage() {
    const cards = document.getElementById('reportEventCards');
    const tbody = document.getElementById('reportRegistrationsTable');
    if (!cards || !tbody) return;

    const selectedId = new URLSearchParams(window.location.search).get('event');
    const events = getEvents().sort(compareEventsByNewest);
    const selected = events.find(event => String(event.id) === selectedId);
    document.getElementById('reportEventsOverview').hidden = Boolean(selectedId);
    document.getElementById('reportEventDetail').hidden = !selectedId;
    document.getElementById('reportExportActions').hidden = !selected;
    document.getElementById('reportParticipantSearch').hidden = !selected;
    document.getElementById('exportFilteredExcel').disabled = !selected;
    document.getElementById('printFilteredPdf').disabled = !selected;
    tbody.innerHTML = '';
    cards.innerHTML = '';

    if (!selectedId) {
      document.title = 'Relatórios — IDEAU Eventos';
      const query = getValue('reportEventSearch').trim().toLowerCase();
      const visibleEvents = events.filter(event => event.title.toLowerCase().includes(query));
      cards.innerHTML = visibleEvents.map(reportEventCardTemplate).join('') ||
        '<div class="empty-state">Nenhum evento encontrado.</div>';
      return;
    }
    if (!selected) {
      setText('reportSelectedTitle', 'Evento não encontrado');
      setText('reportSelectedMeta', 'Volte aos eventos e escolha um relatório disponível.');
      setText('reportSelectedCount', '');
      return;
    }

    document.title = `Relatório — ${selected.title}`;
    setText('reportSelectedTitle', selected.title);
    setText('reportSelectedMeta', `${formatDate(selected.date_begin || selected.date)} · ${selected.location || ''} · ${publicationLabel(selected)}`);
    const allRows = getReportRows(selectedId);
    const query = getValue('reportSearch').trim().toLowerCase();
    const rows = getReportRows(selectedId, query);
    setText('reportSelectedCount', query
      ? `Exibindo ${rows.length} de ${allRows.length} inscritos neste evento.`
      : `${allRows.length} ${allRows.length === 1 ? 'inscrito neste evento' : 'inscritos neste evento'}`);
    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${formatDateTime(row.createdAt)}</td>
        <td><strong>${escapeHtml(row.displayName)}</strong></td>
        <td>${escapeHtml(row.responsibleName || '—')}</td>
        <td>${escapeHtml(row.responsiblecpf || '—')}</td>
        <td>${escapeHtml(row.relationship || '—')}</td>
        <td>${escapeHtml(row.studentClass || '—')}</td>
        <td>${escapeHtml(row.course || '—')}</td>
      </tr>`).join('') || `<tr><td colspan="7">${query ? 'Nenhum inscrito corresponde à busca neste evento.' : 'Este evento ainda não tem inscritos.'}</td></tr>`;
  }

  function reportEventCardTemplate(event) {
    const used = countRegistrations(event.id);
    return `
      <article class="report-card">
      <a class="report-event-link" href="relatorios.html?event=${encodeURIComponent(event.id)}">
        <div>
          <span class="event-tag">${escapeHtml(CATEGORIES[event.category] || event.category)}</span>
          <h3>${escapeHtml(event.title)}</h3>
          <p class="muted">${formatDate(event.date_begin || event.date)} · ${escapeHtml(event.location || '')}</p>
          <span class="status-pill ${eventIsClosed(event) ? 'closed' : ''}">${publicationLabel(event)}</span>
        </div>
        <div class="report-card-entry">
          <strong>${used} ${used === 1 ? 'inscrito' : 'inscritos'}</strong>
        </div>
      </a>
      <div class="report-actions">
        <button class="btn btn-primary small" type="button" data-report-export="pdf" data-event-id="${escapeAttr(event.id)}">Gerar PDF</button>
        <button class="btn btn-secondary small" type="button" data-report-export="excel" data-event-id="${escapeAttr(event.id)}">Exportar Excel</button>
        <a class="btn btn-light small" href="relatorios.html?event=${encodeURIComponent(event.id)}">Ver inscritos →</a>
      </div>
      </article>`;
  }

  function getReportRows(eventFilter = 'todos', query = '') {
    const events = getEvents();
    return getRegistrations()
      .filter(reg => eventFilter === 'todos' || reg.eventId == eventFilter)
      .map(reg => {
        const event = events.find(item => item.id == reg.eventId);
        return {
          eventId: reg.eventId,
          eventTitle: event?.title || 'Evento removido',
          eventDate_begin: event?.date_begin || '',
          eventTime: event?.time_begin || '',
          eventLocation: event?.location || '',
          eventCity: event?.city || '',
          eventSeats: Number(event?.seats || 0),
          createdAt: reg.createdAt,
          audience: reg.audience || event?.audience || 'graduacao',
          name: reg.name || '',
          displayName: registrationPrimaryName(reg),
          secondaryLine: registrationSecondaryLine(reg),
          responsibleName: reg.responsibleName || '',
          studentName: reg.studentName || '',
          studentClass: reg.studentClass || '',
          responsiblecpf: reg.responsiblecpf || reg.responsibleCpf || '',
          relationship: reg.relationship || 'Responsável',
          email: reg.email || '',
          phone: reg.phone || '',
          participantType: reg.participantType || '',
          course: reg.course || '',
          notes: reg.notes || '',
          extras: reg.extras || {}
        };
      })
      .filter(row => !query || [row.eventTitle, row.name, row.displayName, row.responsibleName, row.studentName, row.studentClass, row.responsiblecpf, row.email, row.phone, row.course, row.eventCity].join(' ').toLowerCase().includes(query))
      .sort((a, b) => `${a.eventDate_begin} ${a.eventTime}`.localeCompare(`${b.eventDate_begin} ${b.eventTime}`) || a.displayName.localeCompare(b.displayName));
  }

  function exportEventExcel(eventId = 'todos') {
    const rows = getReportRows(eventId, getValue('reportSearch').toLowerCase());
    const title = reportTitle(eventId);
    const html = reportHtmlTemplate(title, rows, true);
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Relatório Excel exportado.');
  }

  function printEventReport(eventId = 'todos') {
    const rows = getReportRows(eventId, getValue('reportSearch').trim().toLowerCase());
    const title = reportTitle(eventId);
    const win = window.open('', '_blank');
    if (!win) {
      showToast('Permita pop-ups para abrir o relatório em PDF.');
      return;
    }
    win.document.write(reportHtmlTemplate(title, rows, false));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
    showToast('Relatório aberto para salvar em PDF.');
  }

  function reportTitle(eventId = 'todos') {
    if (eventId === 'todos') return 'Relatório geral de eventos';
    const event = getEvents().find(item => item.id === eventId);
    return event ? `Relatório - ${event.title}` : 'Relatório de evento';
  }

  function reportHtmlTemplate(title, rows, excelMode) {
    const generatedAt = new Date().toLocaleString('pt-BR');
    const totals = rows.reduce((acc, row) => {
      acc[row.eventId] = acc[row.eventId] || { title: row.eventTitle, count: 0 };
      acc[row.eventId].count += 1;
      return acc;
    }, {});
    const summaryRows = Object.values(totals).map(item => `<tr><td>${escapeHtml(item.title)}</td><td>${item.count}</td></tr>`).join('') || '<tr><td colspan="2">Nenhuma inscrição no filtro.</td></tr>';
    const tableRows = rows.map(row => `<tr>
        <td><strong>${escapeHtml(row.eventTitle)}</strong></td>
        <td>${formatDate(row.eventDate_begin)} · ${escapeHtml(row.eventTime)}</td>
        <td>${formatDateTime(row.createdAt)}</td>
        <td><strong>${escapeHtml(row.displayName)}</strong></td>
        <td>${escapeHtml(row.responsibleName || '—')}</td>
        <td>${escapeHtml(row.responsiblecpf || '—')}</td>
        <td>${escapeHtml(row.relationship || '—')}</td>
        <td>${escapeHtml(row.studentClass || '—')}</td>
        <td>${escapeHtml(row.course || '—')}</td>
        <!-- <td>${escapeHtml(row.email || '—')}<br><span class="muted">${escapeHtml(row.phone || '—')}</span></td> -->
        <!-- <td>${escapeHtml(labelParticipant(row.participantType))}</td> -->
        <!-- <td>${escapeHtml(row.notes || '—')}</td> -->
      </tr>`).join('') || '<tr><td colspan="9">Nenhuma inscrição encontrada.</td></tr>';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#17210f;margin:28px;background:#fff;}
  h1{font-size:26px;margin:0 0 8px;}
  h2{font-size:18px;margin:26px 0 10px;}
  p{margin:0 0 18px;color:#4d5c45;}
  table{width:100%;border-collapse:collapse;margin-top:10px;}
  th,td{border:1px solid #d9e3d1;padding:8px;text-align:left;font-size:12px;vertical-align:top;}
  th{background:#eef3e7;text-transform:uppercase;font-size:11px;}
  .meta{display:flex;gap:18px;margin:16px 0 24px;}
  .box{border:1px solid #d9e3d1;padding:12px;background:#f7faf3;}
  @media print{body{margin:16mm}.no-print{display:none}}
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Gerado em ${escapeHtml(generatedAt)} · IDEAU Eventos</p>
  <div class="meta">
    <div class="box"><strong>${rows.length}</strong><br>inscrições no relatório</div>
    <div class="box"><strong>${Object.keys(totals).length}</strong><br>eventos com inscrições</div>
  </div>
  <h2>Resumo por evento</h2>
  <table><thead><tr><th>Evento</th><th>Inscrições</th></tr></thead><tbody>${summaryRows}</tbody></table>
  <h2>Lista detalhada de inscrições</h2>
  <table><thead><tr><th>Evento</th><th>Data do evento</th><th>Inscrição</th><th>Educando</th><th>Responsável</th><th>CPF do Responsável</th><th>Parentesco</th><th>Turma</th><th>Curso</th></tr></thead><tbody>${tableRows}</tbody></table>
  ${excelMode ? '' : '<p class="no-print" style="margin-top:24px">Use Ctrl+P ou a janela aberta para salvar como PDF.</p>'}
</body>
</html>`;
  }

  function toCsv(rows) {
    if (!rows.length) return 'evento,nome,responsavel,educando,turma_educando,cpf,email,telefone,vinculo,curso,observacoes,data_inscricao\n';
    const headers = Object.keys(rows[0]);
    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return `${headers.join(',')}\n${rows.map(row => headers.map(header => escapeCsv(row[header])).join(',')).join('\n')}`;
  }

  function parseExtraFields(text) {
    return String(text || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [rawLabel, rawFlag] = line.split('|').map(part => part.trim());
        return { label: rawLabel, required: rawFlag === 'required' };
      })
      .filter(item => item.label);
  }

  function toggleAudienceFieldGroups() {
    const audience = getValue('eventAudience');
    const graduationGroup = document.getElementById('graduationFieldsGroup');
    const schoolGroup = document.getElementById('schoolFieldsGroup');
    [[graduationGroup, 'graduacao'], [schoolGroup, 'escola']].forEach(([group, type]) => {
      if (!group) return;
      group.hidden = audience !== type;
      group.querySelectorAll('input').forEach(input => {
        const required = type === 'escola' && ['fieldResponsibleName', 'fieldStudentName'].includes(input.id);
        input.disabled = group.hidden || required;
        if (group.hidden) input.checked = false;
        else if (required) input.checked = true;
      });
    });
    const cpf = document.getElementById('fieldCpf');
    if (cpf) {
      cpf.closest('label').hidden = audience !== 'graduacao';
      cpf.disabled = audience !== 'graduacao';
      if (cpf.disabled) cpf.checked = false;
    }
  }

  function applyDefaultFields(audience = 'graduacao') {
    const defaults = getFieldDefaults(audience === 'todos' ? 'graduacao' : audience);
    const schoolDefaults = getFieldDefaults('escola');
    setChecked('fieldCpf', Boolean(defaults.cpf));
    setChecked('fieldEmail', Boolean(defaults.email));
    setChecked('fieldPhone', Boolean(defaults.phone));
    setChecked('fieldCourse', (audience === 'graduacao' || audience === 'todos') && Boolean(defaults.course));
    setChecked('fieldCommunity', (audience === 'graduacao' || audience === 'todos') && Boolean(defaults.community));
    setChecked('fieldNotes', Boolean(defaults.notes));
    setChecked('fieldResponsibleCPF', (audience === 'escola' || audience === 'todos') && schoolDefaults.responsibleCPF !== false);
    setChecked('fieldResponsibleName', (audience === 'escola' || audience === 'todos') && schoolDefaults.responsibleName !== false);
    setChecked('fieldRelationship', (audience === 'escola' || audience === 'todos') && schoolDefaults.relationship !== false);
    setChecked('fieldStudentName', (audience === 'escola' || audience === 'todos') && schoolDefaults.studentName !== false);
    setChecked('fieldStudentClass', (audience === 'escola' || audience === 'todos') && schoolDefaults.studentClass !== false);
    setValue('eventExtraFields', (defaults.extras || []).map(extra => `${extra.label}${extra.required ? '|required' : ''}`).join('\n'));
  }

  function renderSettingsForms() {
    const settings = getSettings();
    const grad = settings.defaults.graduacao;
    const school = settings.defaults.escola;
    setChecked('settingsGradCpf', grad.cpf);
    setChecked('settingsGradEmail', grad.email);
    setChecked('settingsGradPhone', grad.phone);
    setChecked('settingsGradCourse', grad.course);
    setChecked('settingsGradCommunity', grad.community);
    setChecked('settingsGradNotes', grad.notes);
    setValue('settingsGradExtras', (grad.extras || []).map(extra => `${extra.label}${extra.required ? '|required' : ''}`).join('\n'));

    setChecked('settingsSchoolResponsibleName', school.responsibleName !== false);
    setChecked('settingsSchoolStudentName', school.studentName !== false);
    setChecked('settingsSchoolStudentClass', school.studentClass !== false);
    setChecked('settingsSchoolCpf', school.cpf);
    setChecked('settingsSchoolEmail', school.email);
    setChecked('settingsSchoolPhone', school.phone);
    setChecked('settingsSchoolNotes', school.notes);
    setValue('settingsSchoolExtras', (school.extras || []).map(extra => `${extra.label}${extra.required ? '|required' : ''}`).join('\n'));

    const list = document.getElementById('schoolClassesList');
    if (list) list.innerHTML = SCHOOL_CLASSES.map(item => `<span>${escapeHtml(item)}</span>`).join('');
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    saveSettings({
      defaults: {
        graduacao: {
          cpf: getChecked('settingsGradCpf'),
          email: getChecked('settingsGradEmail'),
          phone: getChecked('settingsGradPhone'),
          course: getChecked('settingsGradCourse'),
          community: getChecked('settingsGradCommunity'),
          notes: getChecked('settingsGradNotes'),
          extras: parseExtraFields(getValue('settingsGradExtras'))
        },
        escola: {
          responsibleName: getChecked('settingsSchoolResponsibleName'),
          studentName: getChecked('settingsSchoolStudentName'),
          studentClass: getChecked('settingsSchoolStudentClass'),
          cpf: getChecked('settingsSchoolCpf'),
          email: getChecked('settingsSchoolEmail'),
          phone: getChecked('settingsSchoolPhone'),
          notes: getChecked('settingsSchoolNotes'),
          extras: parseExtraFields(getValue('settingsSchoolExtras'))
        }
      }
    });
    showToast('Configurações salvas. Novos eventos usarão esses padrões.');
  }

  function getFieldDefaults(audience = 'graduacao') {
    const settings = getSettings();
    return settings.defaults[audience] || settings.defaults.graduacao;
  }

  function getEventAudience(event) {
    if (event?.institutionType === 'escola' || event?.institution === 'escola-ideau-santa-clara') return 'escola';
    if (event?.institutionType === 'faculdade' || event?.institution === 'faculdade-ideau') return 'graduacao';
    return event?.audience === 'escola' ? 'escola' : 'graduacao';
  }

  function getSettings() {
    return mergeSettings(safeJson(localStorage.getItem(KEYS.settings), DEFAULT_SETTINGS));
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.settings, JSON.stringify(mergeSettings(settings)));
  }

  function mergeSettings(settings = {}) {
    return {
      defaults: {
        graduacao: { ...DEFAULT_SETTINGS.defaults.graduacao, ...(settings.defaults?.graduacao || {}) },
        escola: { ...DEFAULT_SETTINGS.defaults.escola, ...(settings.defaults?.escola || {}) }
      }
    };
  }

  function registrationPrimaryName(reg = {}) {
    if (reg.studentName) return reg.studentName;
    return reg.name || reg.responsibleName || 'Participante';
  }

  function registrationSecondaryLine(reg = {}) {
    if (reg.studentName || reg.responsibleName || reg.studentClass) {
      const parts = [];
      if (reg.responsibleName) parts.push(`Responsável: ${reg.responsibleName}`);
      if (reg.relationship) parts.push(`Parentesco: ${reg.relationship}`);
      return parts.join(' · ') || 'Evento escolar';
    }
    return reg.cpf || 'CPF não solicitado';
  }

  function registrationAudienceLine(reg = {}) {
    if (reg.studentClass) return reg.studentClass;
    return reg.course || '—';
  }

  function getEvents() {
    return legacyEvents.concat(serverEvents).map(event => eventIsClosed(event)
      ? { ...event, closed: true, published: false, closedAt: event.closedAt || event.effectiveEndAt } : event);
  }

  function saveEvents(events) {
    localStorage.setItem(KEYS.events, JSON.stringify(events));
  }

  function getRegistrations() {
    return apiRegistrations.concat(serverRegistrations);
  }

  function saveRegistrations(registrations) {
    localStorage.setItem(KEYS.registrations, JSON.stringify(registrations));
  }

  function safeJson(text, fallback) {
    try { return JSON.parse(text) || fallback; } catch { return fallback; }
  }

  function countRegistrations(eventId) {
    const managed = serverEvents.concat(legacyEvents).find(event => event.id === eventId);
    if (managed) return Number(managed.registrationCount || 0);
    return String(eventId) === '1' ? legacyRegistrationCount : 0;
  }

  function compareEventsByDate(a, b) {
    return `${a.date || a.date_begin} ${a.time || a.time_begin}`.localeCompare(`${b.date || b.date_begin} ${b.time || b.time_begin}`);
  }

  function compareEventsByNewest(a, b) {
    const createdA = Date.parse(a.createdAt) || 0;
    const createdB = Date.parse(b.createdAt) || 0;
    return createdB - createdA || String(b.id).localeCompare(String(a.id));
  }

  function datePart(date, part) {
    const value = new Date(`${date}T12:00:00`);
    if (Number.isNaN(value.getTime())) return part === 'day' ? '--' : '---';
    if (part === 'day') return String(value.getDate()).padStart(2, '0');
    return value.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
  }

  function formatDate(date) {
    if (!date) return 'Data não definida';
    const value = new Date(`${date}T12:00:00`);
    if (Number.isNaN(value.getTime())) return date;
    return value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return iso;
    return value.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function labelParticipant(type) {
    if (type === 'aluno') return 'Aluno(a) / curso';
    if (type === 'comunidade') return 'Comunidade';
    if (type === 'escola') return 'Escola / educando';
    return type || 'Participante';
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'evento';
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function getValue(id) {
    return document.getElementById(id)?.value || '';
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  }

  function getChecked(id) {
    return Boolean(document.getElementById(id)?.checked);
  }

  function setChecked(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
})();
