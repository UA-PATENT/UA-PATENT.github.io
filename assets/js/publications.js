/* Renders assets/data/publications.json with search, topic and type filters.
   State is mirrored in the URL (?topic=security&type=journal&q=intrusion) so filtered views can be linked. */
(function () {
  'use strict';
  var mount = document.getElementById('pubs');
  if (!mount) return;
  var search = document.getElementById('pub-search');
  var typeSel = document.getElementById('pub-type');
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-topic]'));
  var countEl = document.getElementById('pub-count');

  var TOPIC_LABEL = { security: 'Cybersecurity', healthcare: 'Healthcare', cps: 'Robotics & CPS', vision: 'Vision', xai: 'Explainable AI' };
  var TYPE_LABEL = { journal: 'Journal', conference: 'Conference', workshop: 'Workshop', poster: 'Poster' };

  var params = new URLSearchParams(location.search);
  var state = { topic: params.get('topic') || 'all', type: params.get('type') || 'all', q: params.get('q') || '' };
  var pubs = [], members = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  /* Match people across name styles: "Dr. Noorbakhsh Amiri Golilarz", "N. Amiri Golilarz" and Scholar's "NA Golilarz"
     all reduce to "n golilarz" (first initial + last name). */
  function nameKey(name) {
    var parts = name.replace(/^Dr\.?\s+/, '').replace(/\./g, '').trim().split(/\s+/);
    if (parts.length < 2) return parts[0].toLowerCase();
    return (parts[0].charAt(0) + ' ' + parts[parts.length - 1]).toLowerCase();
  }
  function authors(list) {
    return esc(list).split(', ').map(function (a) { return members.indexOf(nameKey(a)) > -1 ? '<b>' + a + '</b>' : a; }).join(', ');
  }
  function host(url) {
    if (/doi\.org/.test(url)) return 'DOI';
    if (/arxiv\.org/.test(url)) return 'arXiv';
    if (/github\.com/.test(url)) return 'Code';
    if (/scholar\.google/.test(url)) return 'Scholar';
    return 'Link';
  }

  function matches(p) {
    if (state.topic !== 'all' && p.topics.indexOf(state.topic) < 0) return false;
    if (state.type !== 'all' && p.type !== state.type) return false;
    if (state.q) {
      var hay = (p.title + ' ' + (p.authors || '') + ' ' + (p.venue || '') + ' ' + p.year).toLowerCase();
      return state.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
    }
    return true;
  }

  function item(p) {
    var badges = '';
    if (p.award) badges += '<span class="badge badge--award">★ ' + esc(p.award) + '</span>';
    if (p.status) badges += '<span class="badge">' + esc(p.status) + '</span>';
    badges += '<span class="badge badge--muted">' + TYPE_LABEL[p.type] + '</span>';
    p.topics.forEach(function (t) { badges += '<span class="badge badge--muted">' + TOPIC_LABEL[t] + '</span>'; });
    return '<article class="pub">' +
      '<a class="pub__title" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a>' +
      (p.authors ? '<p class="pub__authors">' + authors(p.authors) + '</p>' : '') +
      '<div class="pub__meta">' + (p.venue ? '<span class="pub__venue">' + esc(p.venue) + '</span>' : '') + badges +
        '<a class="badge badge--muted" href="' + esc(p.url) + '" target="_blank" rel="noopener" aria-label="' + host(p.url) + ' for ' + esc(p.title) + '">' + host(p.url) + ' ↗</a>' +
      '</div></article>';
  }

  function render() {
    var list = pubs.filter(matches);
    var years = {};
    list.forEach(function (p) { (years[p.year] = years[p.year] || []).push(p); });
    var html = Object.keys(years).sort(function (a, b) { return b - a; }).map(function (y) {
      return '<section class="pub-year" aria-labelledby="y' + y + '"><h2 id="y' + y + '">' + y + '</h2><div>' + years[y].map(item).join('') + '</div></section>';
    }).join('');
    mount.innerHTML = html || '<p class="empty">No publications match these filters.</p>';
    countEl.textContent = list.length === pubs.length ? pubs.length + ' publications' : list.length + ' of ' + pubs.length + ' publications';

    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.topic === state.topic)); });
    var qs = new URLSearchParams();
    if (state.topic !== 'all') qs.set('topic', state.topic);
    if (state.type !== 'all') qs.set('type', state.type);
    if (state.q) qs.set('q', state.q);
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : ''));
  }

  chips.forEach(function (c) { c.addEventListener('click', function () { state.topic = c.dataset.topic; render(); }); });
  typeSel.value = state.type;
  typeSel.addEventListener('change', function () { state.type = typeSel.value; render(); });
  search.value = state.q;
  var t;
  search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value.trim(); render(); }, 120); });

  Promise.all([
    fetch('assets/data/publications.json').then(function (r) { return r.json(); }),
    fetch('assets/data/people.json').then(function (r) { return r.json(); }).catch(function () { return { people: [] }; })
  ]).then(function (res) {
    pubs = res[0].publications;
    members = res[1].people.map(function (p) { return nameKey(p.name); });
    mount.removeAttribute('aria-busy');
    render();
  }).catch(function () {
    mount.innerHTML = '<p class="empty">Publications could not be loaded. Please refresh the page.</p>';
  });
})();
