/* Renders assets/data/posters.json into #posters and opens a poster full-size in a dialog. Hidden while the list is empty. */
(function () {
  'use strict';
  var section = document.getElementById('posters');
  var grid = document.getElementById('poster-grid');
  if (!section || !grid) return;
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = '<button class="lightbox__close" type="button" aria-label="Close">×</button><img alt=""><div class="lightbox__bar"><p></p><a class="btn btn--crimson" target="_blank" rel="noopener">Open PDF</a></div>';
  document.body.appendChild(dialog);
  var dImg = dialog.querySelector('img'), dCap = dialog.querySelector('p'), dPdf = dialog.querySelector('a');
  dialog.querySelector('.lightbox__close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  fetch('assets/data/posters.json').then(function (r) { return r.json(); }).then(function (d) {
    var list = (d.posters || []).slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    if (!list.length) return;
    grid.innerHTML = list.map(function (p, i) {
      return '<button class="poster-card reveal" type="button" data-i="' + i + '">' +
        '<span class="poster-card__img"><img src="' + esc(p.image) + '" alt="Poster: ' + esc(p.title) + '" loading="lazy" decoding="async"></span>' +
        '<span class="poster-card__body"><span class="poster-card__meta">' + esc([p.event, p.year].filter(Boolean).join(' · ')) + '</span>' +
        '<span class="poster-card__title">' + esc(p.title) + '</span>' +
        (p.authors ? '<span class="poster-card__authors">' + esc(p.authors) + '</span>' : '') + '</span></button>';
    }).join('');
    section.hidden = false;
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.poster-card'); if (!b) return;
      var p = list[+b.getAttribute('data-i')];
      dImg.src = p.image; dImg.alt = 'Poster: ' + p.title;
      dCap.textContent = p.title + (p.event ? ' · ' + p.event : '') + (p.year ? ' ' + p.year : '');
      dPdf.hidden = !p.pdf; if (p.pdf) dPdf.href = p.pdf;
      dialog.showModal();
    });
    if (window.PATENT && window.PATENT.observe) window.PATENT.observe(grid.querySelectorAll('.reveal'));
  }).catch(function () {});
})();
