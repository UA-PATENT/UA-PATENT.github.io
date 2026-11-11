/* Renders assets/data/people.json into the People page.
   To add or update someone, edit people.json only. See README for the fields. */
(function () {
  'use strict';
  var mount = document.getElementById('people');
  if (!mount) return;

  var ICONS = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 1 9.5l4 2.36v5.3C5 19.3 8.13 21 12 21s7-1.7 7-3.84v-5.3l2-1.18V17h2V9.5L12 3Zm0 2.32 7.06 4.18L12 13.68 4.94 9.5 12 5.32ZM7 13.04l5 2.96 5-2.96v4.07c-.31.62-2.17 1.89-5 1.89s-4.69-1.27-5-1.89v-4.07Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.83v1.5h.06c.53-.95 1.84-1.95 3.79-1.95 4.05 0 4.8 2.53 4.8 5.83v5.62h-4v-4.98c0-1.19-.02-2.72-1.75-2.72-1.75 0-2.02 1.3-2.02 2.63v5.07h-4v-11Z"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
  };

  /* Blank portrait: a neutral head-and-shoulders silhouette that follows the theme colors */
  var BLANK = '<svg viewBox="0 0 200 220" fill="currentColor" aria-hidden="true" preserveAspectRatio="xMidYMax meet"><circle cx="100" cy="78" r="44"/><path d="M14 220c0-52 38-86 86-86s86 34 86 86z"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function portrait(p, eager) {
    if (!p.photo) return '<div class="portrait portrait--blank">' + BLANK + '</div>';
    var b = esc(p.photo);
    return '<div class="portrait"><picture>' +
      '<source type="image/avif" srcset="' + b + '-480.avif 480w, ' + b + '-800.avif 800w" sizes="(max-width: 560px) 90vw, 300px">' +
      '<img src="' + b + '.jpg" alt="Portrait of ' + esc(p.name) + '" width="800" height="1000" decoding="async"' + (eager ? '' : ' loading="lazy"') + '>' +
      '</picture></div>';
  }

  function link(kind, href, name) {
    var labels = { email: 'Email ', scholar: 'Google Scholar profile of ', linkedin: 'LinkedIn profile of ', website: 'Personal website of ' };
    var ext = kind === 'email' ? '' : ' target="_blank" rel="noopener"';
    var url = kind === 'email' ? 'mailto:' + href : href;
    return '<a class="icon-btn" href="' + esc(url) + '"' + ext + ' aria-label="' + labels[kind] + esc(name) + '" title="' + (kind === 'email' ? esc(href) : labels[kind].replace(/ of $/, '')) + '">' + ICONS[kind] + '</a>';
  }

  function card(p, i) {
    var links = ['email', 'scholar', 'linkedin', 'website']
      .filter(function (k) { return p[k]; })
      .map(function (k) { return link(k, p[k], p.name); }).join('');
    return '<li class="person reveal" style="--d:' + (i % 4) * 0.06 + 's">' +
      portrait(p, i < 4) +
      '<div class="person__body">' +
        '<h3 class="person__name">' + esc(p.name) + '</h3>' +
        '<p class="person__role">' + esc(p.role || '') + '</p>' +
        (p.office ? '<p class="person__office">' + esc(p.office) + '</p>' : '') +
        (links ? '<div class="person__links">' + links + '</div>' : '') +
      '</div></li>';
  }

  fetch('assets/data/people.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var html = data.groups.map(function (g) {
        var members = data.people.filter(function (p) { return p.group === g.id; });
        if (!members.length) return '';
        return '<section class="people-group" aria-labelledby="g-' + g.id + '">' +
          '<div class="people-group__head reveal"><h2 id="g-' + g.id + '">' + esc(g.title) + '</h2><span>' + String(members.length).padStart(2, '0') + '</span></div>' +
          '<ul class="people' + (g.id === 'faculty' ? ' people--faculty' : '') + '">' + members.map(card).join('') + '</ul>' +
        '</section>';
      }).join('');
      mount.innerHTML = html;
      mount.removeAttribute('aria-busy');
      if (window.PATENT && window.PATENT.observe) window.PATENT.observe(mount.querySelectorAll('.reveal'));
    })
    .catch(function () {
      mount.innerHTML = '<p class="empty">The team list could not be loaded. Please refresh the page, or email <a href="mailto:cs-patent@ua.edu">cs-patent@ua.edu</a>.</p>';
    });
})();
