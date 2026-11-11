/* Most-cited papers as poster cards in any element with [data-highlights].
   The cards are always the top N papers in publications.json by citation count (posters excluded), so they stay
   correct after every weekly Scholar sync. highlights.json only adds details (short title, summary, figure, link).
   data-limit="3" shows the first three. */
(function () {
  'use strict';
  var mounts = document.querySelectorAll('[data-highlights]');
  if (!mounts.length) return;
  var TOP = 6;
  var FACULTY = {};

  /* Illustrations of the research area, for papers without an openly licensed figure. Labeled as illustrations. */
  var ART = {
    security: '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M100 18 166 42v52c0 44-28 76-66 88-38-12-66-44-66-88V42Z"/><path opacity=".45" d="M100 42 144 58v38c0 30-18 52-44 62-26-10-44-32-44-62V58Z"/><path stroke-width="4" d="m80 100 14 14 28-30"/></svg>',
    healthcare: '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 112h46l12-30 16 62 18-96 16 82 10-18h70"/><circle cx="188" cy="112" r="5" fill="currentColor"/><path opacity=".3" d="M6 150h188M6 74h188"/></svg>',
    cps: '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M30 160 70 110l50 20 50-80"/><path opacity=".45" d="M70 110 60 50l60-10 50 10M120 130l10 40"/><g fill="currentColor" stroke="none"><circle cx="30" cy="160" r="6"/><circle cx="70" cy="110" r="6"/><circle cx="120" cy="130" r="6"/><circle cx="170" cy="50" r="7"/><circle cx="60" cy="50" r="4"/><circle cx="120" cy="40" r="4"/><circle cx="130" cy="170" r="4"/></g></svg>',
    vision: '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 52V28h24M156 28h24v24M180 148v24h-24M44 172H20v-24"/><rect x="62" y="66" width="86" height="70" rx="6"/><circle cx="105" cy="101" r="6" fill="currentColor"/></svg>'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function figure(h, p) {
    if (h.taxonomy) {
      var cols = Object.keys(h.taxonomy).map(function (k) {
        return '<div class="tax__col"><span class="tax__head">' + esc(k) + '</span>' +
          h.taxonomy[k].map(function (x) { return '<span class="tax__leaf">' + esc(x) + '</span>'; }).join('') + '</div>';
      }).join('');
      return '<figure class="poster__fig poster__fig--tax"><div class="tax"><span class="tax__root">X-IDS</span><div class="tax__cols">' + cols + '</div></div>' +
        '<figcaption>' + esc(h.figure) + '</figcaption></figure>';
    }
    if (h.image) {
      return '<figure class="poster__fig"><img src="' + esc(h.image) + '" alt="' + esc(h.figure) + '" width="' + h.width + '" height="' + h.height + '" loading="lazy" decoding="async">' +
        '<figcaption>' + esc(h.figure) + '</figcaption></figure>';
    }
    var topic = h.illustration || (p.topics || []).filter(function (t) { return ART[t]; })[0] || 'security';
    return '<figure class="poster__fig poster__fig--art"><div class="poster__art">' + ART[topic] + '</div>' +
      '<figcaption>' + esc(h.figure || 'Illustration: research area') + '</figcaption></figure>';
  }

  function card(h, p, i) {
    var who = (p.faculty || []).map(function (f) { return FACULTY[f]; }).filter(Boolean);
    var title = h.short || p.title;
    var paper = h.paper || p.url;
    return '<article class="poster reveal" style="--d:' + (i % 3) * 0.06 + 's">' +
      figure(h, p) +
      '<div class="poster__body">' +
        '<div class="poster__meta"><span class="cites"><b>' + fmt(p.cites) + '</b> citations</span><span>' + p.year + '</span></div>' +
        '<h3>' + esc(title) + '</h3>' +
        (h.summary ? '<p>' + esc(h.summary) + '</p>' : '') +
        '<p class="poster__venue">' + esc(p.venue || '') + (who.length ? ' · ' + esc(who.join(', ')) : '') + '</p>' +
        '<div class="poster__links"><a class="link-arrow" href="' + esc(paper) + '" target="_blank" rel="noopener">Read the paper</a>' +
        (paper !== p.url ? '<a class="badge badge--muted" href="' + esc(p.url) + '" target="_blank" rel="noopener">Scholar ↗</a>' : '') + '</div>' +
      '</div></article>';
  }

  Promise.all([
    fetch('assets/data/highlights.json').then(function (r) { return r.json(); }).catch(function () { return { highlights: [] }; }),
    fetch('assets/data/publications.json').then(function (r) { return r.json(); }),
    fetch('assets/data/metrics.json').then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    var fac = (res[2] && res[2].faculty) || {};
    Object.keys(fac).forEach(function (k) { FACULTY[k] = fac[k].name.replace(/^Dr\.\s+/, '').split(' ').slice(1).join(' '); });
    var details = res[0].highlights || [];
    var top = res[1].publications
      .filter(function (p) { return p.type !== 'poster' && p.cites > 0; })
      .sort(function (a, b) { return b.cites - a.cites || b.year - a.year; })
      .slice(0, TOP);
    var items = top.map(function (p) {
      var t = p.title.toLowerCase();
      var h = details.filter(function (d) { return t.indexOf(d.match.toLowerCase()) === 0; })[0] || {};
      return { h: h, p: p };
    });
    mounts.forEach(function (el) {
      var n = parseInt(el.getAttribute('data-limit'), 10) || items.length;
      el.innerHTML = items.slice(0, n).map(function (x, i) { return card(x.h, x.p, i); }).join('');
      if (window.PATENT && window.PATENT.observe) window.PATENT.observe(el.querySelectorAll('.reveal'));
    });
  }).catch(function () {
    mounts.forEach(function (el) { el.innerHTML = ''; });
  });
})();
