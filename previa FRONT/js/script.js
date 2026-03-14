// ================================
//   EVENTURA — script.js
// ================================

// --------------------------------
// CUSTOM CURSOR
// --------------------------------

const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');

let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
});

function animateCursor() {
  cursor.style.left = mx - 6 + 'px';
  cursor.style.top  = my - 6 + 'px';

  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;

  ring.style.left = rx - 18 + 'px';
  ring.style.top  = ry - 18 + 'px';

  requestAnimationFrame(animateCursor);
}

animateCursor();

document.querySelectorAll('button, a, .event-card, .cat-card, input, select').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.transform = 'scale(2.5)';
    ring.style.opacity = '0.5';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.transform = 'scale(1)';
    ring.style.opacity = '1';
  });
});

// --------------------------------
// EVENTS DATA
// --------------------------------

const events = [
  {
    id: 1,
    category: 'musica',
    title: 'ROCK IN RIO EXPERIENCE',
    desc: 'Uma noite especial com as melhores bandas de rock do Brasil e do mundo num show épico.',
    date: '12', month: 'OUT', time: '19:00', location: 'Rio de Janeiro',
    price: 'R$ 120', tag: 'Música',
    img: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=75'
  },
  {
    id: 2,
    category: 'tech',
    title: 'TECH SUMMIT SP 2025',
    desc: 'O maior evento de tecnologia do Brasil. Palestras, workshops e networking com os maiores nomes do setor.',
    date: '18', month: 'OUT', time: '08:30', location: 'São Paulo',
    price: 'R$ 250', tag: 'Tech',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=75'
  },
  {
    id: 3,
    category: 'arte',
    title: 'BIENAL DE ARTE CONTEMPORÂNEA',
    desc: 'Exposição com mais de 200 artistas de 40 países. Uma imersão na arte e no pensamento do século XXI.',
    date: '05', month: 'NOV', time: '10:00', location: 'São Paulo',
    price: 'R$ 40', tag: 'Arte',
    img: 'https://images.unsplash.com/photo-1531913223931-b0d3198229ee?w=600&q=75'
  },
  {
    id: 4,
    category: 'gastronomia',
    title: 'FESTIVAL DA PIZZA DE BH',
    desc: 'Trinta pizzarias competindo pelo título. Degustações, concursos e muita queijo num evento imperdível.',
    date: '22', month: 'NOV', time: '12:00', location: 'Belo Horizonte',
    price: 'R$ 60', tag: 'Gastronomia',
    img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=75'
  },
  {
    id: 5,
    category: 'musica',
    title: 'VIRADA CULTURAL ELETRÔNICA',
    desc: 'Uma noite inteira de música eletrônica com os maiores DJs do Brasil e convidados internacionais.',
    date: '29', month: 'NOV', time: '22:00', location: 'São Paulo',
    price: 'R$ 90', tag: 'Música',
    img: 'https://images.unsplash.com/photo-1571266028027-f570c9d7ebb3?w=600&q=75'
  },
  {
    id: 6,
    category: 'esporte',
    title: 'MARATONA INTERNACIONAL CWB',
    desc: 'Percurso de 42km pelos parques e avenidas mais bonitos de Curitiba. Categorias para todos os níveis.',
    date: '07', month: 'DEZ', time: '06:00', location: 'Curitiba',
    price: 'R$ 150', tag: 'Esporte',
    img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=75'
  }
];

// --------------------------------
// STATE
// --------------------------------

let activeFilter = 'todos';
let searchTerm   = '';
let cityFilter   = '';

// --------------------------------
// RENDER EVENTS
// --------------------------------

