/* Motor de minijuegos: canvas escalable, loop con delta-time (justo en cualquier monitor),
   input unificado (mouse/touch/teclado), RNG con semilla compartida y sonidos por código. */
(function (global) {
  'use strict';

  /* ---------- RNG con semilla (todos los jugadores reciben la misma secuencia) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- sonido (WebAudio, sin archivos) ---------- */
  let ac = null;
  let muted = false, vol = 0.8;
  try { muted = localStorage.getItem('pa_muted') === '1'; const sv = parseFloat(localStorage.getItem('pa_vol')); if (sv >= 0 && sv <= 1) vol = sv; } catch (e) { /* noop */ }
  const dset = () => document.documentElement.dataset;
  const fxOff = () => dset().fx === 'off' || dset().motion === 'reduced';
  function vib(p) { try { if (dset().vib === 'on' && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ } }
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, d = 0.1, type = 'sine', v = 0.1, slide = 0, delay = 0) {
    if (muted) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(Math.max(0.0002, v * vol * 1.25), t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  const sfx = {
    tap() { tone(520, 0.05, 'triangle', 0.08); },
    good() { tone(660, 0.08, 'square', 0.06); tone(990, 0.12, 'square', 0.06, 0, 0.07); },
    bad() { tone(200, 0.2, 'sawtooth', 0.08, -90); },
    tick() { tone(800, 0.04, 'square', 0.05); },
    go() { tone(660, 0.3, 'square', 0.08, 660); },
    coin() { tone(1200, 0.06, 'square', 0.05); tone(1700, 0.1, 'square', 0.05, 0, 0.06); },
    pop() { tone(280, 0.09, 'sine', 0.12, 420); },
    whoosh() { tone(900, 0.15, 'sawtooth', 0.03, -650); },
    jump() { tone(300, 0.14, 'square', 0.06, 350); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, 0, i * 0.1)); },
    lose() { [400, 330, 260].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.06, 0, i * 0.13)); },
    note(i) { tone([392, 494, 587, 740][i % 4], 0.14, 'triangle', 0.12); },
    fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, 0, i * 0.12)); },
    unlock() { audio(); },
    setMuted(m) { muted = !!m; try { localStorage.setItem('pa_muted', muted ? '1' : '0'); } catch (e) { /* noop */ } },
    isMuted() { return muted; },
    setVolume(v) { vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('pa_vol', String(vol)); } catch (e) { /* noop */ } },
    getVolume() { return vol; },
    vib
  };

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  const FONT = 'Fredoka, "Trebuchet MS", system-ui, sans-serif';
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  /* ---------- runner: ejecuta un minijuego ---------- */
  function createRunner(opts) {
    const { meta, stage } = opts;
    const rng = mulberry32((opts.seed >>> 0) || 1);
    let score = 0, ending = false, finished = false, raf = 0, started = 0, last = 0, lockUntil = 0, errStreak = 0, lockEl = null;
    const loops = [], timers = [], cleanups = [];
    stage.innerHTML = '';
    const wrap = el('div', 'g-wrap');
    stage.appendChild(wrap);

    const ctx = {
      meta, diff: opts.diff || 0, sfx, rng, W: 600, H: 400, wrap,
      get score() { return score; },
      get ended() { return ending || finished; },
      elapsed() { return (performance.now() - started) / 1000; },
      remaining() { return Math.max(0, meta.duration / 1000 - ctx.elapsed()); },
      duration: meta.duration / 1000,
      rand: (a = 0, b = 1) => a + rng() * (b - a),
      int: (a, b) => a + Math.floor(rng() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(rng() * arr.length)],
      chance: (p) => rng() < p,
      shuffle(arr) { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; },
      setScore(n) {
        if (ending || finished) return;
        const v = Math.max(0, Math.min(meta.maxScore, Math.round(n)));
        if (v !== score) { score = v; opts.onScore && opts.onScore(score); }
      },
      addScore(d) { ctx.setScore(score + d); },
      loop(fn) { loops.push(fn); },
      after(ms, fn) { const id = setTimeout(() => { if (!finished) fn(); }, ms); timers.push(id); return id; },
      every(ms, fn) { const id = setInterval(() => { if (!finished) fn(); }, ms); timers.push(id); return id; },
      listen(target, ev, fn, o) { target.addEventListener(ev, fn, o); cleanups.push(() => target.removeEventListener(ev, fn, o)); },
      key(fn) { ctx.listen(window, 'keydown', (e) => { if (e.repeat && !ctx._allowRepeat) return; if (document.querySelector('.modal:not(.hidden)')) return; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); if (ctx.locked) return; fn(e); }); },
      keyHeld(fn) { ctx._allowRepeat = true; ctx.key(fn); ctx._allowRepeat = false; },
      press(node, fn) { // reacciona al instante (pointerdown) y evita doble disparo
        node.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!finished && !ending && !ctx.locked) fn(e); });
      },
      dom(cls) { const d = el('div', 'g-dom' + (cls ? ' ' + cls : '')); wrap.appendChild(d); return d; },
      /* ---- anti-spam: cada error bloquea la entrada un rato (y el bloqueo crece si seguís errando) ---- */
      get locked() { return performance.now() < lockUntil; },
      lock(ms) {
        lockUntil = Math.max(lockUntil, performance.now() + ms);
        if (!lockEl) { lockEl = el('div', 'g-lock', '<span>⛔ ¡Esperá!</span><i></i>'); wrap.appendChild(lockEl); }
        lockEl.style.setProperty('--ms', ms + 'ms');
        lockEl.classList.remove('on'); void lockEl.offsetWidth; lockEl.classList.add('on');
        setTimeout(() => { if (performance.now() >= lockUntil - 20 && lockEl) lockEl.classList.remove('on'); }, ms + 30);
      },
      right(pts = 0) { errStreak = 0; if (pts) ctx.addScore(pts); ctx.sfx.good(); ctx.flash('good'); vib(12); },
      wrong(pen = 5, base = 700) {
        errStreak++; if (pen) ctx.addScore(-pen);
        ctx.sfx.bad(); ctx.shake(); ctx.flash('bad'); vib([50, 40, 50]);
        ctx.lock(Math.min(1800, base + (errStreak - 1) * 300));
      },
      shake() { if (fxOff()) return; wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); },
      flash(kind) { if (dset().fx === 'off') return; wrap.classList.remove('f-good', 'f-bad'); void wrap.offsetWidth; wrap.classList.add(kind === 'good' ? 'f-good' : 'f-bad'); },
      finish(delay = 0) {
        if (ending || finished) return;
        ending = true;
        if (delay > 0) setTimeout(finishNow, delay); else finishNow();
      },
      canvas(W = 600, H = 400) { return makeCanvas(ctx, wrap, W, H, cleanups); }
    };

    function finishNow() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      cleanups.forEach((c) => { try { c(); } catch (e) { /* noop */ } });
      opts.onFinish && opts.onFinish(score);
    }
    function frame(now) {
      if (finished) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      const t = (now - started) / 1000;
      for (let i = 0; i < loops.length; i++) {
        try { loops[i](dt, t); } catch (e) { console.error('[juego]', meta.id, e); }
      }
      opts.onTime && opts.onTime(Math.max(0, 1 - (now - started) / meta.duration));
      if (now - started >= meta.duration) ctx.finish();
    }

    return {
      start() {
        started = performance.now(); last = started;
        try { (global.Games.impl[meta.id])(ctx); } catch (e) { console.error('[juego-init]', meta.id, e); }
        raf = requestAnimationFrame(frame);
        timers.push(setTimeout(() => ctx.finish(), meta.duration + 1000)); // por si la pestaña está en segundo plano
      },
      destroy() { if (finished) return; finished = true; ending = true; cancelAnimationFrame(raf); timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); cleanups.forEach((c) => c()); stage.innerHTML = ''; },
      getScore() { return score; }
    };
  }

  /* ---------- canvas con helpers ---------- */
  function makeCanvas(ctx, wrap, W, H, cleanups) {
    const c = el('canvas', 'g-canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr;
    c.style.aspectRatio = W + '/' + H;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    wrap.appendChild(c);
    ctx.W = W; ctx.H = H;
    const ptr = { x: W / 2, y: H / 2, down: false, seen: false, px: W / 2, py: H / 2 };
    const hs = { down: [], move: [], up: [] };
    const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    c.addEventListener('pointerdown', (e) => {
      try { c.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
      const [x, y] = pos(e); ptr.px = x; ptr.py = y; ptr.x = x; ptr.y = y; ptr.down = true; ptr.seen = true;
      if (!ctx.locked) hs.down.forEach((f) => f(x, y, e)); e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      const [x, y] = pos(e); ptr.px = ptr.x; ptr.py = ptr.y; ptr.x = x; ptr.y = y;
      if (e.pointerType === 'mouse') ptr.seen = true;
      hs.move.forEach((f) => f(x, y, e));
    });
    const up = (e) => { ptr.down = false; const [x, y] = pos(e); hs.up.forEach((f) => f(x, y, e)); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);

    const parts = [], texts = [];
    const cv = {
      el: c, g, W, H, ptr,
      onDown(f) { hs.down.push(f); }, onMove(f) { hs.move.push(f); }, onUp(f) { hs.up.push(f); },
      clear(fill) { if (fill) { g.fillStyle = fill; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H); },
      circle(x, y, r, fill, stroke, lw = 3) {
        g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
        if (fill) { g.fillStyle = fill; g.fill(); }
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
      },
      rrect(x, y, w, h, r, fill, stroke, lw = 3) {
        r = Math.min(r, w / 2, h / 2);
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
        if (fill) { g.fillStyle = fill; g.fill(); }
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
      },
      text(s, x, y, o = {}) {
        g.font = `${o.weight || 600} ${o.size || 24}px ${FONT}`;
        g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
        if (o.stroke) { g.lineWidth = o.lw || 5; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
        g.fillStyle = o.color || '#fff'; g.fillText(s, x, y);
      },
      emoji(s, x, y, size = 32, rot = 0) {
        g.save(); g.translate(x, y); if (rot) g.rotate(rot);
        g.font = `${size}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
        g.fillText(s, 0, size * 0.06); g.restore();
      },
      burst(x, y, color = '#fff', n = 10, speed = 160) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.8);
          const life = 0.4 + Math.random() * 0.35;
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, r: 2 + Math.random() * 3 });
        }
      },
      float(txt, x, y, color = '#fff', size = 26) { texts.push({ txt, x, y, life: 0.85, max: 0.85, color, size }); },
      fxStep(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
          g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color;
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
        for (let i = texts.length - 1; i >= 0; i--) {
          const t = texts[i]; t.life -= dt; if (t.life <= 0) { texts.splice(i, 1); continue; }
          t.y -= 45 * dt;
          g.globalAlpha = Math.min(1, t.life / (t.max * 0.5));
          cv.text(t.txt, t.x, t.y, { size: t.size, color: t.color, weight: 700, stroke: 'rgba(0,0,0,.45)', lw: 5 });
        }
        g.globalAlpha = 1;
      }
    };
    return cv;
  }

  global.Games = { impl: {}, sfx, createRunner, mulberry32, el };
})(window);
