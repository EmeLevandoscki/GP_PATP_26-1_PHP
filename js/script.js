/* ================================
   IDEAU EVENTOS — script.js
   ================================ */

// ── CURSOR PERSONALIZADO ──
// const cursor = document.getElementById('cursor');
// const cursorRing = document.getElementById('cursor-ring');
// let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

// document.addEventListener('mousemove', e => {
//   mouseX = e.clientX;
//   mouseY = e.clientY;
//   cursor.style.transform = `translate(${mouseX - 5}px, ${mouseY - 5}px)`;
// });

// function animateRing() {
//   ringX += (mouseX - ringX - 16) * 0.18;
//   ringY += (mouseY - ringY - 16) * 0.18;
//   cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
//   requestAnimationFrame(animateRing);
// }
// animateRing();

// document.querySelectorAll('a, button, select, input, .card-btn, .filter-btn, .event-card').forEach(el => {
//   el.addEventListener('mouseenter', () => {
//     cursor.style.transform += ' scale(1.6)';
//     cursorRing.style.transform += ' scale(1.4)';
//   });
//   el.addEventListener('mouseleave', () => {});
// });
function getPastaBase() {
  if (PASTA_BASE === '/') {
    return '';
  }

  return PASTA_BASE;
}
// ── TEMA CLARO / ESCURO ──
function initTheme() {
  const saved = localStorage.getItem('ideau-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ideau-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

initTheme();

// ── ESTADO DE AUTENTICAÇÃO ──
// Lido do localStorage para persistência real
let currentUser = JSON.parse(localStorage.getItem('ideau-user')) || null;

function login(userData) {
  currentUser = userData;
  localStorage.setItem('ideau-user', JSON.stringify(userData));
  renderNav();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ideau-user');
  renderNav();
  showToast('Você saiu da sua conta.');
}

// ── RENDER NAV AUTH ──
function renderNav() {
  const auth = document.getElementById('navAuth');
  if (!auth) return;

  if (!currentUser) {
    auth.innerHTML = `
      <a href="src/View/Front/html/login.html?tab=login" class="btn-nav-login">Entrar</a>
      <a href="src/View/Front/html/login.html?tab=cadastro" class="btn-nav-register">Cadastrar</a>
    `;
    return;
  }

  const { name, initials, email, role, roleLabel, org } = currentUser;

  if (role === 'cliente') {
    auth.innerHTML = `
      <button class="nav-notif" title="Notificações" onclick="showToast('Nenhuma notificação no momento.')">
        🔔
      </button>
      <div class="nav-user" id="navUser">
        <div class="nav-avatar" onclick="toggleDropdown()">
          <div class="avatar-circle cliente">${initials}</div>
          <div class="avatar-info">
            <span class="avatar-name">${name}</span>
            <span class="avatar-role cliente">${roleLabel}</span>
          </div>
          <span class="avatar-chevron">▾</span>
        </div>
        <div class="user-dropdown">
          <div class="dropdown-header">
            <div class="dh-name">${name}</div>
            <div class="dh-email">${email}</div>
            <div class="dropdown-badge cliente">
              <span class="dropdown-badge-dot"></span> Cliente
            </div>
          </div>
          <div class="dropdown-menu">
            <a href="meus-ingressos.html" class="dropdown-item"><span class="di-icon">🎟️</span> Meus Ingressos</a>
            <a href="#" class="dropdown-item" onclick="showToast('Em breve: Eventos Salvos')"><span class="di-icon">❤️</span> Eventos Salvos</a>
            <a href="#" class="dropdown-item" onclick="showToast('Nenhuma notificação.')"><span class="di-icon">🔔</span> Notificações</a>
            <a href="perfil.html" class="dropdown-item"><span class="di-icon">⚙️</span> Configurações</a>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item danger" onclick="logout()"><span class="di-icon">🚪</span> Sair</a>
          </div>
        </div>
      </div>
    `;
  } else if (role === 'organizador') {
    auth.innerHTML = `
      <a href="criar-evento.html" class="nav-org-btn">+ Criar Evento</a>
      <button class="nav-notif" title="Notificações" onclick="showToast('Nenhuma notificação.')">
        🔔
      </button>
      <div class="nav-user" id="navUser">
        <div class="nav-avatar" onclick="toggleDropdown()">
          <div class="avatar-circle organizador">${initials}</div>
          <div class="avatar-info">
            <span class="avatar-name">${name}</span>
            <span class="avatar-role organizador">${roleLabel}</span>
          </div>
          <span class="avatar-chevron">▾</span>
        </div>
        <div class="user-dropdown">
          <div class="dropdown-header">
            <div class="dh-name">${name}</div>
            <div class="dh-email">${email}</div>
            <div class="dropdown-badge organizador">
              <span class="dropdown-badge-dot"></span> Organizador${org ? ' · ' + org : ''}
            </div>
          </div>
          <div class="dropdown-menu">
            <a href="criar-evento.html" class="dropdown-item"><span class="di-icon">➕</span> Criar Evento</a>
            <a href="meus-eventos.html" class="dropdown-item"><span class="di-icon">📋</span> Meus Eventos</a>
            <a href="relatorios.html" class="dropdown-item"><span class="di-icon">📊</span> Relatórios</a>
            <a href="#" class="dropdown-item" onclick="showToast('Em breve: Gestão de Ingressos')"><span class="di-icon">🎟️</span> Gestão de Ingressos</a>
            <div class="dropdown-divider"></div>
            <a href="perfil.html" class="dropdown-item"><span class="di-icon">⚙️</span> Configurações</a>
            <a href="#" class="dropdown-item danger" onclick="logout()"><span class="di-icon">🚪</span> Sair</a>
          </div>
        </div>
      </div>
    `;
  }
}

function toggleDropdown() {
  const navUser = document.getElementById('navUser');
  if (navUser) navUser.classList.toggle('open');
}

document.addEventListener('click', e => {
  const navUser = document.getElementById('navUser');
  if (navUser && !navUser.contains(e.target)) navUser.classList.remove('open');
});

renderNav();

// // ── DADOS DE EVENTOS ──
async function listarEventos() {
  let url = getPastaBase() + '/src/Controller/EventoController.php?action=eventos';

  const response = await fetch(url);
  const eventos  = await response.json();

  return eventos.map(e => ({
    id: e.id,
    titulo: e.titulo,
    categoria: e.categoria,
    dia: retornaDia(e.data_inicio),
    mes: retornaMes(e.data_inicio),
    local: e.nome_local,
    cidade: e.cidade, estado: e.estado,
    preco: '0',//e.preco, não será implementado com preço
    desc: e.descricao,
    img: e.foto_path,
    destaque: e.destaque
  }));
}
async function listarCategorias() {
  let url = getPastaBase() + '/src/Controller/EventoController.php?action=categorias';

  const response = await fetch(url);
  const categorias = await response.json();

  return categorias.map(cat => ({
    id : cat.id,
    nome : cat.nome,
    icone : cat.icone
  }));
}
function retornaDia(data) {
  if (!data) return '';
  return data.substring(8, 10)
}
function retornaMes(data) {
  if (!data) return '';
  
  strMes = data.substring(5, 7);
  intMes = parseInt(strMes, 10);

  switch (intMes) {
    case 1:
      nomeMes = 'Janeiro';
      break;
    case 2:
      nomeMes = 'Fevereiro';
      break;
    case 3:
      nomeMes = 'Março';
      break;
    case 4:
      nomeMes = 'Abril';
      break;
    case 5:
      nomeMes = 'Maio';
      break;
    case 6:
      nomeMes = 'Junho';
      break;
    case 7:
      nomeMes = 'Julho';
      break;
    case 8:
      nomeMes = 'Agosto';
      break;
    case 9:
      nomeMes = 'Setembro';
      break;
    case 10:
      nomeMes = 'Outubro';
      break;
    case 11:
      nomeMes = 'Novembro';
      break;
    case 12:
      nomeMes = 'Dezembro';
      break;
    default:
      nomeMes = '';
      break;
  }
  return nomeMes;
}

let filtroAtual = 'todos';
let buscaAtual = '';
let estadoAtual = '';
let cidadeAtual = '';

// Mapeamento estado → cidades
const cidadesPorEstado = {
  RS: ['Erechim', 'Getúlio Vargas', 'Passo Fundo', 'Barão de Cotegipe', 'Aratiba', 'Campinas do Sul', 'Itatiba do Sul']
};

function onStateChange() {
  const estado = document.getElementById('stateFilter').value;
  const cidadeSelect = document.getElementById('cityFilter');
  estadoAtual = estado;
  cidadeAtual = '';
  cidadeSelect.innerHTML = '<option value="">Cidade</option>';
  if (estado && cidadesPorEstado[estado]) {
    cidadesPorEstado[estado].forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      cidadeSelect.appendChild(opt);
    });
    cidadeSelect.disabled = false;
  } else {
    cidadeSelect.disabled = true;
  }
  filterEvents();
}

