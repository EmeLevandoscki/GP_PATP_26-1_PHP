/* Tema compartilhado: automático por padrão, com escolha manual pelos botões existentes. */
(() => {
  'use strict';
  if (window.ideauTheme) return;
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const key = 'ideau-theme';
  const valid = value => value === 'dark' || value === 'light' ? value : null;
  let preference = null;
  try { preference = valid(localStorage.getItem(key)); } catch (_) { /* Armazenamento pode estar bloqueado. */ }
  const systemTheme = () => media.matches ? 'dark' : 'light';
  function syncIcons() {
    const dark = root.getAttribute('data-theme') === 'dark';
    const actionIcon = root.getAttribute('data-theme-icon-mode') === 'action';
    const button = document.getElementById('themeToggle');
    const sidebarIcon = document.getElementById('sidebarThemeIcon');
    const sidebarLabel = document.getElementById('sidebarThemeLabel');
    if (button) button.textContent = (actionIcon ? !dark : dark) ? '🌙' : '☀️';
    if (sidebarIcon) sidebarIcon.textContent = dark ? '🌙' : '☀️';
    if (sidebarLabel) sidebarLabel.textContent = dark ? 'Tema escuro' : 'Tema claro';
  }
  function apply() {
    const theme = preference || systemTheme();
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    syncIcons();
  }
  function toggle() {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    // Voltar à aparência do navegador também devolve o controle ao modo automático.
    preference = next === systemTheme() ? null : next;
    try {
      if (preference) localStorage.setItem(key, preference);
      else localStorage.removeItem(key);
    } catch (_) { /* A troca ainda funciona nesta página. */ }
    apply();
  }
  window.ideauTheme = { apply, toggle };
  window.toggleTheme = toggle;
  if (media.addEventListener) media.addEventListener('change', apply);
  else if (media.addListener) media.addListener(apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue);
      apply();
    }
  });
  document.addEventListener('DOMContentLoaded', syncIcons);
  apply();
})();
