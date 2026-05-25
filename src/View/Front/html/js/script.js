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
      <a href="login.html" class="btn-nav-login">Entrar</a>
      <a href="login.html" class="btn-nav-register">Cadastrar</a>
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

// ── DADOS DE EVENTOS ──
const eventosData = [
  {
    id: 1,
    titulo: 'Semana Acadêmica de Direito',
    categoria: 'tech',
    tag: 'Acadêmico',
    dia: '14', mes: 'ABR',
    local: 'Campus Getúlio Vargas',
    cidade: 'Getúlio Vargas', estado: 'RS',
    preco: 'Gratuito',
    precoNum: 0,
    desc: 'Palestras, painéis e workshops com profissionais e professores do curso de Direito.',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
    destaque: true
  },
  {
    id: 2,
    titulo: 'Festival de Música Regional',
    categoria: 'musica',
    tag: 'Música',
    dia: '22', mes: 'ABR',
    local: 'Praça Central',
    categoria: 'arte',
    tag: 'Arte',
    cidade: 'Erechim', estado: 'RS',
    preco: 'R$ 40',
    precoNum: 40,
    desc: 'Apresentações de bandas locais e regionais com ritmos gaúchos e sertanejo.',
    img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80',
    destaque: false
  },
  {
    id: 3,
    titulo: 'Feira de Negócios do Alto Uruguai',
    categoria: 'tech',
    categoria: 'arte',
    tag: 'Arte',
    tag: 'Negócios',
    dia: '05', mes: 'MAI',
    local: 'Ginásio Municipal',
    cidade: 'Erechim', estado: 'RS',
    preco: 'R$ 25',
    precoNum: 25,
    desc: 'Expositores, rodadas de negócios e palestras sobre empreendedorismo regional.',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
    destaque: false
  },
  {
    id: 4,
    titulo: 'Exposição de Arte Contemporânea',
    categoria: 'arte',
    tag: 'Arte',
    dia: '18', mes: 'MAI',
    local: 'Centro Cultural IDEAU',
    cidade: 'Getúlio Vargas', estado: 'RS',
    preco: 'Gratuito',
    precoNum: 0,
    desc: 'Obras de artistas da região e convidados nacionais, aberta ao público geral.',
    img: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&q=80',
    destaque: false
  },
  {
    id: 5,
    titulo: 'Torneio Universitário de Futsal',
    categoria: 'esporte',
    tag: 'Esporte',
    dia: '25', mes: 'MAI',
    local: 'Ginásio IDEAU',
    cidade: 'Getúlio Vargas', estado: 'RS',
    preco: 'R$ 15',
    precoNum: 15,
    desc: 'Campeonato entre as turmas do campus com premiações e encerramento festivo.',
    img: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&q=80',
    destaque: false
  },
  {
    id: 6,
    titulo: 'Noite Gastronômica do Alto Uruguai',
    categoria: 'gastronomia',
    tag: 'Gastronomia',
    dia: '07', mes: 'JUN',
    local: 'Restaurante Escola IDEAU',
    cidade: 'Getúlio Vargas', estado: 'RS',
    preco: 'R$ 65',
    precoNum: 65,
    desc: 'Jantar temático com chefs da região preparando receitas típicas do Rio Grande do Sul.',
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    destaque: false
  },
  {
    id: 7,
    titulo: 'Congresso de Psicologia',
    categoria: 'tech',
    tag: 'Acadêmico',
    dia: '13', mes: 'JUN',
    local: 'Auditório Principal',
    cidade: 'Erechim', estado: 'RS',
    preco: 'R$ 30',
    precoNum: 30,
    desc: 'Debates atuais sobre saúde mental, pesquisas e avanços na área da Psicologia.',
    img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&q=80',
    destaque: false
  },
  {
    id: 8,
    titulo: 'Show Sertanejo — Dupla Revelação',
    categoria: 'musica',
    tag: 'Música',
    dia: '28', mes: 'JUN',
    local: 'Parque de Exposições',
    cidade: 'Erechim', estado: 'RS',
    preco: 'R$ 90',
    precoNum: 90,
    desc: 'Grande show com a dupla do momento, prometendo uma noite inesquecível.',
    img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80',
    destaque: false
  },
];

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

function filterEvents() {
  buscaAtual = document.getElementById('searchInput').value.toLowerCase();
  estadoAtual = document.getElementById('stateFilter').value;
  cidadeAtual = document.getElementById('cityFilter').value;

  const resultados = eventosData.filter(ev => {
    const matchCat   = filtroAtual === 'todos' || ev.categoria === filtroAtual;
    const matchBusca = !buscaAtual || ev.titulo.toLowerCase().includes(buscaAtual) ||
                       ev.local.toLowerCase().includes(buscaAtual) ||
                       ev.tag.toLowerCase().includes(buscaAtual);
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
        <img src="${ev.img}" alt="${ev.titulo}" loading="lazy"/>
        <span class="card-tag">${ev.tag}</span>
        <div class="card-date-badge">
          <span class="day">${ev.dia}</span>
          <span class="month">${ev.mes}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>📍 ${ev.cidade}</span>
          <span>🏛️ ${ev.local}</span>
        </div>
        <h3 class="card-title">${ev.titulo}</h3>
        <p class="card-desc">${ev.desc}</p>
        <div class="card-footer">
          <button class="card-btn" onclick="openModal('${ev.titulo.replace(/'/g, "\\'")}')">
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

// ── MODAL ──
function openModal(nomeEvento) {
  if (!currentUser) {
    showToast('Faça login para reservar ingressos!');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }
  document.getElementById('modalEventName').textContent = nomeEvento;
  document.getElementById('modalName').value = currentUser.name || '';
  document.getElementById('modalEmail').value = currentUser.email || '';

  const sel = document.getElementById('modalTicket');
  if (sel) {
    sel.innerHTML = '<option>Entrada Gratuita</option>';
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
