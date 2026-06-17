/* INÍCIO FUNÇÃO DE TEMA */
function toggleTheme(){
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme')==='dark';
  html.setAttribute('data-theme', isDark?'light':'dark');
  document.getElementById('themeToggle').textContent = isDark?'🌙':'☀️';
  localStorage.setItem('ideau-theme', isDark?'light':'dark');
}
/* FIM FUNÇÃO DE TEMA */

/* INÍCIO CARREGAR TEMA SALVO */
(function(){
  const s = localStorage.getItem('ideau-theme');
  if(s){
    document.documentElement.setAttribute('data-theme', s);
    document.getElementById('themeToggle').textContent = s==='dark'?'☀️':'🌙';
  }
})();
/* FIM CARREGAR TEMA SALVO */
