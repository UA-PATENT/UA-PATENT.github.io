/* PATENT Lab · shared behavior. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle (initial theme is set inline in <head> to avoid a flash) ---------- */
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    var sync = function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    };
    sync();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
  });

  /* ---------- Nav: frosted once scrolled, mobile menu ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScrollNav = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScrollNav();
    window.addEventListener('scroll', onScrollNav, { passive: true });

    var menuBtn = nav.querySelector('.nav__menu');
    if (menuBtn) {
      var setMenu = function (open) {
        nav.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('menu-open')); });
      nav.querySelectorAll('.nav__links a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
      window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
    }
  }

  /* ---------- Hero scroll scene fallback for browsers without scroll-driven animations ---------- */
  var scene = document.querySelector('.hero--scene');
  var nativeScroll = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (scene && !nativeScroll && !reduceMotion) {
    var desktop = window.matchMedia('(min-width: 1024px)');
    var ticking = false;
    var frame = function () {
      ticking = false;
      if (!desktop.matches) { scene.style.removeProperty('--p'); return; }
      var r = scene.getBoundingClientRect();
      var range = scene.offsetHeight - window.innerHeight;
      var p = range > 0 ? Math.min(Math.max(-r.top / range, 0), 1) : 0;
      scene.style.setProperty('--p', p.toFixed(4));
    };
    var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    frame();
  }

  /* ---------- Reveals (CSS does the work natively; this is the fallback and starts line drawings) ---------- */
  var io = ('IntersectionObserver' in window && !reduceMotion) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  var observe = function (els) {
    els.forEach(function (el) { if (io) io.observe(el); else el.classList.add('is-in'); });
  };
  observe(document.querySelectorAll('.reveal'));
  /* Pages that render content from JSON register their new elements here */
  window.PATENT = { observe: observe };

  /* ---------- Count-up stats ---------- */
  var countUp = function (el, to) {
    if (reduceMotion || !('IntersectionObserver' in window)) { el.textContent = to.toLocaleString('en-US') + (el.dataset.suffix || ''); return; }
    var obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      var t0 = performance.now(), dur = 1400;
      var step = function (t) {
        var k = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(to * eased).toLocaleString('en-US') + (el.dataset.suffix || '');
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: .6 });
    obs.observe(el);
  };
  document.querySelectorAll('[data-count]').forEach(function (el) { countUp(el, parseInt(el.dataset.count, 10)); });

  /* Live counts from the data files, so the numbers never go stale */
  var pubCount = document.querySelector('[data-count-pubs]');
  if (pubCount && window.fetch) {
    fetch('assets/data/publications.json').then(function (r) { return r.json(); }).then(function (d) {
      countUp(pubCount, d.publications.length);
    }).catch(function () {});
  }
  var citeCount = document.querySelector('[data-count-citations]');
  if (citeCount && window.fetch) {
    fetch('assets/data/metrics.json').then(function (r) { return r.json(); }).then(function (d) {
      countUp(citeCount, d.lab.citations);
    }).catch(function () {});
  }
  var memberCount = document.querySelector('[data-count-members]');
  if (memberCount && window.fetch) {
    fetch('assets/data/people.json').then(function (r) { return r.json(); }).then(function (d) {
      countUp(memberCount, d.people.length);
    }).catch(function () {});
  }

  /* ---------- Horizontal rail buttons ---------- */
  document.querySelectorAll('[data-rail]').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail');
    var prev = wrap.querySelector('[data-rail-prev]');
    var next = wrap.querySelector('[data-rail-next]');
    if (!rail || !prev || !next) return;
    var by = function () { var c = rail.querySelector('.card'); return c ? c.getBoundingClientRect().width + 18 : 400; };
    var update = function () {
      prev.disabled = rail.scrollLeft < 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    };
    prev.addEventListener('click', function () { rail.scrollBy({ left: -by(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: by(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- Research sub-nav: highlight the section in view ---------- */
  var subLinks = document.querySelectorAll('.subnav a[href^="#"]');
  if (subLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    subLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        subLinks.forEach(function (a) { a.classList.remove('is-active'); });
        var a = map[en.target.id];
        if (a) {
          a.classList.add('is-active');
          /* scroll only the pill row sideways; scrollIntoView would also nudge the page */
          var row = a.closest('ul');
          if (row && row.scrollWidth > row.clientWidth) row.scrollTo({ left: a.offsetLeft - 24, behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
