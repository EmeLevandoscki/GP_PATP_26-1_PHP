function getPastaBase() {
  if (PASTA_BASE === '/') {
    return '';
  }

  return PASTA_BASE;
}
(function () {
  'use strict';
  localStorage.clear();
  const KEYS = {
    events: 'ideauEventos.events.v3.separated',
    registrations: 'ideauEventos.registrations.v3.separated',
    session: 'ideauEventos.organizerSession.v3.separated',
    settings: 'ideauEventos.settings.v1.audienceFields'
  };

  const API_ENDPOINT = '../src/Controller/EventoController.php';

  const ORGANIZER = {
    email: 'organizador@ideau.edu.br',
    password: 'ideau2026',
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
      description: `🎉 Colônia de Férias Infantil 🎨⚽🌈\n
                    Diversão, aprendizado e muitas aventuras esperam pelas crianças na nossa Colônia de Férias! Durante o evento, os participantes poderão aproveitar atividades recreativas, brincadeiras em grupo, oficinas criativas, jogos, esportes, música, dança e momentos de integração em um ambiente seguro e acolhedor.\n
                    Nossa programação foi pensada para estimular a criatividade, a socialização e o desenvolvimento das crianças de forma leve e divertida, sempre acompanhadas por monitores preparados.\n
                    📅 Venha viver dias inesquecíveis cheios de alegria, amizade e novas descobertas!
                    ✨ Atividades recreativas
                    🎨 Oficinas criativas
                    ⚽ Jogos e esportes
                    🎵 Música e dança
                    🍿 Momentos de lazer e integração`,
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

  async function fetchRegistrationsCount2() { //charque só pra arrumar ligeiro, refazer depois
    const res = await fetch(`${getPastaBase()}/src/Controller/EventoController.php?action=qtd_inscricoes_evento&id=1`); //charque arrumar
    const data = await res.json();

    return data.count;
  }  

  document.addEventListener('DOMContentLoaded', () => {
    seedData();
    initMenu();
    initLogout();
    const page = document.body.dataset.page;

    if (page === 'home') initHomePage();
    if (page === 'event-detail') initEventDetailPage();
    if (page === 'login') initLoginPage();
    if (page === 'dashboard') initDashboardPage();
    if (page === 'admin-events') initAdminEventsPage();
    if (page === 'event-form') initEventFormPage();
    if (page === 'registrations') initRegistrationsPage();
    if (page === 'reports') initReportsPage();
    if (page === 'settings') initSettingsPage();
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
    document.getElementById('logoutButton')?.addEventListener('click', () => {
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
    document.getElementById('loginForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const email = getValue('loginEmail').trim().toLowerCase();
      const password = getValue('loginPassword');
      if (email !== ORGANIZER.email || password !== ORGANIZER.password) {
        showToast('E-mail ou senha incorretos.');
        return;
      }fetchRegistrationsCount2
      sessionStorage.setItem(KEYS.session, JSON.stringify({ email, name: ORGANIZER.name, loggedAt: new Date().toISOString() }));
      window.location.href = 'dashboard.html';
    });fetchRegistrationsCount2
  }

  async function initDashboardPage() {
    if (!requireAuth()) return;
    apiRegistrations = await fetchRegistrationsFromApi();
    renderDashboard();
  }

  function initAdminEventsPage() {
    if (!requireAuth()) return;
    renderAdminEventsTable();
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
    initEventAudienceControls();
    populateEventForm();
    document.getElementById('eventForm')?.addEventListener('submit', handleEventFormSubmit);
  }

  async function initRegistrationsPage() {
    if (!requireAuth()) return;

    apiRegistrations = await fetchRegistrationsFromApi();
    renderRegistrationFilters();
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
    renderReportEventFilter();

    apiRegistrations = await fetchRegistrationsFromApi();
    renderReportsPage();
    
    document.getElementById('reportEventFilter')?.addEventListener('change', renderReportsPage);
    document.getElementById('reportSearch')?.addEventListener('input', renderReportsPage);
    document.getElementById('exportFilteredExcel')?.addEventListener('click', () => exportEventExcel(getValue('reportEventFilter') || 'todos'));
    document.getElementById('printFilteredPdf')?.addEventListener('click', () => printEventReport(getValue('reportEventFilter') || 'todos'));
    document.addEventListener('click', event => {
      const printId = event.target.closest('[data-print-event]')?.dataset.printEvent;
      if (printId) {
        printEventReport(printId);
        return;
      }
      const excelId = event.target.closest('[data-excel-event]')?.dataset.excelEvent;
      if (excelId) exportEventExcel(excelId);
    });
  }

  function initEventAudienceControls() {
    const select = document.getElementById('eventAudience');
    if (!select) return;
    select.addEventListener('change', () => {
      toggleAudienceFieldGroups();
      applyDefaultFields(select.value || 'graduacao');
    });
    document.getElementById('applyAudienceDefaults')?.addEventListener('click', () => {
      applyDefaultFields(select.value || 'graduacao');
      showToast('Padrão de campos aplicado.');
    });
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
    return Boolean(sessionStorage.getItem(KEYS.session));
  }

  async function renderPublicStats() {
    const published = getEvents().filter(event => event.published);
    setText('statEventos', published.length);
    setText('statInscricoes', await fetchRegistrationsCount2());
  }

  function renderHomeEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    const query = getValue('searchInput').toLowerCase();
    const category = getValue('categoryFilter') || 'todos';

    const events = getEvents()
      .filter(event => event.published)
      .filter(event => category === 'todos' || event.category === category)
      .filter(event => !query || [event.title, event.summary, event.location, event.city, CATEGORIES[event.category]].join(' ').toLowerCase().includes(query))
      .sort(compareEventsByDate);

    if (!events.length) {
      grid.innerHTML = '<div class="empty-state">Nenhum evento publicado encontrado.</div>';
      return;
    }

    grid.innerHTML = events.map(eventCardTemplate).join('');
  }

  function eventCardTemplate(event) {
    const used = countRegistrations(event.id);
    let remaining;
    if (event.seats != -1) {
      remaining = Math.max(Number(event.seats || 0) - used, 0);
    } else {
      remaining = -1;
    }
    const cover = event.cover ? `<img src="${escapeAttr(event.cover)}" alt="${escapeAttr(event.title)}" loading="lazy">` : '';
    return `
      <article class="event-card">
        <a class="event-cover" href="ideau_eventos/evento.html?id=${encodeURIComponent(event.id)}" aria-label="Abrir evento ${escapeAttr(event.title)}">
          ${cover}
          <div class="event-date"><strong>${datePart(event.date_begin, 'day')}</strong><span>${datePart(event.date_begin, 'month')}</span></div>
        </a>
        <div class="event-body">
          <span class="event-tag">${escapeHtml(CATEGORIES[event.category] || event.category)}</span>
          <h3 class="event-title">${escapeHtml(event.title)}</h3>
          <div class="event-meta">Início: ${formatDate(event.date_begin)}<br>Fim: ${formatDate(event.date_end)}<br>${escapeHtml(event.time_begin)} — ${escapeHtml(event.time_end)}<br>${escapeHtml(event.location)} — ${escapeHtml(event.city)}</div>
          <p class="muted">${escapeHtml(event.summary)}</p>
          <div class="event-actions">
            <span class="seats-pill">${remaining === -1 ? 'Livre' : `${remaining} vagas`}</span>
            <a class="btn btn-primary" href="ideau_eventos/evento.html?id=${encodeURIComponent(event.id)}">Ver evento</a>
          </div>
        </div>
      </article>`;
  }

  function renderEventDetail() {
    const root = document.getElementById('eventDetailRoot');
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const isRegistrationPage = params.get('inscricao') === '1';
    const event = getEvents().find(item => item.id === id && item.published);

    const navRegistration = document.getElementById('eventRegistrationNav');
    const navDetails = document.getElementById('eventDetailsNav');
    if (navRegistration && id) navRegistration.href = eventRegistrationUrl(id);
    if (navDetails && id) navDetails.href = `evento.html?id=${encodeURIComponent(id)}`;

    if (!event) {
      root.innerHTML = `
        <section class="section-block">
          <div class="empty-state">
            <h2>Evento não encontrado</h2>
            <p>O evento pode estar despublicado, removido ou com link incorreto.</p>
            <a class="btn btn-primary" href="index.html#eventos">Voltar para eventos</a>
          </div>
        </section>`;
      return;
    }

    document.title = `${isRegistrationPage ? 'Inscrição' : 'Evento'} — ${event.title}`;

    if (isRegistrationPage) {
      renderRegistrationPublicPage(root, event);
      return;
    }

    const remaining = event.seats != -1 ? Math.max(Number(event.seats || 0) - countRegistrations(event.id), 0) : -1;
    const cover = event.cover ? `<img src="${escapeAttr(event.cover)}" alt="${escapeAttr(event.title)}">` : '';

    root.innerHTML = `
      <section class="event-detail-hero">
        <div class="event-detail-cover">${cover}</div>
        <aside class="event-detail-info">
          <p class="eyebrow">${escapeHtml(CATEGORIES[event.category] || event.category)}</p>
          <h1>${escapeHtml(event.title)}</h1>
          <p class="muted big">${escapeHtml(event.summary)}</p>
          <div class="event-detail-meta">
            <div class="meta-row"><strong>Data Início</strong><span>${formatDate(event.date_begin)}</span></div>
            <div class="meta-row"><strong>Data Fim</strong><span>${formatDate(event.date_end)}</span></div>
            <div class="meta-row"><strong>Horário</strong><span>Início: ${escapeHtml(event.time_begin)} - Fim: ${escapeHtml(event.time_end)}</span></div>
            <div class="meta-row"><strong>Local</strong><span>${escapeHtml(event.location)} — ${escapeHtml(event.city)}</span></div>
            <div class="meta-row"><strong>Vagas</strong><span>${event.seats == -1 ? 'Livre' : `${remaining} disponíveis de ${Number(event.seats || 0)}`}</span></div>
          </div>
          ${event.seats != -1 && remaining <= 0 ? '<button class="btn btn-secondary full" type="button" disabled>Vagas esgotadas</button>' : `<a class="btn btn-primary full" href="${eventRegistrationUrl(event.id)}">Ir para inscrição</a>`}
        </aside>
      </section>

      <section class="event-public-layout detail-only-layout">
        <article class="description-card">
          <p class="eyebrow">Descrição completa</p>
          <h2>Sobre o evento</h2>
          <div class="description-content">${escapeHtml(event.description)}</div>
        </article>
      </section>`;
  }

  function eventRegistrationUrl(eventId) {
    return `evento.html?id=${encodeURIComponent(eventId)}&inscricao=1`;
  }

  function renderRegistrationPublicPage(root, event) {
    const remaining = event.seats != -1 ? Math.max(Number(event.seats || 0) - countRegistrations(event.id), 0) : -1;
    root.innerHTML = `
      <section class="event-form-page">
        <article class="description-card registration-summary-card">
          <p class="eyebrow">Formulário de inscrição</p>
          <h1>${escapeHtml(event.title)}</h1>
          <p class="muted big">Preencha os dados solicitados pelo organizador para confirmar sua participação.</p>
          <div class="event-detail-meta">
            <div class="meta-row"><strong>Data</strong><span>Início: ${formatDate(event.date_begin)}<br>Fim: ${formatDate(event.date_end)}<br>Horário: ${escapeHtml(event.time_begin)} — ${escapeHtml(event.time_end)}<br></span></div>
            <div class="meta-row"><strong>Local</strong><span>${escapeHtml(event.location)} — ${escapeHtml(event.city)}</span></div>
            <div class="meta-row"><strong>Vagas</strong><span>${remaining === -1 ? 'Ilimitadas' : `${remaining} disponíveis de ${Number(event.seats || 0)}`}</span></div>
          </div>
          <a class="btn btn-secondary" href="evento.html?id=${encodeURIComponent(event.id)}">Voltar para a página do evento</a>
        </article>
        <aside class="event-registration-card" id="inscricao">
          <p class="eyebrow">Dados do participante</p>
          <h2>Confirmar inscrição</h2>
          ${event.seats != -1 && remaining <= 0 ? '<div class="empty-state">As vagas deste evento estão esgotadas.</div>' : registrationFormTemplate(event)}
        </aside>
      </section>`;

    document.getElementById('registrationForm')?.addEventListener('submit', submitRegistration);
    document.getElementById('participantType')?.addEventListener('change', updateCourseVisibility);
    updateCourseVisibility();
  }

  function requestedFieldsSummary(fields = {}, audience = 'graduacao') {
    const names = [];
    if (audience === 'escola') {
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
        <div class="audience-pill">${escapeHtml(AUDIENCES[audience])}</div>
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

  function submitRegistration(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const eventId = form.dataset.eventId;
    const targetEvent = getEvents().find(item => item.id === eventId);
    if (!targetEvent) return;

    const remaining = targetEvent.seats != -1 ? Number(targetEvent.seats || 0) - countRegistrations(eventId) : -1;
    if (targetEvent.seats != -1 && remaining <= 0) {
      showToast('As vagas deste evento estão esgotadas.');
      return;
    }

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
          showToast(data.message || 'Erro ao registrar inscrição.');
          return;
        }

        const card = document.getElementById('inscricao');
        card.innerHTML = `<div class="success-card"><strong>Inscrição confirmada</strong><p>Sua inscrição em <b>${escapeHtml(targetEvent.title)}</b> foi registrada.</p><a class="btn btn-secondary full" href="evento.html?id=${encodeURIComponent(targetEvent.id)}">Voltar ao evento</a><a class="btn btn-light full top-gap" href="index.html#eventos">Ver outros eventos</a></div>`;
        showToast('Inscrição registrada com sucesso.');
      })
      .catch((error) => {
        console.log(error);
        showToast('Erro ao enviar inscrição. Tente novamente mais tarde. ' + (error.message || ''));
      });
  }

  function renderDashboard() {
    const events = getEvents();
    const regs = getRegistrations();
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
        return `<div class="mini-item"><strong>${escapeHtml(event.title)}</strong><span>${formatDate(event.date_begin)} - ${formatDate(event.date_end)} · ${event.seats == -1 ? 'Vagas Ilimitadas · ' : used + '/' + Number(event.seats || 0) + 'inscritos · '}${event.published ? 'Publicado' : 'Rascunho'}</span></div>`;
      }).join('') || '<div class="empty-state">Nenhum evento cadastrado.</div>';
    }

    const dashRegs = document.getElementById('dashboardRegistrations');
    if (dashRegs) {
      dashRegs.innerHTML = regs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(reg => {
        const event = events.find(item => item.id == reg.eventId);
        return `<div class="mini-item"><strong>${escapeHtml(reg.name)}</strong><span>${escapeHtml(event?.title || 'Evento removido')} · ${formatDateTime(reg.createdAt)}</span></div>`;
      }).join('') || '<div class="empty-state">Nenhuma inscrição registrada.</div>';
    }
  }

  async function renderAdminEventsTable() {
    const tbody = document.getElementById('adminEventsTable');
    if (!tbody) return;
    const events = getEvents().sort(compareEventsByDate);
    if (!events.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum evento cadastrado.</td></tr>';
      return;
    }
    const used = await countRegistrations(events[0].id); //charque, arrumar pois pega apenas do primeiro evento
    tbody.innerHTML = events.map(event => {
      return `
        <tr>
          <td><strong>${escapeHtml(event.title)}</strong><br><span class="muted">${escapeHtml(CATEGORIES[event.category] || event.category)} · ${escapeHtml(AUDIENCES[getEventAudience(event)])} · ${escapeHtml(event.city)}</span></td>
          <td>${formatDate(event.date_begin)}<br><span class="muted">${escapeHtml(event.time_begin)}</span></td>
          
          <td>${event.seats == -1 ? 'Ilimitadas' : Number(event.seats || 0)}</td>
          <td>${used}</td>
          <td><span class="status-pill ${event.published ? '' : 'off'}">${event.published ? 'Publicado' : 'Rascunho'}</span></td>
          <td>
            <div class="row-actions">
              <a class="btn btn-light small" href="evento.html?id=${encodeURIComponent(event.id)}" target="_blank">Divulgação</a>
              <a class="btn btn-light small" href="${eventRegistrationUrl(event.id)}" target="_blank">Inscrição</a>
              <button class="btn btn-light small" type="button" data-copy-link="${escapeAttr(event.id)}">Copiar link</button>
              <!-- TODO <a class="btn btn-secondary small" href="evento-form.html?id=${encodeURIComponent(event.id)}">Editar</a> -->
              <a class="btn btn-secondary small" href="relatorios.html?event=${encodeURIComponent(event.id)}">Relatório</a>
              <!-- TODO <button class="btn btn-danger small" type="button" data-delete-event="${escapeAttr(event.id)}">Excluir</button> -->
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function handleAdminEventActions(event) {
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
      applyDefaultFields(getValue('eventAudience') || 'graduacao');
      toggleAudienceFieldGroups();
      return;
    }

    setText('formPageTitle', 'Editar evento');
    setValue('eventId', event.id);
    setValue('eventTitle', event.title);
    setValue('eventCategory', event.category);
    setValue('eventAudience', getEventAudience(event));
    setValue('eventDate', event.date);
    setValue('eventTime', event.time);
    setValue('eventSeats', event.seats);
    setValue('eventCity', event.city);
    setValue('eventLocation', event.location);
    setValue('eventCover', event.cover);
    setValue('eventSummary', event.summary);
    setValue('eventDescription', event.description);
    setChecked('fieldCpf', Boolean(event.fields?.cpf));
    setChecked('fieldEmail', Boolean(event.fields?.email));
    setChecked('fieldPhone', Boolean(event.fields?.phone));
    setChecked('fieldCourse', Boolean(event.fields?.course));
    setChecked('fieldCommunity', Boolean(event.fields?.community));
    setChecked('fieldNotes', Boolean(event.fields?.notes));
    setChecked('fieldResponsibleName', event.fields?.responsibleName !== false);
    setChecked('fieldRelationship', event.fields?.relationship !== false);
    setChecked('fieldStudentName', event.fields?.studentName !== false);
    setChecked('fieldStudentClass', event.fields?.studentClass !== false);
    setChecked('eventPublished', Boolean(event.published));
    setValue('eventExtraFields', (event.fields?.extras || []).map(extra => `${extra.label}${extra.required ? '|required' : ''}`).join('\n'));
    toggleAudienceFieldGroups();
  }

  function handleEventFormSubmit(event) {
    event.preventDefault();
    const existingId = getValue('eventId');
    const title = clean(getValue('eventTitle'));
    const id = existingId || `evt-${slugify(title)}-${Date.now().toString(36)}`;
    const events = getEvents();
    const nextEvent = {
      id,
      title,
      category: getValue('eventCategory'),
      audience: getValue('eventAudience') || 'graduacao',
      date: getValue('eventDate'),
      time: getValue('eventTime'),
      seats: Number(getValue('eventSeats') || 0),
      city: clean(getValue('eventCity')),
      location: clean(getValue('eventLocation')),
      cover: clean(getValue('eventCover')),
      summary: clean(getValue('eventSummary')),
      description: clean(getValue('eventDescription')),
      published: getChecked('eventPublished'),
      fields: {
        cpf: getChecked('fieldCpf'),
        email: getChecked('fieldEmail'),
        phone: getChecked('fieldPhone'),
        course: getChecked('fieldCourse'),
        community: getChecked('fieldCommunity'),
        notes: getChecked('fieldNotes'),
        responsibleName: getChecked('fieldResponsibleName'),
        relationship: getChecked('fieldRelationship'),
        studentName: getChecked('fieldStudentName'),
        studentClass: getChecked('fieldStudentClass'),
        extras: parseExtraFields(getValue('eventExtraFields'))
      }
    };

    const index = events.findIndex(item => item.id === id);
    if (index >= 0) events[index] = nextEvent;
    else events.push(nextEvent);
    saveEvents(events);
    showToast('Evento salvo com sucesso.');
    setTimeout(() => window.location.href = 'eventos.html', 500);
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

  function renderReportEventFilter() {
    const select = document.getElementById('reportEventFilter');
    if (!select) return;
    const selected = new URLSearchParams(window.location.search).get('event') || 'todos';
    const events = getEvents().sort(compareEventsByDate);
    select.innerHTML = '<option value="todos">Todos os eventos</option>' + events.map(event => `<option value="${escapeAttr(event.id)}">${escapeHtml(event.title)}</option>`).join('');
    select.value = events.some(event => event.id === selected) ? selected : 'todos';
  }

  function renderReportsPage() {
    const summary = document.getElementById('reportSummary');
    const cards = document.getElementById('reportEventCards');
    const tbody = document.getElementById('reportRegistrationsTable');
    if (!summary || !cards || !tbody) return;

    const eventFilter = getValue('reportEventFilter') || 'todos';
    const query = getValue('reportSearch').toLowerCase();
    const events = getEvents().sort(compareEventsByDate);
    const registrations = getRegistrations();
    const filteredRows = getReportRows(eventFilter, query);
    const scopedEvents = eventFilter === 'todos' ? events : events.filter(event => event.id === eventFilter);
    const totalSeats = scopedEvents.reduce((sum, event) => sum + Number(event.seats || 0), 0);
    const totalRegs = eventFilter === 'todos'
      ? registrations.length
      : registrations.filter(reg => reg.eventId === eventFilter).length;
    const occupancy = totalSeats ? Math.round((totalRegs / totalSeats) * 100) : 0;

   // summary.innerHTML = `
      // <article class="metric-card"><span class="metric-value">${scopedEvents.length}</span><span class="metric-label">Eventos no filtro</span></article>
      // <article class="metric-card"><span class="metric-value">${totalRegs}</span><span class="metric-label">Inscrições</span></article>
      // <article class="metric-card"><span class="metric-value">${occupancy}%</span><span class="metric-label">Ocupação</span></article>
      // <article class="metric-card"><span class="metric-value">${filteredRows.length}</span><span class="metric-label">Linhas exibidas</span></article>`;
    cards.innerHTML = scopedEvents.map(event => reportEventCardTemplate(event)).join('') || '<div class="empty-state">Nenhum evento cadastrado.</div>';

    if (!filteredRows.length) {
      tbody.innerHTML = '<tr><td colspan="10">Nenhum registro encontrado para o filtro aplicado.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredRows.map(row => `
      <tr>
        <td><strong>${escapeHtml(row.eventTitle)}</strong></td>
        <td>${formatDate(row.eventDate_begin)} · ${escapeHtml(row.eventTime)}</td>
        <td>${formatDateTime(row.createdAt)}</td>
        <td><strong>${escapeHtml(row.displayName)}</strong><br>
        <td>${escapeHtml(row.responsibleName || '—')}</td>
        <td>${escapeHtml(row.responsiblecpf || '—')}</td>
        <td>${escapeHtml(row.relationship || '—')}</td>
        <td>${escapeHtml(row.studentClass || '—')}</td>
        <td>${escapeHtml(row.course || '—')}</td>
        <!-- <td>${escapeHtml(row.email || '—')}<br><span class="muted">${escapeHtml(row.phone || '—')}</span></td> -->
        <!-- <td>${escapeHtml(labelParticipant(row.participantType))}</td> -->
        <!-- <td>${escapeHtml(row.notes || '—')}</td> -->
      </tr>`).join('');
  }

  function reportEventCardTemplate(event) {
    const used = countRegistrations(event.id);
    const seats = Number(event.seats || 0);
    const remaining = Math.max(seats - used, 0);
    const occupancy = seats ? Math.round((used / seats) * 100) : 0;
    return `
      <article class="report-card">
        <div>
          <span class="event-tag">${escapeHtml(CATEGORIES[event.category] || event.category)}</span>
          <h3>${escapeHtml(event.title)}</h3>
          <p class="muted">Início: ${formatDate(event.date_begin)}<br>Fim: ${formatDate(event.date_end)}<br>${escapeHtml(event.time_begin)} — ${escapeHtml(event.time_end)}<br>${escapeHtml(event.location)} — ${escapeHtml(event.city)}</p>
        </div>
        <!-- <div class="report-meta-list">
          <span><strong>${used}</strong> inscritos</span>
          <span><strong>${remaining}</strong> vagas restantes</span>
          <span><strong>${occupancy}%</strong> ocupação</span>
          <span><strong>${event.published ? 'Publicado' : 'Rascunho'}</strong> status</span>
         </div> -->
        <div class="report-actions">
          <button class="btn btn-primary small" type="button" data-print-event="${escapeAttr(event.id)}">PDF</button>
          <button class="btn btn-secondary small" type="button" data-excel-event="${escapeAttr(event.id)}">Excel</button>
          <a class="btn btn-light small" href="inscritos.html">Ver inscritos</a>
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
          responsiblecpf: reg.responsiblecpf || '',
          relationship: reg.relationship || 'Responsável',
          email: reg.email || '',
          phone: reg.phone || '',
          participantType: reg.participantType || '',
          course: reg.course || '',
          notes: reg.notes || '',
          extras: reg.extras || {}
        };
      })
      .filter(row => !query || [row.eventTitle, row.name, row.displayName, row.responsibleName, row.studentName, row.studentClass, row.cpf, row.email, row.phone, row.course, row.eventCity].join(' ').toLowerCase().includes(query))
      .sort((a, b) => `${a.eventDate} ${a.eventTime}`.localeCompare(`${b.eventDate} ${b.eventTime}`) || a.name.localeCompare(b.name));
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
    const rows = getReportRows(eventId, '');//getValue('reportSearch').toLowerCase());
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
        <td><strong>${escapeHtml(row.displayName)}</strong><br>
        <td>${escapeHtml(row.responsibleName || '—')}</td>
        <td>${escapeHtml(row.responsiblecpf || '—')}</td>
        <td>${escapeHtml(row.relationship || '—')}</td>
        <td>${escapeHtml(row.studentClass || '—')}</td>
        <td>${escapeHtml(row.course || '—')}</td>
        <!-- <td>${escapeHtml(row.email || '—')}<br><span class="muted">${escapeHtml(row.phone || '—')}</span></td> -->
        <!-- <td>${escapeHtml(labelParticipant(row.participantType))}</td> -->
        <!-- <td>${escapeHtml(row.notes || '—')}</td> -->
      </tr>`).join('') || '<tr><td colspan="13">Nenhuma inscrição encontrada.</td></tr>';

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
    const audience = getValue('eventAudience') || 'graduacao';
    const graduationGroup = document.getElementById('graduationFieldsGroup');
    const schoolGroup = document.getElementById('schoolFieldsGroup');
    if (graduationGroup) graduationGroup.hidden = audience !== 'graduacao';
    if (schoolGroup) schoolGroup.hidden = audience !== 'escola';
  }

  function applyDefaultFields(audience = 'graduacao') {
    const defaults = getFieldDefaults(audience);
    setChecked('fieldCpf', Boolean(defaults.cpf));
    setChecked('fieldEmail', Boolean(defaults.email));
    setChecked('fieldPhone', Boolean(defaults.phone));
    setChecked('fieldCourse', audience === 'graduacao' && Boolean(defaults.course));
    setChecked('fieldCommunity', audience === 'graduacao' && Boolean(defaults.community));
    setChecked('fieldNotes', Boolean(defaults.notes));
    setChecked('fieldResponsibleName', audience === 'escola' && defaults.responsibleName !== false);
    setChecked('fieldRelationship', audience === 'escola' && defaults.relationship !== false);
    setChecked('fieldStudentName', audience === 'escola' && defaults.studentName !== false);
    setChecked('fieldStudentClass', audience === 'escola' && defaults.studentClass !== false);
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
    return safeJson(localStorage.getItem(KEYS.events), []);
  }

  function saveEvents(events) {
    localStorage.setItem(KEYS.events, JSON.stringify(events));
  }

  function getRegistrations() {
    return apiRegistrations;
  }

  function saveRegistrations(registrations) {
    localStorage.setItem(KEYS.registrations, JSON.stringify(registrations));
  }

  function safeJson(text, fallback) {
    try { return JSON.parse(text) || fallback; } catch { return fallback; }
  }

  async function countRegistrations(eventId) {
    return await fetchRegistrationsCount(eventId);
  }

  function compareEventsByDate(a, b) {
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
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
