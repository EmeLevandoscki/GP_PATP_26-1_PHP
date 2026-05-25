(function () {
  'use strict';

  const KEYS = {
    events: 'ideauEventos.events.v3.separated',
    registrations: 'ideauEventos.registrations.v3.separated',
    session: 'ideauEventos.organizerSession.v3.separated'
  };

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
    esportivo: 'Esportivo'
  };

  const DEFAULT_EVENTS = [
    {
      id: 'evt-ads-2026',
      title: 'Semana Acadêmica de ADS',
      category: 'academico',
      date: '2026-06-05',
      time: '19:30',
      location: 'Auditório principal',
      city: 'Passo Fundo',
      seats: 180,
      cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80',
      summary: 'Palestras e oficinas práticas sobre desenvolvimento de sistemas, dados e carreira em tecnologia.',
      description: 'A Semana Acadêmica de ADS reúne estudantes, professores, egressos e comunidade interessada em tecnologia.\n\nProgramação sugerida:\n• Palestra de abertura sobre carreira em tecnologia;\n• Oficina prática de desenvolvimento web;\n• Painel sobre dados, automação e inteligência artificial;\n• Mesa de conversa com egressos do curso.\n\nO organizador pode editar esta descrição, alterar campos de inscrição e publicar o link individual do evento.',
      published: true,
      fields: {
        cpf: true,
        email: true,
        phone: true,
        course: true,
        community: true,
        notes: false,
        extras: [{ label: 'Matrícula', required: false }]
      }
    },
    {
      id: 'evt-saude-2026',
      title: 'Jornada Integrada da Saúde',
      category: 'institucional',
      date: '2026-06-12',
      time: '08:00',
      location: 'Campus IDEAU',
      city: 'Getúlio Vargas',
      seats: 220,
      cover: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80',
      summary: 'Atividades integradas entre cursos da área da saúde, com mesas temáticas e ações abertas.',
      description: 'A Jornada Integrada da Saúde promove atividades conjuntas entre cursos, professores e profissionais convidados.\n\nO evento pode aceitar somente alunos ou também comunidade externa, conforme configuração definida pelo organizador.',
      published: true,
      fields: {
        cpf: true,
        email: true,
        phone: true,
        course: true,
        community: false,
        notes: true,
        extras: []
      }
    }
  ];

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
  });

  function seedData() {
    if (!localStorage.getItem(KEYS.events)) saveEvents(DEFAULT_EVENTS);
    if (!localStorage.getItem(KEYS.registrations)) saveRegistrations([]);
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
      }
      sessionStorage.setItem(KEYS.session, JSON.stringify({ email, name: ORGANIZER.name, loggedAt: new Date().toISOString() }));
      window.location.href = 'dashboard.html';
    });
  }

  function initDashboardPage() {
    if (!requireAuth()) return;
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
    populateEventForm();
    document.getElementById('eventForm')?.addEventListener('submit', handleEventFormSubmit);
  }

  function initRegistrationsPage() {
    if (!requireAuth()) return;
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

  function requireAuth() {
    if (isLogged()) return true;
    window.location.href = 'login.html';
    return false;
  }

  function isLogged() {
    return Boolean(sessionStorage.getItem(KEYS.session));
  }

  function renderPublicStats() {
    const published = getEvents().filter(event => event.published);
    setText('statEventos', published.length);
    setText('statInscricoes', getRegistrations().length);
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
    const remaining = Math.max(Number(event.seats || 0) - used, 0);
    const cover = event.cover ? `<img src="${escapeAttr(event.cover)}" alt="${escapeAttr(event.title)}" loading="lazy">` : '';
    return `
      <article class="event-card">
        <a class="event-cover" href="evento.html?id=${encodeURIComponent(event.id)}" aria-label="Abrir evento ${escapeAttr(event.title)}">
          ${cover}
          <div class="event-date"><strong>${datePart(event.date, 'day')}</strong><span>${datePart(event.date, 'month')}</span></div>
        </a>
        <div class="event-body">
          <span class="event-tag">${escapeHtml(CATEGORIES[event.category] || event.category)}</span>
          <h3 class="event-title">${escapeHtml(event.title)}</h3>
          <div class="event-meta">${formatDate(event.date)} às ${escapeHtml(event.time)}<br>${escapeHtml(event.location)} — ${escapeHtml(event.city)}</div>
          <p class="muted">${escapeHtml(event.summary)}</p>
          <div class="event-actions">
            <span class="seats-pill">${remaining} vagas</span>
            <a class="btn btn-primary" href="evento.html?id=${encodeURIComponent(event.id)}">Ver evento</a>
          </div>
        </div>
      </article>`;
  }

  function renderEventDetail() {
    const root = document.getElementById('eventDetailRoot');
    if (!root) return;
    const id = new URLSearchParams(window.location.search).get('id');
    const event = getEvents().find(item => item.id === id && item.published);

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

    const remaining = Math.max(Number(event.seats || 0) - countRegistrations(event.id), 0);
    const cover = event.cover ? `<img src="${escapeAttr(event.cover)}" alt="${escapeAttr(event.title)}">` : '';

    root.innerHTML = `
      <section class="event-detail-hero">
        <div class="event-detail-cover">${cover}</div>
        <aside class="event-detail-info">
          <p class="eyebrow">${escapeHtml(CATEGORIES[event.category] || event.category)}</p>
          <h1>${escapeHtml(event.title)}</h1>
          <p class="muted big">${escapeHtml(event.summary)}</p>
          <div class="event-detail-meta">
            <div class="meta-row"><strong>Data</strong><span>${formatDate(event.date)} às ${escapeHtml(event.time)}</span></div>
            <div class="meta-row"><strong>Local</strong><span>${escapeHtml(event.location)} — ${escapeHtml(event.city)}</span></div>
            <div class="meta-row"><strong>Vagas</strong><span>${remaining} disponíveis de ${Number(event.seats || 0)}</span></div>
          </div>
          <a class="btn btn-primary full" href="#inscricao">Fazer inscrição</a>
        </aside>
      </section>

      <section class="event-public-layout">
        <article class="description-card">
          <p class="eyebrow">Descrição completa</p>
          <h2>Sobre o evento</h2>
          <div class="description-content">${escapeHtml(event.description)}</div>
        </article>
        <aside class="event-registration-card" id="inscricao">
          <p class="eyebrow">Inscrição</p>
          <h2>Participar</h2>
          ${remaining <= 0 ? '<div class="empty-state">As vagas deste evento estão esgotadas.</div>' : registrationFormTemplate(event)}
        </aside>
      </section>`;

    document.getElementById('registrationForm')?.addEventListener('submit', submitRegistration);
    document.getElementById('participantType')?.addEventListener('change', updateCourseVisibility);
    updateCourseVisibility();
  }

  function registrationFormTemplate(event) {
    const fields = event.fields || {};
    const extras = Array.isArray(fields.extras) ? fields.extras : [];
    const courseOptions = COURSES.map(course => `<option value="${escapeAttr(course)}">${escapeHtml(course)}</option>`).join('');
    const showTypeSelect = Boolean(fields.course || fields.community);

    return `
      <form class="form-stack" id="registrationForm" data-event-id="${escapeAttr(event.id)}">
        <label class="form-field"><span>Nome completo *</span><input name="name" required autocomplete="name" placeholder="Seu nome completo"></label>
        ${fields.cpf ? '<label class="form-field"><span>CPF *</span><input name="cpf" required inputmode="numeric" placeholder="000.000.000-00"></label>' : ''}
        ${fields.email ? '<label class="form-field"><span>E-mail *</span><input name="email" type="email" required autocomplete="email" placeholder="seu@email.com"></label>' : ''}
        ${fields.phone ? '<label class="form-field"><span>Telefone *</span><input name="phone" required inputmode="tel" autocomplete="tel" placeholder="(54) 99999-9999"></label>' : ''}
        ${showTypeSelect ? participantTypeTemplate(fields) : ''}
        ${fields.course ? `<label class="form-field" id="courseField"><span>Curso *</span><select name="course" id="courseSelect"><option value="">Selecione o curso</option>${courseOptions}</select></label>` : ''}
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

    const remaining = Number(targetEvent.seats || 0) - countRegistrations(eventId);
    if (remaining <= 0) {
      showToast('As vagas deste evento estão esgotadas.');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const extraValues = {};
    Object.keys(data).forEach(key => {
      if (key.startsWith('extra_')) extraValues[key.replace('extra_', '')] = data[key];
    });

    const registration = {
      id: `reg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      eventId,
      createdAt: new Date().toISOString(),
      name: clean(data.name),
      cpf: clean(data.cpf),
      email: clean(data.email),
      phone: clean(data.phone),
      participantType: clean(data.participantType || 'participante'),
      course: clean(data.course),
      notes: clean(data.notes),
      extras: extraValues
    };

    const registrations = getRegistrations();
    registrations.push(registration);
    saveRegistrations(registrations);

    const card = document.getElementById('inscricao');
    card.innerHTML = `<div class="success-card"><strong>Inscrição confirmada</strong><p>Sua inscrição em <b>${escapeHtml(targetEvent.title)}</b> foi registrada.</p><a class="btn btn-secondary full" href="index.html#eventos">Ver outros eventos</a></div>`;
    showToast('Inscrição registrada com sucesso.');
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
    setText('metricSeats', `${avg}%`);

    const dashEvents = document.getElementById('dashboardEvents');
    if (dashEvents) {
      dashEvents.innerHTML = events.slice().sort(compareEventsByDate).slice(0, 5).map(event => {
        const used = countRegistrations(event.id);
        return `<div class="mini-item"><strong>${escapeHtml(event.title)}</strong><span>${formatDate(event.date)} · ${used}/${Number(event.seats || 0)} inscritos · ${event.published ? 'Publicado' : 'Rascunho'}</span></div>`;
      }).join('') || '<div class="empty-state">Nenhum evento cadastrado.</div>';
    }

    const dashRegs = document.getElementById('dashboardRegistrations');
    if (dashRegs) {
      dashRegs.innerHTML = regs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(reg => {
        const event = events.find(item => item.id === reg.eventId);
        return `<div class="mini-item"><strong>${escapeHtml(reg.name)}</strong><span>${escapeHtml(event?.title || 'Evento removido')} · ${formatDateTime(reg.createdAt)}</span></div>`;
      }).join('') || '<div class="empty-state">Nenhuma inscrição registrada.</div>';
    }
  }

  function renderAdminEventsTable() {
    const tbody = document.getElementById('adminEventsTable');
    if (!tbody) return;
    const events = getEvents().sort(compareEventsByDate);
    if (!events.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum evento cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = events.map(event => {
      const used = countRegistrations(event.id);
      return `
        <tr>
          <td><strong>${escapeHtml(event.title)}</strong><br><span class="muted">${escapeHtml(CATEGORIES[event.category] || event.category)} · ${escapeHtml(event.city)}</span></td>
          <td>${formatDate(event.date)}<br><span class="muted">${escapeHtml(event.time)}</span></td>
          <td>${Number(event.seats || 0)}</td>
          <td>${used}</td>
          <td><span class="status-pill ${event.published ? '' : 'off'}">${event.published ? 'Publicado' : 'Rascunho'}</span></td>
          <td>
            <div class="row-actions">
              <a class="btn btn-light small" href="evento.html?id=${encodeURIComponent(event.id)}" target="_blank">Abrir</a>
              <button class="btn btn-light small" type="button" data-copy-link="${escapeAttr(event.id)}">Copiar link</button>
              <a class="btn btn-secondary small" href="evento-form.html?id=${encodeURIComponent(event.id)}">Editar</a>
              <button class="btn btn-danger small" type="button" data-delete-event="${escapeAttr(event.id)}">Excluir</button>
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
    if (!event) return;

    setText('formPageTitle', 'Editar evento');
    setValue('eventId', event.id);
    setValue('eventTitle', event.title);
    setValue('eventCategory', event.category);
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
    setChecked('eventPublished', Boolean(event.published));
    setValue('eventExtraFields', (event.fields?.extras || []).map(extra => `${extra.label}${extra.required ? '|required' : ''}`).join('\n'));
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
    const rows = getRegistrations()
      .filter(reg => eventFilter === 'todos' || reg.eventId === eventFilter)
      .filter(reg => !query || [reg.name, reg.cpf, reg.email, reg.phone, reg.course].join(' ').toLowerCase().includes(query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhuma inscrição encontrada.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(reg => {
      const event = events.find(item => item.id === reg.eventId);
      const link = event ? `evento.html?id=${encodeURIComponent(event.id)}` : '#';
      return `
        <tr>
          <td><strong>${escapeHtml(reg.name)}</strong><br><span class="muted">${escapeHtml(reg.cpf || 'CPF não solicitado')}</span></td>
          <td><a href="${link}" target="_blank">${escapeHtml(event?.title || 'Evento removido')}</a></td>
          <td>${escapeHtml(reg.email || '—')}<br><span class="muted">${escapeHtml(reg.phone || '—')}</span></td>
          <td>${escapeHtml(labelParticipant(reg.participantType))}<br><span class="muted">${escapeHtml(reg.course || '—')}</span></td>
          <td>${formatDateTime(reg.createdAt)}</td>
          <td><button class="btn btn-danger small" type="button" data-remove-registration="${escapeAttr(reg.id)}">Excluir</button></td>
        </tr>`;
    }).join('');
  }

  function exportRegistrationsCsv() {
    const events = getEvents();
    const rows = getRegistrations().map(reg => {
      const event = events.find(item => item.id === reg.eventId);
      return {
        evento: event?.title || 'Evento removido',
        nome: reg.name || '',
        cpf: reg.cpf || '',
        email: reg.email || '',
        telefone: reg.phone || '',
        vinculo: labelParticipant(reg.participantType),
        curso: reg.course || '',
        observacoes: reg.notes || '',
        data_inscricao: formatDateTime(reg.createdAt)
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

  function toCsv(rows) {
    if (!rows.length) return 'evento,nome,cpf,email,telefone,vinculo,curso,observacoes,data_inscricao\n';
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

  function getEvents() {
    return safeJson(localStorage.getItem(KEYS.events), []);
  }

  function saveEvents(events) {
    localStorage.setItem(KEYS.events, JSON.stringify(events));
  }

  function getRegistrations() {
    return safeJson(localStorage.getItem(KEYS.registrations), []);
  }

  function saveRegistrations(registrations) {
    localStorage.setItem(KEYS.registrations, JSON.stringify(registrations));
  }

  function safeJson(text, fallback) {
    try { return JSON.parse(text) || fallback; } catch { return fallback; }
  }

  function countRegistrations(eventId) {
    return getRegistrations().filter(item => item.eventId === eventId).length;
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
