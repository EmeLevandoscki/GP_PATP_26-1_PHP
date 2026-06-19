/* =========================================================
   IDEAU EVENTOS — HOME.JS
   Pagina inicial (index.php) — script completo
   ========================================================= */

/*══════════════════════════════════════════════════════════
  TEMA CLARO / ESCURO
  ══════════════════════════════════════════════════════════*/
/*inicia funcoes de tema*/
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
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  // Sidebar
  const sIcon = document.getElementById('sidebarThemeIcon');
  const sLabel = document.getElementById('sidebarThemeLabel');
  if (sIcon) sIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  if (sLabel) sLabel.textContent = theme === 'dark' ? 'Tema escuro' : 'Tema claro';
}
/*finaliza funcoes de tema*/

/*inicia inicializacao do tema*/
initTheme();
/*finaliza inicializacao do tema*/

/*══════════════════════════════════════════════════════════
  TOGGLE TEMA PELA SIDEBAR
  ══════════════════════════════════════════════════════════*/
/*inicia toggle tema sidebar*/
const sidebarThemeBtn = document.getElementById('sidebarThemeToggle');
if (sidebarThemeBtn) {
  sidebarThemeBtn.addEventListener('click', () => {
    toggleTheme();
  });
}
/*finaliza toggle tema sidebar*/

/*══════════════════════════════════════════════════════════
  SIDEBAR MOBILE
  ══════════════════════════════════════════════════════════*/
/*inicia sidebar mobile*/
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  menuToggle.classList.add('active');
  menuToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  menuToggle.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (menuToggle) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = sidebar.classList.contains('open');
    isOpen ? closeSidebar() : openSidebar();
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}
if (sidebarClose) {
  sidebarClose.addEventListener('click', closeSidebar);
}
// Fecha sidebar ao clicar em link
document.querySelectorAll('[data-nav-link]').forEach(link => {
  link.addEventListener('click', closeSidebar);
});
/*finaliza sidebar mobile*/

/*══════════════════════════════════════════════════════════
  MARQUEE
  ══════════════════════════════════════════════════════════*/
/*inicia marquee clone*/
const track = document.getElementById('marqueeTrack');
if (track) {
  track.innerHTML += track.innerHTML;
}
/*finaliza marquee clone*/

/*══════════════════════════════════════════════════════════
  FADE UP (INTERSECTION OBSERVER)
  ══════════════════════════════════════════════════════════*/
/*inicia fade up*/
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
/*finaliza fade up*/
