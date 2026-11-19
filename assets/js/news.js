/* Lab news as headlines, from assets/data/news.json.
   - [data-news-page]: every item, grouped by year (the archive), with type filters mirrored in the URL (?type=grant).
   - [data-news-latest]: the newest items, data-limit of them (default 5), from the past data-max-age-days (default 365).
     The surrounding [data-news-section] stays hidden when there is nothing recent to show. */
(function () {
  'use strict';
  var page = document.querySelector('[data-news-page]');
  var latest = document.querySelectorAll('[data-news-latest]');
  if (!page && !latest.length) return;

  var TYPE = { talk: 'Talk', grant: 'Grant', award: 'Award', paper: 'Paper accepted', media: 'In the news', people: 'People', event: 'Event', other: 'Announcement' };
  var ORDER = ['award', 'grant', 'talk', 'paper', 'media', 'people', 'event', 'other'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  /* "2026-11-19" or "2026-11" -> parts. A month-only date sorts below the dated items of that month. */
  function parse(d) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], day = m[3] ? +m[3] : 0;
    return { y: y, m: mo, d: day, key: y * 10000 + mo * 100 + day, time: new Date(y, mo - 1, day || 15).getTime() };
  }
  function label(p, withYear) {
    var s = MONTHS[p.m - 1] + (p.d ? ' ' + p.d : '');
    return withYear ? s + (p.d ? ', ' : ' ') + p.y : s;
  }
  function source(n) {
    if (n.source) return n.source;
    if (!n.link || !/^https?:/i.test(n.link)) return 'PATENT Lab';
    var h = n.link.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].toLowerCase();
    if (/linkedin\.com$/.test(h)) return 'LinkedIn';
    if (/nsf\.gov$/.test(h)) return 'National Science Foundation';
    if (/news\.ua\.edu$/.test(h)) return 'UA News';
    if (/msstate\.edu$/.test(h)) return 'Mississippi State University';
    if (/ua\.edu$/.test(h)) return 'The University of Alabama';
    return h;
  }
  function item(n, withYear) {
    var ext = n.link && /^https?:/i.test(n.link);
    var head = n.link
      ? '<a class="news-item__headline" href="' + esc(n.link) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(n.headline) + '</a>'
      : '<span class="news-item__headline">' + esc(n.headline) + '</span>';
    return '<li class="news-item"><time class="news-item__date" datetime="' + esc(n.date) + '">' + label(n._p, withYear) + '</time>' +
      '<div class="news-item__body"><span class="news-item__type">' + (TYPE[n.type] || TYPE.other) + '</span>' + head +
      '<span class="news-item__source">' + esc(source(n)) + '</span></div></li>';
  }

  function renderLatest(items) {
    latest.forEach(function (el) {
      var limit = parseInt(el.getAttribute('data-limit'), 10) || 5;
      var maxAge = (parseInt(el.getAttribute('data-max-age-days'), 10) || 365) * 864e5;
      var now = Date.now();
      var list = items.filter(function (n) { return now - n._p.time <= maxAge; }).slice(0, limit);
      var section = el.closest('[data-news-section]');
      if (!list.length) { if (section) section.hidden = true; return; }
      el.innerHTML = list.map(function (n) { return item(n, true); }).join('');
      if (section) section.hidden = false;
    });
  }

  function renderPage(items) {
    var chipsEl = page.querySelector('[data-news-chips]');
    var mount = page.querySelector('[data-news-list]');
    var count = page.querySelector('[data-news-count]');
    var types = ORDER.filter(function (t) { return items.some(function (n) { return n.type === t; }); });
    var state = new URLSearchParams(location.search).get('type') || 'all';
    if (state !== 'all' && types.indexOf(state) < 0) state = 'all';

    chipsEl.innerHTML = ['all'].concat(types).map(function (t) {
      return '<button class="chip" type="button" data-news-type="' + t + '" aria-pressed="false">' + (t === 'all' ? 'All' : TYPE[t]) + '</button>';
    }).join('');
    var chips = Array.prototype.slice.call(chipsEl.querySelectorAll('[data-news-type]'));

    function render() {
      var list = items.filter(function (n) { return state === 'all' || n.type === state; });
      var years = {};
      list.forEach(function (n) { (years[n._p.y] = years[n._p.y] || []).push(n); });
      mount.innerHTML = Object.keys(years).sort(function (a, b) { return b - a; }).map(function (y) {
        return '<section class="pub-year" aria-labelledby="news-y' + y + '"><h2 id="news-y' + y + '">' + y + '</h2>' +
          '<ul class="news-list">' + years[y].map(function (n) { return item(n, false); }).join('') + '</ul></section>';
      }).join('') || '<p class="empty">No news of this type yet.</p>';
      count.textContent = list.length === items.length ? items.length + ' news items' : list.length + ' of ' + items.length + ' news items';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-news-type') === state)); });
      history.replaceState(null, '', location.pathname + (state !== 'all' ? '?type=' + state : '') + location.hash);
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { state = c.getAttribute('data-news-type'); render(); }); });
    mount.removeAttribute('aria-busy');
    render();
  }

  fetch('assets/data/news.json').then(function (r) { return r.json(); }).then(function (data) {
    var items = (data.news || []).filter(function (n) { return n.headline && (n._p = parse(n.date)); })
      .sort(function (a, b) { return b._p.key - a._p.key; });
    if (latest.length) renderLatest(items);
    if (page) renderPage(items);
  }).catch(function () {
    if (page) page.querySelector('[data-news-list]').innerHTML = '<p class="empty">News could not be loaded. Please refresh the page.</p>';
  });
})();
