/* Small live simulations for the research areas. Any element with data-sim="security|healthcare|cps|vision|training"
   gets a canvas. The SVG inside the element is the fallback when JavaScript is off.
   Runs only while visible, pauses in background tabs, and draws a single still frame when the visitor prefers reduced motion. */
(function () {
  'use strict';
  if (!window.requestAnimationFrame || !document.createElement('canvas').getContext) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var C = {};
  function readColors() {
    var cs = getComputedStyle(root);
    var v = function (n, d) { return (cs.getPropertyValue(n) || '').trim() || d; };
    C = { text: v('--text', '#f6f0f0'), muted: v('--muted', '#aeb5b9'), accent: v('--accent', '#f4919f'), border: v('--border-strong', 'rgba(255,255,255,.18)'),
          faint: v('--border', 'rgba(255,255,255,.09)'), bg: v('--bg', '#0c090a'), crimson: '#9e1b32', gray: '#828a8f', brains: v('--brains', '#8fd3ff'),
          dark: root.getAttribute('data-theme') !== 'light' };
  }
  readColors();

  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (a) { return a[(Math.random() * a.length) | 0]; };
  var font = function (px, w) { return (w || 600) + ' ' + px + 'px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", sans-serif'; };
  function alpha(hexOrRgb, a) {
    if (hexOrRgb[0] === '#') {
      var n = parseInt(hexOrRgb.slice(1), 16);
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    return hexOrRgb;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function label(ctx, txt, x, y, px, color, align) { ctx.font = font(px); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); }

  /* ------------------------------------------------------------------ Cybersecurity: explainable IDS */
  function Security() {
    this.t = 0; this.packets = []; this.bursts = []; this.spawn = 0; this.inspected = 0; this.blocked = 0; this.explain = null;
    this.attacks = [
      { name: 'Port scan', f: [['dst-port entropy', .58], ['SYN rate', .27], ['packet size', .15]] },
      { name: 'Brute force', f: [['failed logins', .64], ['source rate', .22], ['session length', .14]] },
      { name: 'Exfiltration', f: [['bytes out', .55], ['rare destination', .30], ['time of day', .15]] },
      { name: 'C2 beacon', f: [['periodicity', .61], ['DNS entropy', .26], ['payload size', .13]] }
    ];
  }
  Security.prototype.resize = function (w, h) {
    this.w = w; this.h = h; this.hub = { x: w * .5, y: h * .5 };
    var n = 7; this.hosts = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      this.hosts.push({ x: w * .5 + Math.cos(a) * w * .38, y: h * .5 + Math.sin(a) * h * .36, ext: i === 0 });
    }
  };
  Security.prototype.step = function (dt) {
    this.t += dt; this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = rand(.08, .22);
      var bad = Math.random() < .13, s, d;
      s = bad && Math.random() < .7 ? 0 : (Math.random() * this.hosts.length) | 0;
      do { d = (Math.random() * this.hosts.length) | 0; } while (d === s);
      this.packets.push({ s: s, d: d, p: 0, leg: 0, bad: bad, v: rand(.7, 1.1) });
    }
    for (var i = this.packets.length - 1; i >= 0; i--) {
      var k = this.packets[i]; k.p += dt * k.v * 1.1;
      if (k.p >= 1) {
        if (k.leg === 0) {
          this.inspected++;
          if (k.bad) {
            this.blocked++; this.bursts.push({ r: 0, a: 1 });
            var at = pick(this.attacks); this.explain = { a: at, life: 2.6 };
            this.packets.splice(i, 1); continue;
          }
          k.leg = 1; k.p = 0;
        } else { this.packets.splice(i, 1); continue; }
      }
    }
    this.bursts.forEach(function (b) { b.r += dt * 60; b.a -= dt * 1.4; });
    this.bursts = this.bursts.filter(function (b) { return b.a > 0; });
    if (this.explain) { this.explain.life -= dt; if (this.explain.life <= 0) this.explain = null; }
  };
  Security.prototype.draw = function (ctx, w, h) {
    var hub = this.hub, self = this, big = w > 320 && !this.compact;
    ctx.lineWidth = 1; ctx.strokeStyle = C.faint;
    this.hosts.forEach(function (o) { ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(hub.x, hub.y); ctx.stroke(); });
    this.packets.forEach(function (k) {
      var a = k.leg === 0 ? self.hosts[k.s] : hub, b = k.leg === 0 ? hub : self.hosts[k.d];
      var x = a.x + (b.x - a.x) * k.p, y = a.y + (b.y - a.y) * k.p;
      ctx.beginPath(); ctx.arc(x, y, k.bad ? 3.6 : 2.3, 0, 7);
      ctx.fillStyle = k.bad ? C.accent : alpha(C.dark ? '#ffffff' : '#1c1214', .55); ctx.fill();
      if (k.bad) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fillStyle = alpha(C.crimson, .25); ctx.fill(); }
    });
    this.hosts.forEach(function (o) {
      var s = big ? 14 : 10;
      rr(ctx, o.x - s / 2, o.y - s / 2, s, s, 3); ctx.fillStyle = o.ext ? alpha(C.gray, .9) : (C.dark ? '#2a2e31' : '#e6e8ea'); ctx.fill();
      ctx.strokeStyle = C.border; ctx.stroke();
      if (big) label(ctx, o.ext ? 'internet' : '', o.x, o.y - s - 4, 9, C.muted, 'center');
    });
    this.bursts.forEach(function (b) { ctx.beginPath(); ctx.arc(hub.x, hub.y, 14 + b.r, 0, 7); ctx.strokeStyle = alpha(C.crimson, b.a); ctx.lineWidth = 2; ctx.stroke(); });
    var R = big ? 20 : 15;
    ctx.beginPath(); ctx.arc(hub.x, hub.y, R, 0, 7); ctx.fillStyle = C.crimson; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = alpha('#ffffff', .85); ctx.stroke();
    label(ctx, 'IDS', hub.x, hub.y + 1, big ? 10 : 8, '#fff', 'center');
    if (big) label(ctx, 'inspected ' + this.inspected.toLocaleString() + ' · blocked ' + this.blocked, 12, h - 14, 10, C.muted);
    if (this.explain && w > 220 && !this.compact) {
      var e = this.explain, a = Math.min(1, e.life * 2), pw = Math.min(170, w * .5), px = w - pw - 10, py = 10;
      ctx.globalAlpha = a;
      rr(ctx, px, py, pw, 66, 8); ctx.fillStyle = C.dark ? 'rgba(20,16,17,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
      label(ctx, 'Blocked · ' + e.a.name, px + 9, py + 12, 10, C.accent);
      e.a.f.forEach(function (f, i) {
        var y = py + 28 + i * 12;
        label(ctx, f[0], px + 9, y, 8.5, C.muted);
        rr(ctx, px + pw * .55, y - 3, (pw * .4) * f[1] / .7, 6, 3); ctx.fillStyle = alpha(C.crimson, .9); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  };

  /* ------------------------------------------------------------------ Healthcare: ECG with arrhythmia detection */
  function Health() { this.t = 0; this.beats = []; this.next = 0; this.risk = .1; this.flags = 0; this.speed = 110; }
  function g(x, m, s) { return Math.exp(-((x - m) * (x - m)) / (2 * s * s)); }
  Health.prototype.resize = function (w, h) { this.w = w; this.h = h; };
  Health.prototype.ensure = function (until) {
    while (this.next < until) {
      var last = this.beats[this.beats.length - 1];
      var pvc = last && last.type === 'n' && Math.random() < .16;
      var dur = pvc ? rand(.5, .58) : (last && last.type === 'pvc' ? rand(1.0, 1.1) : rand(.76, .86));
      this.beats.push({ t0: this.next, dur: dur, type: pvc ? 'pvc' : 'n', conf: rand(.88, .99), counted: false });
      this.next += dur;
    }
    while (this.beats.length > 40) this.beats.shift();
  };
  Health.prototype.value = function (time) {
    for (var i = this.beats.length - 1; i >= 0; i--) {
      var b = this.beats[i];
      if (time >= b.t0 && time < b.t0 + b.dur) {
        var x = (time - b.t0) / b.dur;
        if (b.type === 'pvc') return { v: 1.15 * g(x, .34, .045) - .55 * g(x, .5, .05) - .32 * g(x, .78, .07), b: b };
        return { v: .12 * g(x, .18, .03) - .12 * g(x, .37, .012) + 1 * g(x, .405, .013) - .25 * g(x, .44, .014) + .3 * g(x, .68, .05), b: b };
      }
    }
    return { v: 0, b: null };
  };
  Health.prototype.step = function (dt) {
    this.t += dt; this.ensure(this.t + 1);
    var self = this;
    this.beats.forEach(function (b) { if (!b.counted && b.type === 'pvc' && self.t > b.t0 + b.dur * .6) { b.counted = true; self.flags++; self.risk = Math.min(.98, self.risk + .28); } });
    this.risk = Math.max(.06, this.risk - dt * .05);
  };
  Health.prototype.draw = function (ctx, w, h) {
    var mid = h * .58, amp = h * .3, sp = this.speed, big = w > 320 && !this.compact, x, i;
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1;
    var gs = Math.max(14, w / 22);
    for (x = (-(this.t * sp) % gs + gs) % gs; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y = mid % gs; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    var seen = [];
    var prev = null;
    ctx.lineWidth = big ? 2 : 1.6; ctx.lineJoin = 'round';
    for (x = 0; x <= w; x += 2) {
      var time = this.t - (w - x) / sp, r = this.value(time), yy = mid - r.v * amp;
      var bad = r.b && r.b.type === 'pvc';
      if (bad && seen.indexOf(r.b) < 0) seen.push(r.b);
      if (prev) { ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, yy); ctx.strokeStyle = bad ? C.accent : (C.dark ? '#e9eef0' : '#1c1214'); ctx.stroke(); }
      prev = [x, yy];
    }
    var self = this;
    seen.forEach(function (b) {
      var x0 = w - (self.t - b.t0) * sp, x1 = x0 + b.dur * sp;
      ctx.fillStyle = alpha(C.crimson, .14); ctx.fillRect(x0, 4, x1 - x0, h - 8);
      if (big && x0 > 0 && x0 < w - 60) label(ctx, 'PVC · ' + b.conf.toFixed(2), x0 + 4, 14, 9.5, C.accent);
    });
    // the pen tip
    var tip = this.value(this.t);
    ctx.beginPath(); ctx.arc(w - 1, mid - tip.v * amp, 3.5, 0, 7); ctx.fillStyle = C.accent; ctx.fill();
    if (big) {
      var mw = 110, mx = w - mw - 12, my = h - 20;
      label(ctx, 'arrhythmia risk', mx, my - 10, 9, C.muted);
      rr(ctx, mx, my - 2, mw, 6, 3); ctx.fillStyle = C.faint; ctx.fill();
      rr(ctx, mx, my - 2, mw * this.risk, 6, 3); ctx.fillStyle = C.crimson; ctx.fill();
      label(ctx, 'HR ' + Math.round(60 / .81) + ' bpm · flagged ' + this.flags, 12, h - 14, 10, C.muted);
    }
  };

  /* ------------------------------------------------------------------ Robotics: A* planning with replanning */
  function Robot() { this.state = 'plan'; this.timer = 0; this.replans = 0; this.trail = []; }
  Robot.prototype.resize = function (w, h) {
    var cols = w > 320 ? 18 : 14, rows = Math.max(8, Math.round(cols * h / w));
    if (this.cols !== cols || this.rows !== rows) { this.cols = cols; this.rows = rows; this.reset(); }
    this.cell = Math.min(w / cols, h / rows); this.ox = (w - this.cell * cols) / 2; this.oy = (h - this.cell * rows) / 2;
  };
  Robot.prototype.reset = function () {
    var c = this.cols, r = this.rows;
    this.grid = []; for (var i = 0; i < c * r; i++) this.grid.push(Math.random() < .22 ? 1 : 0);
    this.pos = { x: 1, y: r - 2 }; this.grid[this.idx(1, r - 2)] = 0;
    this.newGoal();
  };
  Robot.prototype.idx = function (x, y) { return y * this.cols + x; };
  Robot.prototype.newGoal = function () {
    var tries = 0;
    do { this.goal = { x: (Math.random() * this.cols) | 0, y: (Math.random() * this.rows) | 0 }; tries++; }
    while ((this.grid[this.idx(this.goal.x, this.goal.y)] || Math.abs(this.goal.x - this.pos.x) + Math.abs(this.goal.y - this.pos.y) < 8) && tries < 200);
    this.plan();
  };
  Robot.prototype.astar = function (s, gl) {
    var c = this.cols, r = this.rows, self = this, open = [s], came = {}, gs = {}, explored = [];
    var k = function (p) { return p.x + ',' + p.y; }, hf = function (p) { return Math.abs(p.x - gl.x) + Math.abs(p.y - gl.y); };
    gs[k(s)] = 0;
    while (open.length) {
      open.sort(function (a, b) { return (gs[k(a)] + hf(a)) - (gs[k(b)] + hf(b)); });
      var cur = open.shift(); explored.push(cur);
      if (cur.x === gl.x && cur.y === gl.y) {
        var path = [cur]; while (came[k(path[0])]) path.unshift(came[k(path[0])]);
        return { path: path, explored: explored };
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var n = { x: cur.x + d[0], y: cur.y + d[1] };
        if (n.x < 0 || n.y < 0 || n.x >= c || n.y >= r || self.grid[self.idx(n.x, n.y)]) return;
        var t = gs[k(cur)] + 1;
        if (gs[k(n)] === undefined || t < gs[k(n)]) { gs[k(n)] = t; came[k(n)] = cur; if (!open.some(function (o) { return o.x === n.x && o.y === n.y; })) open.push(n); }
      });
    }
    return { path: null, explored: explored };
  };
  Robot.prototype.plan = function () {
    var res = this.astar({ x: this.pos.x, y: this.pos.y }, this.goal);
    if (!res.path) { this.grid[this.idx(this.goal.x, this.goal.y)] = 0; this.reset(); return; }
    this.path = res.path; this.explored = res.explored; this.reveal = 0; this.state = 'plan'; this.prog = 0;
  };
  Robot.prototype.step = function (dt) {
    if (this.flash) this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'plan') { this.reveal += dt * this.explored.length * 1.6; if (this.reveal >= this.explored.length) this.state = 'move'; return; }
    if (this.state === 'wait') { this.timer -= dt; if (this.timer <= 0) this.newGoal(); return; }
    this.prog += dt * 4.2;
    while (this.prog >= 1 && this.path.length > 1) {
      this.prog -= 1; this.path.shift(); this.pos = { x: this.path[0].x, y: this.path[0].y };
      this.trail.push({ x: this.pos.x, y: this.pos.y, a: 1 });
      if (this.path.length > 4 && Math.random() < .07) {          // something appears in the way
        var b = this.path[2 + ((Math.random() * 2) | 0)];
        if (!(b.x === this.goal.x && b.y === this.goal.y)) { this.grid[this.idx(b.x, b.y)] = 1; this.replans++; this.flash = 1.2; this.plan(); return; }
      }
    }
    if (this.path.length <= 1) { this.state = 'wait'; this.timer = .7; }
    this.trail.forEach(function (p) { p.a -= dt * .5; }); this.trail = this.trail.filter(function (p) { return p.a > 0; });
  };
  Robot.prototype.draw = function (ctx, w, h) {
    var s = this.cell, ox = this.ox, oy = this.oy, self = this, x, y;
    for (y = 0; y < this.rows; y++) for (x = 0; x < this.cols; x++) {
      if (this.grid[this.idx(x, y)]) { rr(ctx, ox + x * s + 1, oy + y * s + 1, s - 2, s - 2, 3); ctx.fillStyle = C.dark ? '#33383c' : '#cfd4d7'; ctx.fill(); }
      else { ctx.fillStyle = C.faint; ctx.fillRect(ox + x * s + s / 2 - .75, oy + y * s + s / 2 - .75, 1.5, 1.5); }
    }
    var n = Math.min(this.explored.length, Math.floor(this.reveal));
    for (var i = 0; i < n; i++) { var e = this.explored[i]; ctx.fillStyle = alpha(C.crimson, this.state === 'plan' ? .22 : .08); ctx.fillRect(ox + e.x * s + 2, oy + e.y * s + 2, s - 4, s - 4); }
    this.trail.forEach(function (p) { ctx.beginPath(); ctx.arc(ox + p.x * s + s / 2, oy + p.y * s + s / 2, s * .12, 0, 7); ctx.fillStyle = alpha(C.gray, p.a * .8); ctx.fill(); });
    if (this.state !== 'plan' && this.path.length > 1) {
      ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeStyle = C.accent;
      this.path.forEach(function (p, j) { var px = ox + p.x * s + s / 2, py = oy + p.y * s + s / 2; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    var gx = ox + this.goal.x * s + s / 2, gy = oy + this.goal.y * s + s / 2, pulse = (Date.now() % 1200) / 1200;
    ctx.beginPath(); ctx.arc(gx, gy, s * (.3 + pulse * .35), 0, 7); ctx.strokeStyle = alpha(C.crimson, 1 - pulse); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(gx, gy, s * .22, 0, 7); ctx.fillStyle = C.crimson; ctx.fill();
    var nx = this.path && this.path[1] ? this.path[1] : this.pos, f = this.state === 'move' ? Math.min(this.prog, 1) : 0;
    var rx = ox + (this.pos.x + (nx.x - this.pos.x) * f) * s + s / 2, ry = oy + (this.pos.y + (nx.y - this.pos.y) * f) * s + s / 2;
    ctx.beginPath(); ctx.arc(rx, ry, s * .36, 0, 7); ctx.fillStyle = C.dark ? '#f6f0f0' : '#1c1214'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx, ry, s * .14, 0, 7); ctx.fillStyle = C.crimson; ctx.fill();
    if (w > 320 && !this.compact) {
      label(ctx, 'A* planner · replans ' + this.replans, ox + 4, oy + this.rows * s - 10 > h - 16 ? h - 12 : oy + this.rows * s + 10, 10, C.muted);
      if (this.flash) { ctx.globalAlpha = Math.min(1, this.flash * 1.5); label(ctx, 'Obstacle detected · replanning', w - 12, 14, 10, C.accent, 'right'); ctx.globalAlpha = 1; }
    }
  };

  /* ------------------------------------------------------------------ Vision: detection and tracking */
  function Vision() { this.t = 0; this.frame = 0; }
  Vision.prototype.resize = function (w, h) {
    this.w = w; this.h = h;
    if (this.objs) return;
    var classes = ['person', 'robot', 'drone', 'vehicle', 'person'];
    this.objs = classes.map(function (c) {
      var size = { person: [.09, .26], robot: [.13, .2], drone: [.14, .09], vehicle: [.22, .14] }[c];
      return { c: c, w: size[0], h: size[1], x: rand(.1, .8), y: rand(.15, .7), vx: rand(-.07, .07) || .05, vy: rand(-.04, .04),
               bx: 0, by: 0, bw: 0, bh: 0, conf: rand(.9, .99) };
    });
    this.objs.forEach(function (o) { o.bx = o.x; o.by = o.y; o.bw = o.w; o.bh = o.h; });
  };
  Vision.prototype.step = function (dt) {
    this.t += dt; this.frame += 1;
    this.objs.forEach(function (o) {
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.x < .02 || o.x + o.w > .98) o.vx *= -1;
      if (o.y < .06 || o.y + o.h > .94) o.vy *= -1;
      if (o.c === 'drone') o.y += Math.sin(Date.now() / 400 + o.w * 99) * .0015;
      var k = Math.min(1, dt * 8);
      o.bx += (o.x - o.bx) * k; o.by += (o.y - o.by) * k; o.bw += (o.w - o.bw) * k; o.bh += (o.h - o.bh) * k;
      if (Math.random() < dt * 2) o.conf = Math.min(.99, Math.max(.82, o.conf + rand(-.03, .03)));
    });
  };
  Vision.prototype.draw = function (ctx, w, h) {
    var sil = C.dark ? '#565e63' : '#aab1b5', self = this, big = w > 320 && !this.compact;
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1;
    for (var gy = h * .7; gy < h; gy += h * .06) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
    this.objs.forEach(function (o) {
      var x = o.x * w, y = o.y * h, ow = o.w * w, oh = o.h * h;
      ctx.fillStyle = sil;
      if (o.c === 'person') { ctx.beginPath(); ctx.arc(x + ow / 2, y + oh * .14, ow * .28, 0, 7); ctx.fill(); rr(ctx, x + ow * .2, y + oh * .3, ow * .6, oh * .7, ow * .25); ctx.fill(); }
      else if (o.c === 'robot') { rr(ctx, x + ow * .15, y + oh * .25, ow * .7, oh * .55, 5); ctx.fill(); rr(ctx, x + ow * .3, y, ow * .4, oh * .28, 4); ctx.fill(); ctx.fillRect(x + ow * .2, y + oh * .8, ow * .15, oh * .2); ctx.fillRect(x + ow * .65, y + oh * .8, ow * .15, oh * .2); }
      else if (o.c === 'drone') { ctx.fillRect(x + ow * .1, y + oh * .45, ow * .8, oh * .14); [.12, .88].forEach(function (p) { ctx.beginPath(); ctx.ellipse(x + ow * p, y + oh * .35, ow * .14, oh * .12, 0, 0, 7); ctx.fill(); }); rr(ctx, x + ow * .38, y + oh * .4, ow * .24, oh * .45, 4); ctx.fill(); }
      else { rr(ctx, x, y + oh * .3, ow, oh * .5, 7); ctx.fill(); rr(ctx, x + ow * .2, y, ow * .55, oh * .4, 6); ctx.fill(); ctx.fillStyle = C.dark ? '#2a2e31' : '#e6e8ea'; [.22, .78].forEach(function (p) { ctx.beginPath(); ctx.arc(x + ow * p, y + oh * .85, oh * .15, 0, 7); ctx.fill(); }); }
    });
    var sx = (this.t * .35 % 1.2 - .1) * w, grad = ctx.createLinearGradient(sx - 40, 0, sx, 0);
    grad.addColorStop(0, 'rgba(158,27,50,0)'); grad.addColorStop(1, 'rgba(158,27,50,.18)');
    ctx.fillStyle = grad; ctx.fillRect(sx - 40, 0, 40, h);
    this.objs.forEach(function (o) {
      var x = o.bx * w - 3, y = o.by * h - 3, bw = o.bw * w + 6, bh = o.bh * h + 6, c = Math.min(bw, bh) * .25;
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
      ctx.moveTo(x + bw - c, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + c);
      ctx.moveTo(x + bw, y + bh - c); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw - c, y + bh);
      ctx.moveTo(x + c, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh - c); ctx.stroke();
      ctx.strokeStyle = alpha(C.crimson, .35); ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh);
      if (big) {
        var txt = o.c + ' ' + o.conf.toFixed(2); ctx.font = font(9.5); var tw = ctx.measureText(txt).width + 8;
        rr(ctx, x, y - 15, tw, 13, 3); ctx.fillStyle = C.crimson; ctx.fill(); label(ctx, txt, x + 4, y - 8.5, 9.5, '#fff');
      }
    });
    if (big) label(ctx, 'frame ' + this.frame + ' · 30 fps · ' + this.objs.length + ' objects', 12, h - 12, 10, C.muted);
  };

  /* ------------------------------------------------------------------ AI/ML: a small neural network training live */
  function Training() { this.ds = 0; this.newRun(); }
  Training.prototype.data = function () {
    var pts = [], n = 150, i, t, kind = ['moons', 'circles', 'xor', 'spiral'][this.ds++ % 4];
    for (i = 0; i < n; i++) {
      var y = i % 2, x1, x2;
      if (kind === 'moons') { t = Math.random() * Math.PI; x1 = y ? 1 - Math.cos(t) - .5 : Math.cos(t) - .5; x2 = y ? .3 - Math.sin(t) * .9 + .25 : Math.sin(t) * .9 - .35; x1 *= .7; x2 *= .9; }
      else if (kind === 'circles') { t = Math.random() * 7; var r = y ? rand(.0, .35) : rand(.55, .85); x1 = Math.cos(t) * r; x2 = Math.sin(t) * r; }
      else if (kind === 'xor') { x1 = rand(-.85, .85); x2 = rand(-.85, .85); y = (x1 * x2 > 0) ? 1 : 0; if (Math.abs(x1) < .08 || Math.abs(x2) < .08) { i--; continue; } }
      else { t = Math.random() * 3.2; var rr2 = t / 3.6 + .05; var a = t * 1.9 + (y ? Math.PI : 0); x1 = Math.cos(a) * rr2; x2 = Math.sin(a) * rr2; }
      pts.push([x1 + rand(-.04, .04), x2 + rand(-.04, .04), y]);
    }
    this.kind = kind; return pts;
  };
  Training.prototype.newRun = function () {
    var H1 = 12, H2 = 10, init = function (r, c) { var m = [], s = Math.sqrt(2 / (r + c)); for (var i = 0; i < r * c; i++) m.push(rand(-1, 1) * s * 1.6); return m; };
    this.H1 = H1; this.H2 = H2;
    this.P = { W1: init(H1, 2), b1: new Array(H1).fill(0), W2: init(H2, H1), b2: new Array(H2).fill(0), W3: init(1, H2), b3: [0] };
    this.M = {}; this.V = {}; var self = this;
    Object.keys(this.P).forEach(function (k) { self.M[k] = self.P[k].map(function () { return 0; }); self.V[k] = self.P[k].map(function () { return 0; }); });
    this.pts = this.data(); this.epoch = 0; this.loss = []; this.acc = 0; this.done = 0; this.it = 0;
  };
  Training.prototype.forward = function (x1, x2, keep) {
    var P = this.P, H1 = this.H1, H2 = this.H2, a1 = [], a2 = [], i, j, s;
    for (i = 0; i < H1; i++) a1.push(Math.tanh(P.W1[i * 2] * x1 + P.W1[i * 2 + 1] * x2 + P.b1[i]));
    for (i = 0; i < H2; i++) { s = P.b2[i]; for (j = 0; j < H1; j++) s += P.W2[i * H1 + j] * a1[j]; a2.push(Math.tanh(s)); }
    s = P.b3[0]; for (j = 0; j < H2; j++) s += P.W3[j] * a2[j];
    var o = 1 / (1 + Math.exp(-s));
    return keep ? { a1: a1, a2: a2, o: o } : o;
  };
  Training.prototype.train = function () {
    var P = this.P, H1 = this.H1, H2 = this.H2, G = {}, k, i, j, n = this.pts.length, L = 0, correct = 0;
    Object.keys(P).forEach(function (q) { G[q] = P[q].map(function () { return 0; }); });
    for (var p = 0; p < n; p++) {
      var x1 = this.pts[p][0], x2 = this.pts[p][1], y = this.pts[p][2], f = this.forward(x1, x2, true);
      L += -(y * Math.log(f.o + 1e-9) + (1 - y) * Math.log(1 - f.o + 1e-9)); if ((f.o > .5) === (y === 1)) correct++;
      var d3 = f.o - y, d2 = [], d1 = [];
      for (j = 0; j < H2; j++) { G.W3[j] += d3 * f.a2[j]; d2.push(d3 * P.W3[j] * (1 - f.a2[j] * f.a2[j])); }
      G.b3[0] += d3;
      for (i = 0; i < H2; i++) { for (j = 0; j < H1; j++) G.W2[i * H1 + j] += d2[i] * f.a1[j]; G.b2[i] += d2[i]; }
      for (j = 0; j < H1; j++) { var s = 0; for (i = 0; i < H2; i++) s += d2[i] * P.W2[i * H1 + j]; d1.push(s * (1 - f.a1[j] * f.a1[j])); }
      for (i = 0; i < H1; i++) { G.W1[i * 2] += d1[i] * x1; G.W1[i * 2 + 1] += d1[i] * x2; G.b1[i] += d1[i]; }
    }
    this.it++; var lr = .03, b1 = .9, b2 = .999, it = this.it, M = this.M, V = this.V;
    for (k in P) for (i = 0; i < P[k].length; i++) {
      var gr = G[k][i] / n; M[k][i] = b1 * M[k][i] + (1 - b1) * gr; V[k][i] = b2 * V[k][i] + (1 - b2) * gr * gr;
      P[k][i] -= lr * (M[k][i] / (1 - Math.pow(b1, it))) / (Math.sqrt(V[k][i] / (1 - Math.pow(b2, it))) + 1e-8);
    }
    this.epoch++; this.acc = correct / n; this.loss.push(L / n); if (this.loss.length > 240) this.loss.shift();
  };
  Training.prototype.resize = function (w, h) { this.w = w; this.h = h; };
  Training.prototype.step = function (dt) {
    if (this.done) { this.done -= dt; if (this.done <= 0) { this.done = 0; this.newRun(); } return; }
    for (var i = 0; i < 4; i++) this.train();
    if ((this.acc >= .99 && this.epoch > 200) || this.epoch > 1600) this.done = 2.2;
  };
  Training.prototype.draw = function (ctx, w, h) {
    var big = w > 320, side = big ? Math.min(w * .3, 200) : 0, pw = w - side - (big ? 14 : 0), ph = h;
    var cols = big ? 46 : 30, rows = Math.round(cols * ph / pw), cw = pw / cols, ch = ph / rows, x, y;
    var map = function (v, size) { return (v + 1) / 2 * size; };
    for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
      var p = this.forward((x + .5) / cols * 2 - 1, (y + .5) / rows * 2 - 1);
      ctx.fillStyle = p > .5 ? alpha(C.crimson, (p - .5) * .9) : alpha(C.gray, (.5 - p) * .7);
      ctx.fillRect(x * cw, y * ch, cw + .5, ch + .5);
    }
    var self = this;
    this.pts.forEach(function (q) {
      ctx.beginPath(); ctx.arc(map(q[0], pw), map(q[1], ph), big ? 3.4 : 2.6, 0, 7);
      ctx.fillStyle = q[2] ? '#c8324d' : (C.dark ? '#e9eef0' : '#ffffff'); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = q[2] ? '#fff' : (C.dark ? '#0c090a' : '#565e63'); ctx.stroke();
    });
    if (!big) return;
    var sx = w - side, lh = h * .42, ly = h - lh - 30;
    label(ctx, 'dataset · ' + this.kind, sx, 16, 10, C.muted);
    label(ctx, 'epoch ' + this.epoch, sx, 36, 13, C.text);
    label(ctx, 'accuracy ' + Math.round(this.acc * 100) + '%', sx, 56, 13, this.acc > .97 ? C.accent : C.text);
    label(ctx, 'loss ' + (this.loss[this.loss.length - 1] || 0).toFixed(3), sx, 76, 13, C.text);
    rr(ctx, sx, ly, side, lh, 8); ctx.fillStyle = C.faint; ctx.fill();
    var mx = Math.max.apply(null, this.loss.concat([.7]));
    ctx.beginPath(); this.loss.forEach(function (l, i) { var px = sx + 6 + i / 240 * (side - 12), py = ly + lh - 6 - l / mx * (lh - 12); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.8; ctx.stroke();
    label(ctx, 'training loss', sx, ly + lh + 14, 9.5, C.muted);
    if (this.done) label(ctx, 'converged ✓', sx, 96, 11, C.accent);
  };

  /* ------------------------------------------------------------------ runner */
  var SIMS = { security: Security, healthcare: Health, cps: Robot, vision: Vision, training: Training };
  var live = [];
  function setup(el, Sim) {
    var canvas = document.createElement('canvas');
    canvas.className = 'sim__canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', el.getAttribute('data-label') || 'Animated simulation');
    el.appendChild(canvas); el.classList.add('sim--live');
    var ctx = canvas.getContext('2d'), sim = new Sim(), w = 0, h = 0, visible = false, last = 0, raf = 0;
    sim.compact = el.hasAttribute('data-compact');
    function resize() {
      var r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); sim.resize(w, h);
      if (reduce || !visible) paint();
    }
    function paint() { ctx.clearRect(0, 0, w, h); sim.draw(ctx, w, h); }
    function frame(t) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? Math.min((t - last) / 1000, .05) : .016; last = t;
      sim.step(dt); paint(); raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame); } }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el);
    if (reduce) { for (var i = 0; i < 150; i++) sim.step(1 / 30); paint(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }, { rootMargin: '80px' }).observe(el);
    } else { visible = true; start(); }
    live.push({ paint: paint, start: start, visible: function () { return visible; } });
  }
  document.querySelectorAll('[data-sim]').forEach(function (el) { var S = SIMS[el.getAttribute('data-sim')]; if (S) setup(el, S); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) live.forEach(function (s) { if (s.visible()) s.start(); }); });
  new MutationObserver(function () { readColors(); live.forEach(function (s) { s.paint(); }); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