function setFilter(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroAtual = cat;
  filterEvents();
}

async function filterEvents() {
  buscaAtual = document.getElementById('searchInput').value.toLowerCase();
  estadoAtual = document.getElementById('stateFilter').value;
  cidadeAtual = document.getElementById('cityFilter').value;

  const eventosData = await listarEventos();

  const resultados = eventosData.filter(ev => {
    const matchCat   = filtroAtual === 'todos' || ev.categoria === filtroAtual;
    const matchBusca = !buscaAtual || ev.titulo.toLowerCase().includes(buscaAtual) ||
                       ev.local.toLowerCase().includes(buscaAtual) ||
                       ev.categoria.toLowerCase().includes(buscaAtual);
    const matchEstado = !estadoAtual || ev.estado === estadoAtual;
    const matchCidade = !cidadeAtual || ev.cidade === cidadeAtual;
    return matchCat && matchBusca && matchEstado && matchCidade;
  });

  renderEvents(resultados);
}

function renderEvents(lista) {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <h3>Nenhum evento encontrado</h3>
        <p>Tente outros filtros ou termos de busca.</p>
      </div>`;
    return;
  }

  grid.innerHTML = lista.map(ev => `
    <div class="event-card fade-up">
      <div class="card-img">
        <img src="${ev.img}" alt="${ev.titulo}" loading="lazy" onerror="this.onerror=null; this.src='${getPastaBase()}/uploads/foto_generica_1.png'" />
        <span class="card-tag">${ev.categoria}</span>
        <div class="card-date-badge">
          <span class="day">${ev.dia}</span>
          <span class="month">${ev.mes}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>📍 ${ev.cidade}</span>
          <span>${ev.local === null ? '' : '🏛️ ' + ev.local}</span>
        </div>
        <h3 class="card-title">${ev.titulo}</h3>
        <p class="card-desc">${ev.desc}</p>
        <div class="card-footer">
          <div class="card-price">
            ${ev.preco == 0 ? '' : ev.preco}
            ${ev.preco > 0 ? '<small>/ ingresso</small>' : ''}
          </div>
          <button class="card-btn" onclick="openModal('${ev.titulo.replace(/'/g, "\\'")}', '${ev.precoNum}')">
            Inscrever-se
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Ativa animações fade-up
  requestAnimationFrame(() => {
    document.querySelectorAll('.event-card.fade-up').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 60);
    });
  });
}

