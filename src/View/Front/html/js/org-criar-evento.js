  // Custom cursor — desktop only
  if (window.innerWidth > 768) {
    var cur = document.getElementById('cursor');
    var ring = document.getElementById('cursor-ring');
    var curVisible = false;
    document.addEventListener('mousemove', function(e) {
      if (!curVisible) { cur.style.opacity = '1'; ring.style.opacity = '0.7'; curVisible = true; }
      cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    }, {passive: true});
    document.addEventListener('mouseleave', function() { cur.style.opacity = '0'; ring.style.opacity = '0'; curVisible = false; });
    document.addEventListener('mouseenter', function() { if (curVisible) { cur.style.opacity = '1'; ring.style.opacity = '0.7'; } });
  }

  // Theme
  function toggleTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('.theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';
  }

  // Hamburger menu
  function toggleMenu() {
    document.getElementById('hamburger').classList.toggle('open');
    document.getElementById('mobMenu').classList.toggle('open');
  }
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#hamburger') && !e.target.closest('#mobMenu')) {
      var h = document.getElementById('hamburger'); var m = document.getElementById('mobMenu');
      if (h) h.classList.remove('open'); if (m) m.classList.remove('open');
    }
  });

  // Steps — 5 total
  var curStep = 1, ticketCount = 1, isFree = false;
  var TOTAL = 5;

  function showStep(n) {
    document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('fs' + n).classList.add('active');
    for (var i = 1; i <= TOTAL; i++) {
      var si = document.getElementById('si' + i); si.classList.remove('active','done');
      if (i < n) si.classList.add('done'); else if (i === n) si.classList.add('active');
      document.getElementById('sn' + i).textContent = i < n ? '✓' : i;
    }
    curStep = n; window.scrollTo({top: 0, behavior: 'smooth'});
  }
  function goStep(n) { if (n < curStep) showStep(n); }
  function nextStep(n) { if (n === TOTAL - 1) buildReview(); showStep(n + 1); }
  function prevStep(n) { showStep(n - 1); }

  // Char count
  function updateCharCount(id, ccId, max) {
    document.getElementById(ccId).textContent = document.getElementById(id).value.length + '/' + max;
  }

  // Image preview
  function previewImg(input) {
    if (!input.files || !input.files[0]) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      document.querySelectorAll('#uploadArea .upload-icon, #uploadArea .upload-text, #uploadArea .upload-sub').forEach(function(el) {
        el.style.display = 'none';
      });
      var prev = document.getElementById('imgPreview'); prev.src = e.target.result; prev.style.display = 'block';
      document.getElementById('uploadArea').classList.add('has-image');
      var ri = document.getElementById('revImgActual'); ri.src = e.target.result;
      document.getElementById('revImgWrap').style.display = 'none'; ri.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }

  // Modality
  function setMod(m) {
    document.getElementById('onlineField').style.display = m === 'online' ? 'block' : 'none';
    document.getElementById('venueField').style.display = m === 'online' ? 'none' : 'block';
  }

  // Free toggle
  function toggleFree(checked) {
    isFree = checked;
    document.querySelectorAll('.price-group').forEach(function(g) {
      g.style.opacity = checked ? '.4' : '1'; g.style.pointerEvents = checked ? 'none' : 'auto';
    });
    document.querySelectorAll('[id^="price-"]').forEach(function(p) { if (checked) p.value = 0; });
  }

  // Tickets — use data-id to avoid inline onclick quote hell
  function addTicket() {
    var wrap = document.getElementById('ticketWrap');
    var id = ticketCount++;
    var div = document.createElement('div');
    div.className = 'ticket-item';
    div.id = 'ticket-' + id;
    div.innerHTML =
      '<div class="fg"><label class="fl">Tipo de ingresso</label><input class="fi" type="text" placeholder="Ex: VIP, Estudante..."/></div>' +
      '<div class="fg price-group"><label class="fl">Preco (R$)</label><input class="fi" type="number" id="price-' + id + '" value="' + (isFree ? 0 : '') + '" min="0" step="0.01"/></div>' +
      '<div class="fg"><label class="fl">Qtd. disponivel</label><input class="fi" type="number" value="100" min="1"/></div>' +
      '<button class="remove-ticket" data-target="ticket-' + id + '">x</button>';
    wrap.appendChild(div);
  }

  // Delegate click for remove ticket buttons
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.remove-ticket');
    if (btn) {
      var target = btn.getAttribute('data-target');
      var el = document.getElementById(target);
      if (el) el.remove();
    }
  });

  // Audience / Turmas
  var audienceNames = {
    maternal:'Maternal', jardim:'Jardim / Pre', fundamental1:'Fund. I',
    fundamental2:'Fund. II', medio:'Ensino Medio', tecnico:'Tecnico',
    graduacao:'Graduacao', posgraduacao:'Pos-Graduacao',
    professores:'Professores', colaboradores:'Colaboradores',
    comunidade:'Comunidade', egressos:'Egressos'
  };
  var cursosList = ['Administracao','Agronomia','Arquitetura','Biomedicina','Ciencias Contabeis',
    'Ciencias da Computacao','Direito','Educacao Fisica','Enfermagem','Engenharia Civil',
    'Engenharia de Software','Farmacia','Fisioterapia','Jornalismo','Letras',
    'Medicina Veterinaria','Nutricao','Pedagogia','Psicologia','Publicidade','Recursos Humanos',
    'Servico Social','Sistemas de Informacao'];
  var semestres = ['1 Semestre','2 Semestre','3 Semestre','4 Semestre','5 Semestre',
    '6 Semestre','7 Semestre','8 Semestre','9 Semestre','10 Semestre'];

  function updateAudienceTags() {
    var checked = Array.from(document.querySelectorAll('input[name="aud"]:checked')).map(function(i) { return i.value; });
    var summary = document.getElementById('audSummary');
    var tags = document.getElementById('audTags');
    var cursosSection = document.getElementById('cursosSection');
    var semSection = document.getElementById('semestresSection');
    var needsGrad = checked.indexOf('graduacao') >= 0 || checked.indexOf('posgraduacao') >= 0 || checked.indexOf('tecnico') >= 0;
    var needsSem = checked.indexOf('graduacao') >= 0 || checked.indexOf('posgraduacao') >= 0;

    if (checked.length > 0) {
      summary.style.display = 'block';
      tags.innerHTML = checked.map(function(v) {
        return '<span style="padding:4px 10px;background:rgba(245,200,0,.1);border:1px solid rgba(245,200,0,.3);font-size:.74rem;color:var(--gold)">' + (audienceNames[v] || v) + '</span>';
      }).join('');
    } else { summary.style.display = 'none'; }

    if (needsGrad) {
      cursosSection.style.display = 'block';
      if (!document.getElementById('corsoGrid').childElementCount) buildCursos();
    } else { cursosSection.style.display = 'none'; }

    if (needsSem) {
      semSection.style.display = 'block';
      if (!document.getElementById('semGrid').childElementCount) buildSemestres();
    } else { semSection.style.display = 'none'; }
  }

  function filterAudienceByInstitution() {
    var institution = document.getElementById('evtInstitution').value;
    var schoolOnly = ['maternal', 'jardim', 'fundamental1', 'fundamental2', 'medio'];
    var collegeOnly = ['tecnico', 'graduacao', 'posgraduacao', 'colaboradores', 'egressos'];
    var hiddenValues = institution === 'Faculdade IDEAU' ? schoolOnly
      : institution === 'Escola IDEAU Santa Clara' ? collegeOnly
      : [];

    document.querySelectorAll('input[name="aud"]').forEach(function(input) {
      var option = input.closest('.audience-opt');
      var shouldHide = hiddenValues.indexOf(input.value) >= 0;
      option.hidden = shouldHide;
      if (shouldHide) input.checked = false;
    });

    var hint = document.getElementById('institutionHint');
    if (institution === 'Faculdade IDEAU') {
      hint.textContent = 'As opções exclusivas da escola foram removidas do público-alvo.';
    } else if (institution === 'Escola IDEAU Santa Clara') {
      hint.textContent = 'As opções exclusivas da faculdade foram removidas do público-alvo.';
    } else {
      hint.textContent = 'Define quem organiza e responde pelo evento.';
    }

    updateAudienceTags();
  }

  // Build cursos using data attributes instead of inline onclick
  function buildCursos() {
    var grid = document.getElementById('corsoGrid');
    grid.innerHTML = '';
    cursosList.forEach(function(c) {
      var span = document.createElement('span');
      span.className = 'corso-tag';
      span.textContent = c;
      span.setAttribute('data-value', c);
      grid.appendChild(span);
    });
  }

  function buildSemestres() {
    var grid = document.getElementById('semGrid');
    grid.innerHTML = '';
    semestres.forEach(function(s) {
      var span = document.createElement('span');
      span.className = 'corso-tag';
      span.textContent = s;
      span.setAttribute('data-value', s);
      grid.appendChild(span);
    });
  }

  // Delegate click for corso-tags
  document.addEventListener('click', function(e) {
    var tag = e.target.closest('.corso-tag');
    if (tag) tag.classList.toggle('selected');
  });

  // Build review
  function buildReview() {
    var name = document.getElementById('evtName').value || '—';
    var catEl = document.getElementById('evtCat');
    var cat = catEl.options[catEl.selectedIndex].text || '—';
    var venue = (document.getElementById('evtVenue') || {}).value || '—';
    var city = (document.getElementById('evtCity') || {}).value || '';
    var date = (document.getElementById('evtDate') || {}).value || '—';
    var time = (document.getElementById('evtTime') || {}).value || '—';
    var cap = (document.getElementById('evtCap') || {}).value;
    var price0El = document.getElementById('price-0');
    var price0 = price0El ? price0El.value : '0';
    var turmas = document.getElementById('evtTurmas').value;
    var aud = Array.from(document.querySelectorAll('input[name="aud"]:checked')).map(function(i) { return audienceNames[i.value] || i.value; });
    var cursos = Array.from(document.querySelectorAll('#corsoGrid .corso-tag.selected')).map(function(el) { return el.textContent; });

    document.getElementById('revTitle').textContent = name;
    document.getElementById('revTag').textContent = cat;
    document.getElementById('revMeta').textContent = '📅 ' + date + ' ' + time + ' · 📍 ' + venue + (city ? ', ' + city : '');
    document.getElementById('rv-cat').textContent = cat;
    document.getElementById('rv-venue').textContent = venue + (city ? ', ' + city : '');
    document.getElementById('rv-date').textContent = date + ' às ' + time;
    document.getElementById('rv-cap').textContent = cap ? cap + ' pessoas' : 'Não definida';
    document.getElementById('rv-price').textContent = isFree ? 'Gratuito' : 'R$ ' + parseFloat(price0 || 0).toFixed(2);
    document.getElementById('rv-mod').textContent = document.querySelector('input[name="mod"]:checked').value;
    document.getElementById('rv-audience').textContent = aud.length ? aud.join(', ') + (cursos.length ? ' · Cursos: ' + cursos.join(', ') : '') : 'Todos (evento aberto)';
    document.getElementById('rv-turmas').textContent = turmas || 'Todas';
  }

  function publishEvent() {
    var requiredFields = [
      ['evtName', 'Informe o nome do evento.'],
      ['evtCat', 'Selecione a categoria.'],
      ['evtInstitution', 'Selecione a instituição responsável.'],
      ['evtDate', 'Informe a data de início.'],
      ['evtTime', 'Informe o horário de início.']
    ];
    for (var i = 0; i < requiredFields.length; i++) {
      var field = document.getElementById(requiredFields[i][0]);
      if (!field.value.trim()) {
        alert(requiredFields[i][1]);
        field.focus();
        return;
      }
    }
    if (!document.getElementById('evtDesc').value.trim()) {
      alert('Informe a descrição do evento.');
      document.getElementById('evtDesc').focus();
      return;
    }
    if (!document.getElementById('confirmTerms').checked) { alert('Aceite os termos para continuar.'); return; }

    var catEl = document.getElementById('evtCat');
    var selectedAudience = Array.from(document.querySelectorAll('input[name="aud"]:checked')).map(function(input) {
      return input.value;
    });
    var eventData = {
      id: Date.now(),
      t: document.getElementById('evtName').value.trim(),
      cat: catEl.options[catEl.selectedIndex].text.replace(/^\S+\s*/, '').trim(),
      dt: formatDateForList(document.getElementById('evtDate').value),
      date: document.getElementById('evtDate').value,
      time: document.getElementById('evtTime').value,
      endDate: document.getElementById('evtEndDate').value,
      endTime: document.getElementById('evtEndTime').value,
      lo: document.getElementById('evtVenue').value.trim() || document.getElementById('evtCity').value,
      city: document.getElementById('evtCity').value,
      address: document.getElementById('evtAddress').value.trim(),
      institution: document.getElementById('evtInstitution').value,
      audience: selectedAudience,
      description: document.getElementById('evtDesc').value.trim(),
      cap: Number(document.getElementById('evtCap').value) || 0,
      ins: 0,
      st: 'rascunho',
      img: document.getElementById('imgPreview').src || ''
    };

    try {
      var savedEvents = JSON.parse(localStorage.getItem('ideau-organizer-events') || '[]');
      savedEvents.push(eventData);
      localStorage.setItem('ideau-organizer-events', JSON.stringify(savedEvents));
    } catch (error) {
      alert('Não foi possível salvar. Se a imagem for muito grande, escolha uma imagem menor e tente novamente.');
      return;
    }

    document.querySelector('#fs5 .step-actions').style.display = 'none';
    document.getElementById('pubSuccess').style.display = 'flex';
    setTimeout(function() { window.location.href = 'org-gerenciar.html'; }, 1200);
  }

  function formatDateForList(value) {
    if (!value) return '—';
    var parts = value.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  // Eventos da interface. O HTML permanece apenas com estrutura e conteúdo.
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('hamburger').addEventListener('click', toggleMenu);

  document.querySelectorAll('[data-step]').forEach(function(step) {
    step.addEventListener('click', function() { goStep(Number(step.dataset.step)); });
  });
  document.querySelectorAll('[data-next-step]').forEach(function(button) {
    button.addEventListener('click', function() { nextStep(Number(button.dataset.nextStep)); });
  });
  document.querySelectorAll('[data-prev-step]').forEach(function(button) {
    button.addEventListener('click', function() { prevStep(Number(button.dataset.prevStep)); });
  });

  document.getElementById('evtName').addEventListener('input', function() {
    updateCharCount('evtName', 'cc1', 80);
  });
  document.getElementById('evtDesc').addEventListener('input', function() {
    updateCharCount('evtDesc', 'cc2', 600);
  });

  document.getElementById('uploadArea').addEventListener('click', function(event) {
    if (event.target.id === 'imgInput') return;
    document.getElementById('imgInput').click();
  });
  document.getElementById('imgInput').addEventListener('change', function() {
    previewImg(this);
  });

  document.querySelectorAll('input[name="mod"]').forEach(function(input) {
    input.addEventListener('change', function() {
      setMod(input.value === 'presencial' ? 'pres' : input.value);
    });
  });
  document.querySelectorAll('input[name="aud"]').forEach(function(input) {
    input.addEventListener('change', updateAudienceTags);
  });
  document.getElementById('evtInstitution').addEventListener('change', filterAudienceByInstitution);

  document.getElementById('freeToggle').addEventListener('change', function() {
    toggleFree(this.checked);
  });
  document.getElementById('addTicketButton').addEventListener('click', addTicket);
  document.getElementById('publishEventButton').addEventListener('click', publishEvent);
