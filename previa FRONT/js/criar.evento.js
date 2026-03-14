// ================================
//   EVENTURA — criar-evento.js
// ================================

// --------------------------------
// CURSOR
// --------------------------------

const cursor     = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function animateCursor() {
  cursor.style.left = mx - 5 + 'px';
  cursor.style.top  = my - 5 + 'px';
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cursorRing.style.left = rx - 16 + 'px';
  cursorRing.style.top  = ry - 16 + 'px';
  requestAnimationFrame(animateCursor);
})();

document.querySelectorAll('button, a, input, select, textarea, label, .upload-area').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.style.transform = 'scale(2.2)'; cursorRing.style.opacity = '0.4'; });
  el.addEventListener('mouseleave', () => { cursor.style.transform = 'scale(1)';   cursorRing.style.opacity = '1'; });
});

// --------------------------------
// ACCESS CONTROL
// Simula verificação de perfil do usuário.
// Em produção, validar via token JWT no back-end.
// Papéis possíveis: 'admin' | 'organizador' | 'usuario'
// --------------------------------

const currentUser = {
  name: 'Mariana Costa',
  role: 'organizador', // trocar para 'usuario' para testar acesso negado
};

function initAccessControl() {
  const allowed = ['admin', 'organizador'];

  if (!allowed.includes(currentUser.role)) {
    document.getElementById('mainContent').style.display  = 'none';
    document.getElementById('accessDenied').style.display = 'flex';
    document.getElementById('previewPanel').style.display = 'none';
  } else {
    document.getElementById('userName').textContent = currentUser.name;
  }
}

function requestAccess() {
  alert('Solicitação enviada! Nossa equipe entrará em contato em até 48h.');
}

// --------------------------------
// STEP NAVIGATION
// --------------------------------

let currentStep = 1;
const TOTAL_STEPS = 4;

function goToStep(n) {
  if (n > currentStep) return; // só pode avançar via validação
  showStep(n);
}

