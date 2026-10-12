(() => {
  const sidebar = document.querySelector('.admin-sidebar');
  const main = document.querySelector('.admin-main');
  if (!sidebar || !main) return;

  const mobile = window.matchMedia('(max-width: 1050px)');
  const header = document.createElement('header');
  header.className = 'admin-mobile-header';
  header.innerHTML = '<a class="admin-mobile-brand" href="dashboard.html">IDEAU Eventos<small>Organizador</small></a><button class="admin-menu-button" type="button" aria-controls="adminSidebar" aria-expanded="false" aria-label="Abrir menu do organizador"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>Menu</button>';
  const toggle = header.querySelector('button');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'admin-menu-close';
  close.setAttribute('aria-label', 'Fechar menu do organizador');
  close.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const backdrop = document.createElement('div');
  backdrop.className = 'admin-menu-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  sidebar.id = 'adminSidebar';
  sidebar.prepend(close);
  document.body.prepend(header, backdrop);
  sidebar.querySelector('nav')?.setAttribute('aria-label', 'Navegação do organizador');
  sidebar.querySelector('.admin-nav .active')?.setAttribute('aria-current', 'page');
  document.body.classList.add('admin-nav-ready');
  let open = false;

  function setOpen(value, restoreFocus = true) {
    open = mobile.matches && value;
    document.body.classList.toggle('admin-menu-open', open);
    document.documentElement.classList.toggle('admin-menu-lock', open);
    toggle.setAttribute('aria-expanded', String(open));
    sidebar.inert = mobile.matches && !open;
    sidebar.setAttribute('aria-hidden', String(sidebar.inert));
    main.inert = open;
    header.inert = open;
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-label', 'Menu do organizador');
      // Aguarda o painel ficar visível antes de mover o foco para ele.
      requestAnimationFrame(() => { if (open) close.focus(); });
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('aria-label');
      if (restoreFocus && mobile.matches) toggle.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', event => {
    // Deixa o navegador seguir o link antes de desativar os controles do painel.
    if (open && event.target.closest('a, #logoutButton')) setTimeout(() => setOpen(false), 0);
  });
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key !== 'Tab') return;
    const controls = [...sidebar.querySelectorAll('a[href], button:not([disabled])')]
      .filter(element => element.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  mobile.addEventListener('change', () => {
    const focused = document.activeElement;
    setOpen(false, false);
    if (mobile.matches && sidebar.contains(focused)) toggle.focus();
    else if (!mobile.matches && (focused === toggle || focused === close)) {
      sidebar.querySelector('.admin-nav .active, .admin-nav a')?.focus();
    }
  });
  setOpen(false, false);
})();
