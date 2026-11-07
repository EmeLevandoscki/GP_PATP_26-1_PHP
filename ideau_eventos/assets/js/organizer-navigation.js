// O servidor decide a autenticação. Mensagens entre abas apenas provocam nova consulta.
(() => {
  const script = document.currentScript;
  const endpoint = new URL('../../../src/Controller/PublicacaoController.php?action=organizer-status', script.src);
  const login = new URL('../../login.html', script.src);
  const home = document.body.dataset.page === 'home';
  // A entrada publica nunca muda de interface por causa de um login em outra aba.
  const organizerHome = home && document.body.dataset.homeAccess === 'organizer';
  if (home && !organizerHome) return;
  if (organizerHome) login.searchParams.set('retorno', 'organizador');
  const admin = document.body.classList.contains('admin-page');
  const protectedPage = admin || organizerHome;
  const key = 'ideauEventos.organizerSessionChanged';
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(key) : null;
  let pending = false;
  let queued = false;
  let revision = 0;

  function hidePanelLink() {
    document.querySelectorAll('[data-organizer-panel]').forEach(link => { link.hidden = true; });
  }

  async function refresh() {
    if (document.hidden) return;
    if (pending) { queued = true; return; }
    pending = true;
    const requestRevision = revision;
    try {
      const response = await fetch(endpoint, {credentials: 'same-origin', cache: 'no-store'});
      if (!response.ok) throw new Error('Sessão indisponível.');
      const state = await response.json();
      if (requestRevision !== revision) return;
      if (typeof state.authenticated !== 'boolean') throw new Error('Sessão inválida.');
      if (protectedPage && !state.authenticated) { hidePanelLink(); window.location.replace(login.href); return; }
      if (organizerHome) {
        // O botao e criado apenas pelo PHP; aqui apenas revalidamos apos logout/cache.
        document.querySelectorAll('[data-organizer-panel]').forEach(item => { item.hidden = !state.authenticated; });
      }
      if (protectedPage) document.body.hidden = false;
    } catch {
      // Uma falha de rede nao revoga a sessao que o PHP acabou de validar.
      // Se a pagina foi ocultada por logout/cache, ela permanece protegida.
      // Ao recuperar uma página do cache, só exiba o painel após revalidar a sessão.
      if (protectedPage && document.body.hidden) window.location.replace(login.href);
    } finally {
      pending = false;
      if (queued) { queued = false; refresh(); }
    }
  }

  function sessionChanged() {
    revision++;
    hidePanelLink();
    if (protectedPage) document.body.hidden = true;
    refresh();
  }
  channel?.addEventListener('message', sessionChanged);
  window.addEventListener('storage', event => { if (event.key === key) sessionChanged(); });
  window.addEventListener('organizer-session-changed', () => {
    revision++;
    hidePanelLink();
    channel?.postMessage('refresh');
    try { localStorage.setItem(key, String(Date.now()) + Math.random()); } catch { /* Consulta periódica continua disponível. */ }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { hidePanelLink(); if (protectedPage) document.body.hidden = true; }
    refresh();
  });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  if (home || admin) setInterval(refresh, 30000);
})();
