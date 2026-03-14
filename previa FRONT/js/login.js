// ================================
//   EVENTURA — login.js
// ================================

// --------------------------------
// CUSTOM CURSOR
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

document.querySelectorAll('button, a, input, label').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.style.transform = 'scale(2.2)'; cursorRing.style.opacity = '0.4'; });
  el.addEventListener('mouseleave', () => { cursor.style.transform = 'scale(1)';   cursorRing.style.opacity = '1'; });
});

// --------------------------------
// PARTICLES CANVAS
// --------------------------------

const canvas = document.getElementById('particles');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const PARTICLE_COUNT = 55;
const particles = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push({
    x:  Math.random() * window.innerWidth,
    y:  Math.random() * window.innerHeight,
    r:  Math.random() * 1.4 + 0.3,
    dx: (Math.random() - 0.5) * 0.35,
    dy: (Math.random() - 0.5) * 0.35,
    o:  Math.random() * 0.4 + 0.05,
  });
}

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 61, 90, ${p.o})`;
    ctx.fill();

    p.x += p.dx;
    p.y += p.dy;

    if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
  });

  // Draw connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
      if (dist < 110) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(255, 61, 90, ${0.07 * (1 - dist / 110)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}

drawParticles();

// --------------------------------
// PROFILE SELECTION
// --------------------------------

let selectedProfile = 'cliente';

function selectProfile(profile) {
  selectedProfile = profile;

  document.getElementById('btnCliente').classList.toggle('active', profile === 'cliente');
  document.getElementById('btnOrganizador').classList.toggle('active', profile === 'organizador');

  const orgFields = document.getElementById('orgFields');
  orgFields.style.display = profile === 'organizador' ? 'flex' : 'none';

  const btn = document.getElementById('registerBtn');
  btn.textContent = profile === 'organizador' ? 'Solicitar Cadastro como Organizador' : 'Criar Conta';
}

function maskCnpj(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 14);
  if (v.length > 12) v = v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8,12)+'-'+v.slice(12);
  else if (v.length > 8) v = v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8);
  else if (v.length > 5) v = v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5);
  else if (v.length > 2) v = v.slice(0,2)+'.'+v.slice(2);
  el.value = v;
}

// --------------------------------
// PANEL SWITCHING
// --------------------------------

function switchTo(panel) {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('forgotBox').classList.add('hidden');

  const target = {
    login:    'loginBox',
    register: 'registerBox',
    forgot:   'forgotBox',
  }[panel];

  const box = document.getElementById(target);
  box.classList.remove('hidden');
  box.style.animation = 'none';
  box.offsetHeight; // reflow
  box.style.animation = 'fadeUp 0.5s ease both';
}

// --------------------------------
// VALIDATION HELPERS
// --------------------------------

function showError(fieldId, msg) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(fieldId + 'Err');
  if (input) input.classList.add('error');
  if (err)   err.textContent = msg;
}

function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(fieldId + 'Err');
  if (input) input.classList.remove('error');
  if (err)   err.textContent = '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --------------------------------
// TOGGLE PASSWORD VISIBILITY
// --------------------------------

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// --------------------------------
// PASSWORD STRENGTH
// --------------------------------

function checkStrength(value) {
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');

  let score = 0;
  if (value.length >= 8)            score++;
  if (/[A-Z]/.test(value))          score++;
  if (/[0-9]/.test(value))          score++;
  if (/[^A-Za-z0-9]/.test(value))   score++;

  const levels = [
    { pct: '0%',   color: 'transparent', text: '' },
    { pct: '25%',  color: '#ff3d5a',     text: 'Fraca' },
    { pct: '50%',  color: '#ffb800',     text: 'Razoável' },
    { pct: '75%',  color: '#00b4d8',     text: 'Boa' },
    { pct: '100%', color: '#00e56a',     text: 'Forte 💪' },
  ];

  const level = value.length === 0 ? levels[0] : levels[score];
  fill.style.width      = level.pct;
  fill.style.background = level.color;
  label.textContent     = level.text;
  label.style.color     = level.color;
}

// --------------------------------
// LOGIN HANDLER
// --------------------------------

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;

  let valid = true;

  clearError('loginEmail');
  clearError('loginPass');

  if (!email) {
    showError('loginEmail', 'Informe seu e-mail.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('loginEmail', 'E-mail inválido.');
    valid = false;
  }

  if (!pass) {
    showError('loginPass', 'Informe sua senha.');
    valid = false;
  } else if (pass.length < 6) {
    showError('loginPass', 'Senha muito curta.');
    valid = false;
  }

  if (!valid) return;

  // Simulate loading
  const btn    = document.querySelector('#loginBox .btn-submit');
  const text   = document.getElementById('loginBtnText');
  const loader = document.getElementById('loginBtnLoader');

  btn.disabled     = true;
  text.style.display   = 'none';
  loader.style.display = 'inline';

  setTimeout(() => {
    btn.disabled         = false;
    text.style.display   = 'inline';
    loader.style.display = 'none';

    document.getElementById('loginSuccess').style.display = 'flex';

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1800);
  }, 1500);
}

// --------------------------------
// REGISTER HANDLER
// --------------------------------

function handleRegister() {
  const name        = document.getElementById('regName').value.trim();
  const lastName    = document.getElementById('regLastName').value.trim();
  const email       = document.getElementById('regEmail').value.trim();
  const pass        = document.getElementById('regPass').value;
  const passConfirm = document.getElementById('regPassConfirm').value;
  const terms       = document.getElementById('acceptTerms').checked;

  clearError('regPass');

  let valid = true;

  if (!name || !lastName) { alert('Preencha nome e sobrenome.'); valid = false; }
  if (!isValidEmail(email)) { alert('E-mail inválido.'); valid = false; }
  if (pass.length < 8) { showError('regPass', 'A senha precisa ter pelo menos 8 caracteres.'); valid = false; }
  if (pass !== passConfirm) { showError('regPass', 'As senhas não coincidem.'); valid = false; }
  if (!terms) { alert('Aceite os termos para continuar.'); valid = false; }

  // Validação extra para organizador
  if (selectedProfile === 'organizador') {
    const orgName = document.getElementById('regOrgName').value.trim();
    const cnpj    = document.getElementById('regCnpj').value.trim();
    if (!orgName) { alert('Informe o nome da empresa ou organização.'); valid = false; }
    if (!cnpj)    { alert('Informe o CNPJ.'); valid = false; }
  }

  if (!valid) return;

  const btn = document.getElementById('registerBtn');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Criando conta...';
  btn.disabled    = true;

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled    = false;

    const successBox   = document.getElementById('registerSuccess');
    const successIcon  = document.getElementById('regSuccessIcon');
    const successTitle = document.getElementById('regSuccessTitle');
    const successMsg   = document.getElementById('regSuccessMsg');

    if (selectedProfile === 'organizador') {
      successIcon.textContent  = '⏳';
      successTitle.textContent = 'Solicitação enviada!';
      successMsg.textContent   = 'Nossa equipe analisará seu cadastro em até 48h e enviará a confirmação por e-mail.';
    } else {
      successIcon.textContent  = '🎉';
      successTitle.textContent = 'Conta criada! Bem-vindo ao EVENTURA!';
      successMsg.textContent   = 'Você já pode explorar e comprar ingressos.';
    }

    successBox.style.display = 'flex';
    setTimeout(() => switchTo('login'), 3000);
  }, 1600);
}

// --------------------------------
// FORGOT PASSWORD HANDLER
// --------------------------------

function handleForgot() {
  const email = document.getElementById('forgotEmail').value.trim();

  if (!isValidEmail(email)) {
    alert('Informe um e-mail válido.');
    return;
  }

  const btn = document.querySelector('#forgotBox .btn-submit');
  btn.textContent = '⏳ Enviando...';
  btn.disabled    = true;

  setTimeout(() => {
    btn.textContent = 'Enviar Link de Redefinição';
    btn.disabled    = false;
    document.getElementById('forgotSuccess').style.display = 'flex';
    setTimeout(() => switchTo('login'), 2500);
  }, 1400);
}

// --------------------------------
// SOCIAL LOGIN (mock)
// --------------------------------

function socialLogin(provider) {
  const btns = document.querySelectorAll('.social-login');
  btns.forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });

  const clicked = [...btns].find(b => b.textContent.includes(provider));
  if (clicked) clicked.textContent = `⏳ Conectando ao ${provider}...`;

  setTimeout(() => {
    btns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    document.getElementById('loginSuccess').style.display = 'flex';
    setTimeout(() => { window.location.href = 'index.html'; }, 1800);
  }, 1600);
}

// --------------------------------
// ENTER KEY SUPPORT
// --------------------------------

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginVisible    = !document.getElementById('loginBox').classList.contains('hidden');
  const registerVisible = !document.getElementById('registerBox').classList.contains('hidden');
  const forgotVisible   = !document.getElementById('forgotBox').classList.contains('hidden');

  if (loginVisible)    handleLogin();
  if (registerVisible) handleRegister();
  if (forgotVisible)   handleForgot();
});