function renderEvents() {
  const grid = document.getElementById('eventsGrid');

  const filtered = events.filter(e => {
    const matchCat    = activeFilter === 'todos' || e.category === activeFilter;
    const matchSearch = e.title.toLowerCase().includes(searchTerm) ||
                        e.desc.toLowerCase().includes(searchTerm) ||
                        e.location.toLowerCase().includes(searchTerm);
    const matchCity   = !cityFilter || e.location === cityFilter;
    return matchCat && matchSearch && matchCity;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--muted);font-size:1.1rem;">
        Nenhum evento encontrado. Tente outros filtros.
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(e => `
    <div class="event-card fade-up" data-id="${e.id}">
      <div class="card-img">
        <img src="${e.img}" alt="${e.title}" loading="lazy"/>
        <div class="card-tag">${e.tag}</div>
        <div class="card-date-badge">
          <span class="day">${e.date}</span>
          <span class="month">${e.month}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>🕐 ${e.time}</span>
          <span>📍 ${e.location}</span>
        </div>
        <div class="card-title">${e.title}</div>
        <div class="card-desc">${e.desc}</div>
        <div class="card-footer">
          <div class="card-price">${e.price}<br><small>por pessoa</small></div>
          <button class="card-btn" onclick="openModal('${e.title}')">Reservar</button>
        </div>
      </div>
    </div>
  `).join('');

  // Re-observe new cards for animations
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

// --------------------------------
// FILTER & SEARCH
// --------------------------------

function setFilter(btn, filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderEvents();
}

function filterEvents() {
  searchTerm = document.getElementById('searchInput').value.toLowerCase();
  cityFilter = document.getElementById('cityFilter').value;
  renderEvents();
}

// --------------------------------
// STATE → CITY CASCADING
// --------------------------------

const citiesByState = {
  AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá", "Feijó", "Brasiléia", "Senador Guiomard", "Plácido de Castro", "Mâncio Lima", "Porto Acre", "Xapuri", "Rodrigues alves", "Marechal Thaumaturgo", "Epitaciolândia", "Acrelândia", "Manoel urbano", "Capixaba", "Porto Walter", "Bujari", "Assis Brasil", "Jordão", "Santa Rosa do Rurus"],
  AL: ["Água Branca", "Anadia", "Arapiraca", "Atalaia", "Barra De Santo Antônio", "Barra De São Miguel", "Batalha", "Belém", "Belo Monte", "Boca Da Mata", "Branquinha", "Cacimbinhas", "Cajueiro", "Campestre", "Campo Alegre", "Campo Grande", "Canapi", "Capela", "Carneiros", "Chã Preta", "Coité Do Nóia", "Colônia Leopoldina", "Coqueiro Seco", "Coruripe", "Craíbas", "Delmiro Gouveia", "Dois Riachos", "Estrela De Alagoas", "Feira Grande", "Feliz Deserto", "Flexeiras", "Girau Do Ponciano", "Ibateguara", "Igaci", "Igreja Nova", "Inhapi", "Jacaré Dos Homens", "Jacuípe", "Japaratinga", "Jaramataia", "Jequiá Da Praia", "Joaquim Gomes", "Jundiá", "Junqueiro", "Lagoa Da Canoa", "Limoeiro De Anadia", "Maceió", "Major Isidoro", "Mar Vermelho", "Maragogi", "Maravilha", "Marechal Deodoro", "Maribondo", "Mata Grande", "Matriz De Camaragibe", "Messias", "Minador Do Negrão", "Monteirópolis", "Murici", "Novo Lino", "Olho D'Água Das Flores", "Olho D'Água Do Casado", "Olho D'Água Grande", "Olivença", "Ouro Branco", "Palestina", "Palmeira Dos Índios", "Pão De Açúcar", "Pariconha", "Paripueira", "Passo De Camaragibe", "Paulo Jacinto", "Penedo", "Piaçabuçu", "Pilar", "Pindoba", "Piranhas", "Poço Das Trincheiras", "Porto Calvo", "Porto De Pedras", "Porto Real Do Colégio", "Quebrangulo", "Rio Largo", "Roteiro", "Santa Luzia Do Norte", "Santana Do Ipanema", "Santana Do Mundaú", "São Brás", "São José Da Laje", "São José Da Tapera", "São Luís Do Quitunde", "São Miguel Dos Campos", "São Miguel Dos Milagres", "São Sebastião", "Satuba", "Senador Rui Palmeira", "Tanque D'Arca", "Taquarana", "Teotônio Vilela", "Traipu", "União Dos Palmares", "Viçosa"],
  AM: ["Alvarães", "Amaturá", "Anamã", "Anori", "Apuí", "Atalaia Do Norte", "Autazes", "Barcelos", "Barreirinha", "Benjamin Constant", "Beruri", "Boa Vista Do Ramos", "Boca Do Acre", "Borba", "Caapiranga", "Canutama", "Carauari", "Careiro", "Careiro Da Várzea", "Coari", "Codajás", "Eirunepé", "Envira", "Fonte Boa", "Guajará", "Humaitá", "Ipixuna", "Iranduba", "Itacoatiara", "Itamarati", "Itapiranga", "Japurá", "Juruá", "Jutaí", "Lábrea", "Manacapuru", "Manaquiri", "Manaus", "Manicoré", "Maraã", "Maués", "Nhamundá", "Nova Olinda Do Norte", "Novo Airão", "Novo Aripuanã", "Parintins", "Pauini", "Presidente Figueiredo", "Rio Preto Da Eva", "Santa Isabel Do Rio Negro", "Santo Antônio Do Içá", "São Gabriel Da Cachoeira", "São Paulo De Olivença", "São Sebastião Do Uatumã", "Silves", "Tabatinga", "Tapauá", "Tefé", "Tonantins", "Uarini", "Urucará", "Urucurituba"],
  AP: ["Amapá", "Calçoene", "Cutias", "Ferreira Gomes", "Itaubal", "Laranjal Do Jari", "Macapá", "Mazagão", "Oiapoque", "Pedra Branca Do Amapari", "Porto Grande", "Pracuúba", "Santana", "Serra Do Navio", "Tartarugalzinho", "Vitória Do Jari"],
  BA: ['Salvador','Feira de Santana','Vitória da Conquista','Camaçari','Ilhéus','Porto Seguro'],
  CE: ['Fortaleza','Caucaia','Juazeiro do Norte','Sobral'],
  DF: ['Brasília'],
  ES: ['Vitória','Vila Velha','Cariacica','Serra'],
  GO: ['Goiânia','Aparecida de Goiânia','Anápolis','Rio Verde'],
  MA: ['São Luís','Imperatriz','Caxias'],
  MG: ['Belo Horizonte','Uberlândia','Contagem','Juiz de Fora','Betim','Montes Claros','Uberaba','Governador Valadares','Ouro Preto'],
  MS: ['Campo Grande','Dourados','Três Lagoas'],
  MT: ['Cuiabá','Várzea Grande','Rondonópolis'],
  PA: ['Belém','Ananindeua','Santarém','Marabá'],
  PB: ['João Pessoa','Campina Grande','Santa Rita'],
  PE: ['Recife','Olinda','Caruaru','Petrolina','Paulista'],
  PI: ['Teresina','Parnaíba'],
  PR: ['Curitiba','Londrina','Maringá','Ponta Grossa','Cascavel','Foz do Iguaçu'],
  RJ: ['Rio de Janeiro','São Gonçalo','Duque de Caxias','Nova Iguaçu','Niterói','Petrópolis','Volta Redonda'],
  RN: ['Natal','Mossoró','Parnamirim'],
  RO: ['Porto Velho','Ji-Paraná'],
  RR: ['Boa Vista'],
  RS: ['Porto Alegre','Caxias do Sul','Pelotas','Canoas','Santa Maria','Gramado','Novo Hamburgo'],
  SC: ['Florianópolis','Joinville','Blumenau','São José','Chapecó','Balneário Camboriú'],
  SE: ['Aracaju','Nossa Senhora do Socorro'],
  SP: ['São Paulo','Guarulhos','Campinas','São Bernardo do Campo','Santo André','Ribeirão Preto','Osasco','Sorocaba','São José dos Campos','Santos','Mauá','São José do Rio Preto','Bauru','Piracicaba'],
  TO: ['Palmas','Araguaína'],
};

function onStateChange() {
  const state      = document.getElementById('stateFilter').value;
  const citySelect = document.getElementById('cityFilter');

  citySelect.innerHTML = '<option value="">Cidade</option>';

  if (!state) {
    citySelect.disabled = true;
    cityFilter = '';
    renderEvents();
    return;
  }

  const cities = citiesByState[state] || [];
  cities.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });

  citySelect.disabled = false;
  cityFilter = '';
  renderEvents();
}

// --------------------------------
// MODAL
// --------------------------------

function openModal(eventName) {
  document.getElementById('modalEventName').textContent = eventName;
  document.getElementById('modalForm').style.display    = 'block';
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
  const name  = document.getElementById('modalName').value.trim();
  const email = document.getElementById('modalEmail').value.trim();

  if (!name || !email) {
    alert('Por favor preencha nome e e-mail.');
    return;
  }

  document.getElementById('modalForm').style.display    = 'none';
  document.getElementById('modalSuccess').style.display = 'block';

  setTimeout(closeModal, 3000);
}

// --------------------------------
// NEWSLETTER
// --------------------------------

function subscribeNewsletter() {
  const input = document.getElementById('newsletterEmail');
  const email = input.value.trim();
  if (!email) return;

  input.value       = '';
  input.placeholder = '✓ Cadastrado com sucesso!';

  setTimeout(() => {
    input.placeholder = 'seu@email.com';
  }, 3000);
}

// --------------------------------
// INTERSECTION OBSERVER (animations)
// --------------------------------

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.1 });

// --------------------------------
// KEYBOARD SHORTCUTS
// --------------------------------

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// --------------------------------
// INIT
// --------------------------------

renderEvents();
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));