// Inicializar eventos
filterEvents();

//Pega as categorias do banco e coloca no filtro (aquele perto de próximos eventos)
async function renderCategoriasFiltro() {
  const categorias = await listarCategorias();
  const container = document.getElementById('filterBar');

  container.innerHTML = `<button class="filter-btn active" onclick="setFilter(this, 'todos')">Todos</button>`;

  categorias.forEach(cat => {
    container.innerHTML += ` 
      <button class="filter-btn" onclick='setFilter(this, ${JSON.stringify(cat.nome)})'>${cat.icone || '📌'} ${cat.nome}</button>
      `;  
  })
}

renderCategoriasFiltro();

//Pega as categorias do banco e coloca no "Navegue por Categorias" 
async function renderCategoriasNavegue() {
  const container = document.getElementById('categoriesGrid');
  const categorias = await listarCategorias();

  container.innerHTML = '';

  categorias.forEach((cat, i) => {
    container.innerHTML += `
        <div class="cat-card fade-up" 
            style="transition-delay:${i * 0.1}s; cursor:pointer"
            onclick="setFilterByName('${cat.nome}')">

          <div class="cat-icon">${cat.icone || '📌'}</div>
          <div class="cat-name">${cat.nome}</div>
          ${cat.descricao ? `<div class="cat-count">${cat.descricao}</div>` : ''}

          <div class="cat-arrow">↗</div>
        </div>
      `;
  }); 
  document.querySelectorAll('.cat-card.fade-up').forEach(el => observer.observe(el));
}
renderCategoriasNavegue();

