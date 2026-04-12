/* ── CURSOR ── */
(function(){
  const cur  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  let mx=0, my=0, rx=0, ry=0;

  document.addEventListener('mousemove', function bootstrap(e){
    mx = rx = e.clientX; my = ry = e.clientY;
    cur.style.transition  = 'none';
    ring.style.transition = 'none';
    cur.style.top  = '0'; cur.style.left  = '0';
    ring.style.top = '0'; ring.style.left = '0';
    cur.style.transform  = `translate(${mx-5}px,${my-5}px)`;
    ring.style.transform = `translate(${rx-16}px,${ry-16}px)`;
    requestAnimationFrame(()=>{
      cur.style.transition  = 'background .3s';
      ring.style.transition = 'all .25s ease';
    });
    document.removeEventListener('mousemove', bootstrap);
    document.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; });
    loop();
  });

  function loop(){
    rx += (mx-rx)*.18; ry += (my-ry)*.18;
    cur.style.transform  = `translate(${mx-5}px,${my-5}px)`;
    ring.style.transform = `translate(${rx-16}px,${ry-16}px)`;
    requestAnimationFrame(loop);
  }
})();

/* ── TEMA ── */
function toggleTheme(){
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme')==='dark';
  html.setAttribute('data-theme', isDark?'light':'dark');
  document.getElementById('themeToggle').textContent = isDark?'🌙':'☀️';
  localStorage.setItem('ideau-theme', isDark?'light':'dark');
}
(function(){
  const s = localStorage.getItem('ideau-theme');
  if(s){
    document.documentElement.setAttribute('data-theme', s);
    document.getElementById('themeToggle').textContent = s==='dark'?'☀️':'🌙';
  }
})();

/* ── TOAST ── */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ── AUTH ── */
let selectedRole = 'cliente';

function switchTab(tab){
  const isL = tab==='login';
  document.getElementById('tabLogin').classList.toggle('active', isL);
  document.getElementById('tabCadastro').classList.toggle('active', !isL);
  document.getElementById('formLogin').style.display    = isL?'block':'none';
  document.getElementById('formCadastro').style.display = isL?'none':'block';
  document.getElementById('formEyebrow').textContent    = isL?'Acesso':'Novo cadastro';
  document.getElementById('formTitle').textContent      = isL?'ENTRAR':'CRIAR CONTA';
  /* volta ao topo do painel ao trocar de aba */
  document.getElementById('rightPanel').scrollTop = 0;
}

function selectRole(role){
  selectedRole = role;
  document.getElementById('roleCliente').classList.toggle('selected', role==='cliente');
  document.getElementById('roleOrg').classList.toggle('selected', role==='organizador');
  document.getElementById('orgFieldGroup').style.display = role==='organizador'?'block':'none';
}

function showError(id, msg){
  const el = document.getElementById(id);
  el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 4000);
}

function doLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if(!email||!pass){ showError('loginError','Preencha todos os campos.'); return; }
  const users = JSON.parse(localStorage.getItem('ideau-users')||'[]');
  const user  = users.find(u=>u.email===email&&u.pass===pass);
  if(!user){ showError('loginError','E-mail ou senha incorretos.'); return; }
  sessionStorage.setItem('ideau-session', JSON.stringify({
    name:user.name, initials:user.initials, email:user.email,
    role:user.role, roleLabel:user.roleLabel, org:user.org||''
  }));
  showToast('✅ Bem-vindo(a) de volta, '+user.name.split(' ')[0]+'!');
  setTimeout(()=>{ window.location.href='index.html'; }, 1000);
}

function doCadastro(){
  const nome  = document.getElementById('cadNome').value.trim();
  const email = document.getElementById('cadEmail').value.trim();
  const pass  = document.getElementById('cadPass').value;
  const orgEl = document.getElementById('cadOrg');
  const org   = orgEl ? orgEl.value.trim() : '';
  if(!nome||!email||!pass){ showError('cadError','Preencha todos os campos.'); return; }
  if(pass.length<6){ showError('cadError','A senha deve ter no mínimo 6 caracteres.'); return; }
  const users = JSON.parse(localStorage.getItem('ideau-users')||'[]');
  if(users.find(u=>u.email===email)){ showError('cadError','Este e-mail já está cadastrado.'); return; }
  const initials = nome.split(' ').slice(0,2).map(w=>w[0].toUpperCase()).join('');
  const newUser  = {
    name:nome, initials, email, pass, role:selectedRole,
    roleLabel: selectedRole==='cliente'?'Cliente':'Organizador',
    org: selectedRole==='organizador'?org:''
  };
  users.push(newUser);
  localStorage.setItem('ideau-users', JSON.stringify(users));
  sessionStorage.setItem('ideau-session', JSON.stringify({
    name:newUser.name, initials:newUser.initials, email:newUser.email,
    role:newUser.role, roleLabel:newUser.roleLabel, org:newUser.org
  }));
  showToast('✅ Conta criada! Bem-vindo(a), '+nome.split(' ')[0]+'!');
  setTimeout(()=>{ window.location.href='index.html'; }, 1000);
}