/* ─── LINK EVENTO: após o app.js montar a página, copia o href do nav para o sidebar ─── */
document.addEventListener('DOMContentLoaded', function () {
  var navLink     = document.getElementById('eventDetailsNav');
  var sidebarLink = document.getElementById('sidebarEventLink');
  if (navLink && sidebarLink && navLink.href !== '#') {
    sidebarLink.href = navLink.href;
  }
});