function showStep(n) {
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    document.getElementById('step' + i).classList.add('hidden');
    const ind = document.getElementById('step' + i + 'Ind');
    ind.classList.remove('active', 'done');
    if (i < n) ind.classList.add('done');
  }

  document.getElementById('step' + n).classList.remove('hidden');
  document.getElementById('step' + n + 'Ind').classList.add('active');
  currentStep = n;

  // Update step numbers to checkmarks for done steps
  for (let i = 1; i < n; i++) {
    document.querySelector('#step' + i + 'Ind .step-num').textContent = '✓';
  }
  document.querySelector('#step' + n + 'Ind .step-num').textContent = n;
  for (let i = n + 1; i <= TOTAL_STEPS; i++) {
    document.querySelector('#step' + i + 'Ind .step-num').textContent = i;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep(from) {
  if (!validateStep(from)) return;
  if (from === 3) buildReview();
  showStep(from + 1);
}

function prevStep(from) {
  showStep(from - 1);
}

// --------------------------------
// VALIDATION PER STEP
// --------------------------------

function validateStep(step) {
  if (step === 1) return validateStep1();
  if (step === 2) return validateStep2();
  if (step === 3) return validateStep3();
  return true;
}

function clearErr(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function validateStep1() {
  let ok = true;
  clearErr('evtNameErr'); clearErr('evtCategoryErr'); clearErr('evtDescErr'); clearErr('evtImageErr');

  if (!document.getElementById('evtName').value.trim()) {
    setErr('evtNameErr', 'Informe o nome do evento.'); ok = false;
  }
  if (!document.getElementById('evtCategory').value) {
    setErr('evtCategoryErr', 'Selecione uma categoria.'); ok = false;
  }
  if (document.getElementById('evtDesc').value.trim().length < 20) {
    setErr('evtDescErr', 'A descrição precisa ter pelo menos 20 caracteres.'); ok = false;
  }
  if (!document.getElementById('evtImage').files.length) {
    setErr('evtImageErr', 'Adicione uma imagem de capa.'); ok = false;
  }
  return ok;
}

function validateStep2() {
  let ok = true;
  clearErr('evtVenueErr'); clearErr('evtCityErr'); clearErr('evtStartDateErr');

  const modality = document.querySelector('input[name="modality"]:checked').value;

  if (modality !== 'online') {
    if (!document.getElementById('evtVenue').value.trim()) {
      setErr('evtVenueErr', 'Informe o local do evento.'); ok = false;
    }
    if (!document.getElementById('evtCity').value) {
      setErr('evtCityErr', 'Selecione a cidade.'); ok = false;
    }
  }

  if (!document.getElementById('evtStartDate').value) {
    setErr('evtStartDateErr', 'Informe a data de início.'); ok = false;
  } else {
    const chosen = new Date(document.getElementById('evtStartDate').value);
    const today  = new Date(); today.setHours(0,0,0,0);
    if (chosen < today) {
      setErr('evtStartDateErr', 'A data não pode ser no passado.'); ok = false;
    }
  }
  return ok;
}

function validateStep3() {
  const tickets = document.querySelectorAll('.ticket-card');
  const isFree  = document.getElementById('evtFree').checked;
  if (!isFree && tickets.length === 0) {
    alert('Adicione pelo menos um tipo de ingresso, ou marque "Evento gratuito".');
    return false;
  }
  return true;
}

// --------------------------------
// IMAGE PREVIEW
// --------------------------------

function previewImage(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    setErr('evtImageErr', 'Imagem muito grande. Máximo: 5MB.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('imagePreview');
    img.src = e.target.result;
    img.style.display = 'block';
    document.getElementById('uploadInner').style.display = 'none';

    // Update preview panel
    const previewImgEl = document.getElementById('previewImg');
    previewImgEl.style.backgroundImage = `url(${e.target.result})`;
    previewImgEl.style.backgroundSize  = 'cover';
    previewImgEl.style.backgroundPosition = 'center';
  };
  reader.readAsDataURL(file);
}

// --------------------------------
// CHAR COUNTER
// --------------------------------

function charCount(el, counterId, max) {
  document.getElementById(counterId).textContent = `${el.value.length}/${max}`;
}

// --------------------------------
// CEP MASK
// --------------------------------

function maskCep(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  el.value = v;
}

// --------------------------------
// ONLINE TOGGLE
// --------------------------------

function toggleOnline(isOnline) {
  document.getElementById('onlineFields').style.display    = isOnline ? 'block' : 'none';
  document.getElementById('presencialFields').style.display = isOnline ? 'none' : 'block';
}

// --------------------------------
// TAGS
// --------------------------------

document.getElementById('evtTags').addEventListener('input', function () {
  const preview = document.getElementById('tagsPreview');
  const tags = this.value.split(',').map(t => t.trim()).filter(Boolean);
  preview.innerHTML = tags.map(t => `<span class="tag-chip">${t}</span>`).join('');
});

// --------------------------------
// TICKETS
// --------------------------------

let ticketCount = 0;

function addTicket() {
  ticketCount++;
  const id = ticketCount;
  const html = `
    <div class="ticket-card" id="ticket${id}">
      <div class="ticket-card-header">
        <div class="ticket-card-title">Ingresso #${id}</div>
        <button class="ticket-remove" onclick="removeTicket(${id})">✕</button>
      </div>
      <div class="ticket-fields">
        <div class="field">
          <label>Nome do tipo</label>
          <div class="input-wrap">
            <input type="text" placeholder="Ex: Pista, VIP, Camarote" id="ticketName${id}"/>
          </div>
        </div>
        <div class="field">
          <label>Preço (R$)</label>
          <div class="input-wrap">
            <input type="number" placeholder="0,00" min="0" step="0.01" id="ticketPrice${id}" oninput="updatePreviewPrice()"/>
          </div>
        </div>
        <div class="field">
          <label>Qtd disponível</label>
          <div class="input-wrap">
            <input type="number" placeholder="100" min="1" id="ticketQty${id}"/>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('ticketTypes').insertAdjacentHTML('beforeend', html);
}

function removeTicket(id) {
  document.getElementById('ticket' + id).remove();
}

function updatePreviewPrice() {
  const prices = [];
  document.querySelectorAll('[id^="ticketPrice"]').forEach(el => {
    if (el.value) prices.push(parseFloat(el.value));
  });
  if (prices.length) {
    const min = Math.min(...prices);
    document.getElementById('previewPrice').textContent = `R$ ${min.toFixed(2).replace('.', ',')}`;
  } else {
    document.getElementById('previewPrice').textContent = 'R$ --';
  }
}

// --------------------------------
// LIVE PREVIEW
// --------------------------------

const categoryLabels = {
  musica: '🎵 Música', tech: '💻 Tech', arte: '🎨 Arte',
  gastronomia: '🍽️ Gastronomia', esporte: '⚽ Esporte',
  negocios: '💼 Negócios', educacao: '📚 Educação', outro: '✨ Outro',
};

const monthNames = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function updatePreview() {
  // Title
  const name = document.getElementById('evtName').value.trim();
  document.getElementById('previewTitle').textContent = name || 'Nome do evento';

  // Category
  const cat = document.getElementById('evtCategory').value;
  document.getElementById('previewTag').textContent = cat ? categoryLabels[cat] : 'Categoria';

  // Date
  const dateVal = document.getElementById('evtStartDate') ? document.getElementById('evtStartDate').value : '';
  if (dateVal) {
    const d = new Date(dateVal + 'T00:00:00');
    document.querySelector('.pd-day').textContent   = String(d.getDate()).padStart(2, '0');
    document.querySelector('.pd-month').textContent = monthNames[d.getMonth()];
  } else {
    document.querySelector('.pd-day').textContent   = '--';
    document.querySelector('.pd-month').textContent = '---';
  }

  // Meta
  const time = document.getElementById('evtStartTime') ? document.getElementById('evtStartTime').value : '';
  const city = document.getElementById('evtCity') ? document.getElementById('evtCity').value : '';
  const venue = document.getElementById('evtVenue') ? document.getElementById('evtVenue').value.trim() : '';
  let metaStr = '';
  if (time) metaStr += `🕐 ${time}`;
  if (city || venue) metaStr += (metaStr ? '  ' : '') + `📍 ${venue || city}`;
  document.getElementById('previewMeta').textContent = metaStr || '🕐 --:--   📍 ---';
}

// Also listen to date/time/city fields for preview
['evtStartDate', 'evtStartTime', 'evtCity', 'evtVenue'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updatePreview);
  if (el) el.addEventListener('change', updatePreview);
});

// --------------------------------
// BUILD REVIEW
// --------------------------------

function buildReview() {
  const name      = document.getElementById('evtName').value.trim();
  const category  = categoryLabels[document.getElementById('evtCategory').value] || '—';
  const desc      = document.getElementById('evtDesc').value.trim();
  const age       = document.getElementById('evtAge').value;
  const modality  = document.querySelector('input[name="modality"]:checked').value;
  const venue     = document.getElementById('evtVenue').value.trim() || '—';
  const city      = document.getElementById('evtCity').value || '—';
  const startDate = document.getElementById('evtStartDate').value || '—';
  const startTime = document.getElementById('evtStartTime').value || '—';
  const isFree    = document.getElementById('evtFree').checked;

  const tickets = [];
  document.querySelectorAll('.ticket-card').forEach(card => {
    const idMatch = card.id.match(/\d+/);
    if (!idMatch) return;
    const i = idMatch[0];
    const n = document.getElementById('ticketName' + i)?.value || '—';
    const p = document.getElementById('ticketPrice' + i)?.value || '—';
    const q = document.getElementById('ticketQty' + i)?.value || '—';
    tickets.push(`${n} — R$ ${p} (${q} unid.)`);
  });

  const rows = [
    ['Nome do evento',  name],
    ['Categoria',       category],
    ['Classificação',   age === 'livre' ? 'Livre' : `${age} anos+`],
    ['Modalidade',      modality.charAt(0).toUpperCase() + modality.slice(1)],
    ['Local / Venue',   venue],
    ['Cidade',          city],
    ['Data de início',  startDate + ' às ' + startTime],
    ['Ingressos',       isFree ? '🆓 Evento gratuito' : (tickets.length ? tickets.join(' | ') : '—')],
    ['Descrição',       desc.length > 80 ? desc.slice(0, 80) + '…' : desc],
  ];

  document.getElementById('reviewCard').innerHTML = rows.map(([l, v]) => `
    <div class="review-row">
      <span class="rl">${l}</span>
      <span class="rv">${v}</span>
    </div>`).join('');
}

// --------------------------------
// PUBLISH
// --------------------------------

function publishEvent() {
  if (!document.getElementById('confirmTerms').checked) {
    alert('Confirme os termos para enviar o evento.');
    return;
  }

  const btn = document.querySelector('.btn-publish');
  btn.disabled = true;
  document.getElementById('publishBtnText').textContent = '⏳ Enviando...';

  setTimeout(() => {
    btn.style.display = 'none';
    document.getElementById('publishSuccess').style.display = 'flex';

    // Marca todos os steps como concluídos
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const ind = document.getElementById('step' + i + 'Ind');
      ind.classList.remove('active');
      ind.classList.add('done');
      document.querySelector('#step' + i + 'Ind .step-num').textContent = '✓';
    }

    setTimeout(() => { window.location.href = 'index.html'; }, 3500);
  }, 1800);
}

// --------------------------------
// INIT
// --------------------------------

initAccessControl();
addTicket(); // começa com 1 tipo de ingresso
updatePreview();
