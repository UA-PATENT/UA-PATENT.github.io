/* Renders assets/data/publications.json with search, topic, lab, faculty, type filters and sorting.
   State is mirrored in the URL (?topic=security&lab=brains&faculty=mittal&type=journal&sort=cites&q=intrusion)
   so filtered views can be linked. */
(function () {
  'use strict';
  var mount = document.getElementById('pubs');
  if (!mount) return;
  var search = document.getElementById('pub-search');
  var typeSel = document.getElementById('pub-type');
  var facSel = document.getElementById('pub-faculty');
  var sortSel = document.getElementById('pub-sort');
  var labBtn = document.querySelector('[data-lab]');
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-topic]'));
  var countEl = document.getElementById('pub-count');

  var TOPIC_LABEL = { security: 'Cybersecurity', healthcare: 'Healthcare', cps: 'Robotics & CPS', vision: 'Vision', xai: 'Explainable AI' };
  var TYPE_LABEL = { journal: 'Journal', conference: 'Conference', workshop: 'Workshop', poster: 'Poster' };

  var params = new URLSearchParams(location.search);
  var state = {
    topic: params.get('topic') || 'all', type: params.get('type') || 'all', faculty: params.get('faculty') || 'all',
    lab: params.get('lab') || 'all', sort: params.get('sort') || 'year', q: params.get('q') || ''
  };
  var pubs = [], members = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
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
    if (state.faculty !== 'all' && (p.faculty || []).indexOf(state.faculty) < 0) return false;
    if (state.lab !== 'all' && (p.labs || []).indexOf(state.lab) < 0) return false;
    if (state.q) {
      var hay = (p.title + ' ' + (p.authors || '') + ' ' + (p.venue || '') + ' ' + p.year).toLowerCase();
      return state.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
    }
    return true;
  }

  function item(p, showYear) {
    var badges = '';
    if (p.award) badges += '<span class="badge badge--award">★ ' + esc(p.award) + '</span>';
    if (p.status) badges += '<span class="badge">' + esc(p.status) + '</span>';
    if ((p.labs || []).indexOf('brains') > -1) badges += '<span class="badge badge--lab">BRAINS Lab</span>';
    badges += '<span class="badge badge--muted">' + TYPE_LABEL[p.type] + '</span>';
    p.topics.forEach(function (t) { badges += '<span class="badge badge--muted">' + TOPIC_LABEL[t] + '</span>'; });
    var cites = p.cites ? '<span class="pub__cites" title="Google Scholar citations"><b>' + fmt(p.cites) + '</b> cited</span>' : '';
    return '<article class="pub">' +
      '<a class="pub__title" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a>' +
      (p.authors ? '<p class="pub__authors">' + authors(p.authors) + '</p>' : '') +
      '<div class="pub__meta">' + cites + (showYear ? '<span>' + p.year + '</span>' : '') +
        (p.venue ? '<span class="pub__venue">' + esc(p.venue) + '</span>' : '') + badges +
        '<a class="badge badge--muted" href="' + esc(p.url) + '" target="_blank" rel="noopener" aria-label="' + host(p.url) + ' for ' + esc(p.title) + '">' + host(p.url) + ' ↗</a>' +
      '</div></article>';
  }

  function render() {
    var list = pubs.filter(matches);
    var html;
    if (state.sort === 'cites') {
      list = list.slice().sort(function (a, b) { return b.cites - a.cites || b.year - a.year; });
      html = list.length ? '<section class="pub-year pub-year--flat" aria-label="Sorted by citations"><h2>Most cited</h2><div>' + list.map(function (p) { return item(p, true); }).join('') + '</div></section>' : '';
    } else {
      var years = {};
      list.forEach(function (p) { (years[p.year] = years[p.year] || []).push(p); });
      html = Object.keys(years).sort(function (a, b) { return b - a; }).map(function (y) {
        return '<section class="pub-year" aria-labelledby="y' + y + '"><h2 id="y' + y + '">' + y + '</h2><div>' + years[y].map(function (p) { return item(p, false); }).join('') + '</div></section>';
      }).join('');
    }
    mount.innerHTML = html || '<p class="empty">No publications match these filters.</p>';
    countEl.textContent = list.length === pubs.length ? pubs.length + ' publications' : list.length + ' of ' + pubs.length + ' publications';

    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.topic === state.topic)); });
    if (labBtn) labBtn.setAttribute('aria-pressed', String(state.lab === labBtn.dataset.lab));
    var qs = new URLSearchParams();
    ['topic', 'lab', 'faculty', 'type'].forEach(function (k) { if (state[k] !== 'all') qs.set(k, state[k]); });
    if (state.sort !== 'year') qs.set('sort', state.sort);
    if (state.q) qs.set('q', state.q);
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
  }

  chips.forEach(function (c) { c.addEventListener('click', function () { state.topic = c.dataset.topic; render(); }); });
  if (labBtn) labBtn.addEventListener('click', function () { state.lab = state.lab === labBtn.dataset.lab ? 'all' : labBtn.dataset.lab; render(); });
  [[typeSel, 'type'], [facSel, 'faculty'], [sortSel, 'sort']].forEach(function (pair) {
    if (!pair[0]) return;
    pair[0].value = state[pair[1]];
    pair[0].addEventListener('change', function () { state[pair[1]] = pair[0].value; render(); });
  });
  search.value = state.q;
  var t;
  search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value.trim(); render(); }, 120); });

  /* Lab-wide metrics strip */
  function metricsStrip(m) {
    var el = document.getElementById('pub-metrics');
    if (!el || !m.lab) return;
    var cells = [[m.lab.publications, 'Publications since ' + m.since], [m.lab.citations, 'Citations to these papers'],
                 [m.lab.journal, 'Journal articles'], [m.lab.conference, 'Conference papers']];
    el.innerHTML = cells.map(function (c) { return '<div class="stat"><dt>' + c[1] + '</dt><dd>' + fmt(c[0]) + '</dd></div>'; }).join('');
  }

  Promise.all([
    fetch('assets/data/publications.json').then(function (r) { return r.json(); }),
    fetch('assets/data/people.json').then(function (r) { return r.json(); }).catch(function () { return { people: [] }; }),
    fetch('assets/data/metrics.json').then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    pubs = res[0].publications;
    members = res[1].people.map(function (p) { return nameKey(p.name); });
    metricsStrip(res[2]);
    mount.removeAttribute('aria-busy');
    render();
  }).catch(function () {
    mount.innerHTML = '<p class="empty">Publications could not be loaded. Please refresh the page.</p>';
  });
})();
