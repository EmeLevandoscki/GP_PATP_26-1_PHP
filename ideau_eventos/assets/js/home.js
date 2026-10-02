
/* Tema e botão da sidebar são controlados por theme.js e app.js. */



/*
  MARQUEE
  */
/*inicia marquee clone*/
const track = document.getElementById('marqueeTrack');
if (track) {
  track.innerHTML += track.innerHTML;
}
/*finaliza marquee clone*/

/*
  FADE UP (INTERSECTION OBSERVER)
  */
/*inicia fade up*/
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
/*finaliza fade up*/
