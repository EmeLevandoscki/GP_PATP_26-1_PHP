/* ─── LINK INSCRIÇÃO: após o app.js montar a página, copia o href do nav para o sidebar ─── */
document.addEventListener('DOMContentLoaded', function () {
  var navLink     = document.getElementById('eventRegistrationNav');
  var sidebarLink = document.getElementById('sidebarRegistrationLink');
  if (navLink && sidebarLink && navLink.href !== '#') {
    sidebarLink.href = navLink.href;
  }
});