async function atualizaStatsInicio() {
  let url = getPastaBase() + '/src/Controller/EventoController.php?action=qtdAtivos';
  
  const response = await fetch(url);
  const ativos   = await response.json();
  
  document.getElementById('totalEventos').textContent = ativos + '+';
  document.getElementById('totalParticipantes').textContent = 0 + '+';
}
atualizaStatsInicio();
// ── MODAL ──
function openModal(nomeEvento, preco) {
  if (!currentUser) {
    showToast('Faça login para reservar ingressos!');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }
  document.getElementById('modalEventName').textContent = nomeEvento;
  document.getElementById('modalName').value = currentUser.name || '';
  document.getElementById('modalEmail').value = currentUser.email || '';
  const modalCpfEl = document.getElementById('modalCPF');
  if (modalCpfEl) modalCpfEl.value = currentUser.cpf || '';

  // Atualiza opções de ingresso com preço real
  const precoNum = parseInt(preco) || 0;
  const sel = document.getElementById('modalTicket');
  if (sel) {
    if (precoNum === 0) {
      sel.innerHTML = '<option>Entrada Gratuita</option>';
    } else {
      sel.innerHTML = `
        <option>Pista — R$ ${precoNum}</option>
        <option>Área VIP — R$ ${precoNum * 2}</option>
        <option>Camarote — R$ ${precoNum * 4}</option>
      `;
    }
  }

  document.getElementById('modalForm').style.display = 'block';
  document.getElementById('modalSuccess').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function submitReserva() {
  const nome  = document.getElementById('modalName').value.trim();
  const email = document.getElementById('modalEmail').value.trim();
  if (!nome || !email) {
    showToast('Preencha todos os campos!');
    return;
  }
  const evento  = document.getElementById('modalEventName').textContent;
  const ticket  = document.getElementById('modalTicket').value;
  const qty     = document.getElementById('modalQty').value;

  // Salva reserva no localStorage
  const reservas = JSON.parse(localStorage.getItem('ideau-reservas') || '[]');
  reservas.push({
    id: Date.now(),
    evento, ticket, qty, nome, email,
    data: new Date().toLocaleDateString('pt-BR')
  });
  localStorage.setItem('ideau-reservas', JSON.stringify(reservas));

  document.getElementById('modalForm').style.display = 'none';
  document.getElementById('modalSuccess').style.display = 'block';
  setTimeout(closeModal, 3000);
}

// ── NEWSLETTER ──
function subscribeNewsletter() {
  const email = document.getElementById('newsletterEmail').value.trim();
  if (!email || !email.includes('@')) {
    showToast('Insira um e-mail válido!');
    return;
  }
  const subs = JSON.parse(localStorage.getItem('ideau-newsletter') || '[]');
  if (subs.includes(email)) {
    showToast('Este e-mail já está cadastrado!');
    return;
  }
  subs.push(email);
  localStorage.setItem('ideau-newsletter', JSON.stringify(subs));
  document.getElementById('newsletterEmail').value = '';
  showToast('✅ Cadastrado! Você receberá nossas novidades.');
}

// ── TOAST ──
let toastTimeout;
function showToast(msg) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  clearTimeout(toastTimeout);
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── FADE UP (INTERSECTION OBSERVER) ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ── MARQUEE clone ──
const track = document.getElementById('marqueeTrack');
if (track) {
  track.innerHTML += track.innerHTML;
}
