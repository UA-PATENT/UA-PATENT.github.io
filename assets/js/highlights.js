/* Renders the most-cited papers as poster cards into any element with [data-highlights].
   data-limit="3" shows only the first N. Citation counts come from publications.json. */
(function () {
  'use strict';
  var mounts = document.querySelectorAll('[data-highlights]');
  if (!mounts.length) return;

  var FACULTY = { rahimi: 'Rahimi', mittal: 'Mittal', amiri: 'Amiri Golilarz', neupane: 'Neupane' };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function figure(h) {
    if (h.taxonomy) {
      var cols = Object.keys(h.taxonomy).map(function (k) {
        return '<div class="tax__col"><span class="tax__head">' + esc(k) + '</span>' +
          h.taxonomy[k].map(function (x) { return '<span class="tax__leaf">' + esc(x) + '</span>'; }).join('') + '</div>';
      }).join('');
      return '<figure class="poster__fig poster__fig--tax"><div class="tax"><span class="tax__root">X-IDS</span><div class="tax__cols">' + cols + '</div></div>' +
        '<figcaption>' + esc(h.figure) + '</figcaption></figure>';
    }
    return '<figure class="poster__fig"><img src="' + esc(h.image) + '" alt="' + esc(h.figure) + '" width="' + h.width + '" height="' + h.height + '" loading="lazy" decoding="async">' +
      '<figcaption>' + esc(h.figure) + '</figcaption></figure>';
  }

  function card(h, p, i) {
    var who = (p.faculty || []).map(function (f) { return FACULTY[f]; }).filter(Boolean);
    return '<article class="poster reveal" style="--d:' + (i % 3) * 0.06 + 's">' +
      figure(h) +
      '<div class="poster__body">' +
        '<div class="poster__meta"><span class="cites"><b>' + fmt(p.cites) + '</b> citations</span><span>' + p.year + '</span></div>' +
        '<h3>' + esc(h.short) + '</h3>' +
        '<p>' + esc(h.summary) + '</p>' +
        '<p class="poster__venue">' + esc(p.venue || '') + (who.length ? ' · ' + esc(who.join(', ')) : '') + '</p>' +
        '<div class="poster__links"><a class="link-arrow" href="' + esc(h.paper) + '" target="_blank" rel="noopener">Read the paper</a>' +
        '<a class="badge badge--muted" href="' + esc(p.url) + '" target="_blank" rel="noopener">Scholar ↗</a></div>' +
      '</div></article>';
  }

  Promise.all([
    fetch('assets/data/highlights.json').then(function (r) { return r.json(); }),
    fetch('assets/data/publications.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    var pubs = res[1].publications;
    var items = res[0].highlights.map(function (h) {
      var m = h.match.toLowerCase();
      var p = pubs.filter(function (x) { return x.title.toLowerCase().indexOf(m) === 0; })[0];
      return p ? { h: h, p: p } : null;
    }).filter(Boolean).sort(function (a, b) { return b.p.cites - a.p.cites; });

    mounts.forEach(function (el) {
      var n = parseInt(el.getAttribute('data-limit'), 10) || items.length;
      el.innerHTML = items.slice(0, n).map(function (x, i) { return card(x.h, x.p, i); }).join('');
      if (window.PATENT && window.PATENT.observe) window.PATENT.observe(el.querySelectorAll('.reveal'));
    });
  }).catch(function () {
    mounts.forEach(function (el) { el.innerHTML = ''; });
  });
})();
