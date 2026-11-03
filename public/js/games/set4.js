/* Juegos nuevos A: Reflejos, Matemáticas y Habilidad */
(function () {
  'use strict';
  const G = window.Games.impl;
  const h = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const digitKey = (e) => { const n = parseInt(e.key, 10); return n >= 1 && n <= 4 ? n - 1 : -1; };

  /* opciones numéricas distintas alrededor del valor correcto */
  function numOptions(ctx, ans, spread, min) {
    const set = new Set([ans]); let guard = 0;
    while (set.size < 4 && guard++ < 80) { const v = ans + ctx.int(1, spread) * (ctx.chance(0.5) ? 1 : -1); if (v >= (min == null ? 0 : min)) set.add(v); }
    let k = 1; while (set.size < 4) set.add(ans + spread + k++);
    return ctx.shuffle([...set]);
  }
  /* grilla de 4 botones con teclas 1-4 */
  function choice4(ctx, parent, cls, labels, pick) {
    parent.innerHTML = '';
    labels.forEach((lb, i) => { const b = h('button', 'gbtn ' + cls, `<small>${i + 1}</small>${lb}`, parent); ctx.press(b, () => pick(i)); });
  }

  /* ═════════════ ⚡ REFLEJOS ═════════════ */

  /* SEMÁFORO */
  G.gonogo = function (ctx) {
    const d = ctx.dom('g-center');
    h('div', 'g-sub', 'Verde: TOCÁ · Rojo: NO TOQUES', d);
    const ball = h('div', 'gng-ball off', '', d), res = h('div', 'g-sub', ' ', d);
    const life = [950, 800, 650][ctx.diff], pGreen = [0.7, 0.6, 0.52][ctx.diff];
    let cur = null;
    function next() {
      ball.className = 'gng-ball off'; cur = null;
      ctx.after(ctx.rand(450, 1300), () => {
        const green = ctx.chance(pGreen), me = { green, t0: performance.now() }; cur = me;
        ball.className = 'gng-ball ' + (green ? 'green' : 'red');
        ctx.after(life, () => {
          if (cur !== me) return; cur = null;
          if (green) { ctx.addScore(-4); res.textContent = '¡Muy lento! −4'; ctx.sfx.bad(); }
          else { ctx.addScore(8); res.textContent = '¡Bien! Esquivaste el rojo +8'; ctx.sfx.good(); }
          next();
        });
      });
    }
    function tap() {
      if (!cur) { ctx.wrong(6, 600); res.textContent = '¡Muy pronto! −6'; return; }
      const c = cur; cur = null;
      if (c.green) { const ms = Math.round(performance.now() - c.t0), p = clamp(Math.round(40 - ms / 14), 8, 35); ctx.right(p); res.textContent = `${ms} ms · +${p}`; }
      else { ctx.wrong(15, 1000); res.textContent = '¡Era ROJO! −15'; }
      next();
    }
    ctx.press(d, tap); ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') tap(); });
    next();
  };

  /* ALTERNA DEDOS */
  G.alterna = function (ctx) {
    const d = ctx.dom('g-center');
    const big = h('div', 'g-big', '0', d), info = h('div', 'g-sub', 'Alterná ⬅️ ➡️ ⬅️ ➡️', d), row = h('div', 'g-row', '', d);
    const bl = h('button', 'gbtn teal alt-btn', '⬅️', row), br = h('button', 'gbtn teal alt-btn', '➡️', row);
    let last = null;
    function press(side) {
      if (side === last) { ctx.wrong(2, 450); big.textContent = ctx.score; info.textContent = '¡Trastabillaste! Alterná los lados'; return; }
      last = side; ctx.addScore(1); ctx.sfx.tap(); big.textContent = ctx.score; info.textContent = side === 'L' ? 'Ahora ➡️' : 'Ahora ⬅️';
    }
    ctx.press(bl, () => press('L')); ctx.press(br, () => press('R'));
    ctx.key((e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyZ') press('L'); if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyX') press('R'); });
  };

  /* BURBUJAS FLASH */
  G.bubbles = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const R0 = 54, life = [1.8, 1.4, 1.1][ctx.diff], gap = [0.62, 0.5, 0.42][ctx.diff];
    let list = [], spawn = 0.25;
    const HUES = [190, 280, 330, 45, 150];
    cv.onDown((x, y) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i], r = R0 * (1 - 0.85 * b.age / life);
        if (Math.hypot(x - b.x, y - b.y) < r + 10) {
          const p = 8 + Math.round((b.age / life) * 22);
          ctx.addScore(p); ctx.sfx.pop(); cv.burst(b.x, b.y, `hsl(${b.hue},90%,70%)`, 10, 190); cv.float('+' + p, b.x, b.y - 14, '#ffe066', 22 + p / 4);
          list.splice(i, 1); return;
        }
      }
      ctx.addScore(-3); ctx.sfx.bad(); cv.float('−3', x, y - 10, '#ff8787', 20); ctx.lock(300);
    });
    ctx.loop((dt) => {
      spawn -= dt;
      if (spawn <= 0) {
        spawn = gap * (0.7 + ctx.rand() * 0.6);
        let x = 0, y = 0, tries = 0;
        do { x = ctx.rand(64, 536); y = ctx.rand(90, 340); tries++; } while (tries < 12 && list.some((b) => Math.hypot(b.x - x, b.y - y) < 90));
        list.push({ x, y, age: 0, hue: ctx.pick(HUES) });
      }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#0f2a4d'); bg.addColorStop(1, '#16466f'); cv.clear(bg);
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i]; b.age += dt; if (b.age >= life) { list.splice(i, 1); continue; }
        const r = R0 * (1 - 0.85 * b.age / life);
        const gr = g.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, r * 0.1, b.x, b.y, r);
        gr.addColorStop(0, `hsla(${b.hue},95%,88%,.95)`); gr.addColorStop(1, `hsla(${b.hue},85%,55%,.75)`);
        cv.circle(b.x, b.y, r, gr, 'rgba(255,255,255,.7)', 3);
      }
      cv.text(String(ctx.score), 580, 26, { size: 30, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };

  /* ═════════════ ➗ MATEMÁTICAS ═════════════ */

  /* SECUENCIAS */
  G.sequence = function (ctx) {
    const d = ctx.dom('g-center');
    h('div', 'g-sub', '¿Qué número sigue?', d);
    const row = h('div', 'seq-row', '', d), grid = h('div', 'g-grid g-grid2', '', d);
    let ans = 0, opts = [], streak = 0;
    function make() {
      const t = ctx.int(0, [1, 4, 6][ctx.diff]), s = ctx.int(1, 12);
      let a;
      if (t === 0) { const df = ctx.int(2, ctx.diff === 0 ? 6 : 9); a = [0, 1, 2, 3, 4].map((i) => s + df * i); }
      else if (t === 1) { const m = ctx.int(2, 3), s0 = ctx.int(1, 4); a = [0, 1, 2, 3, 4].map((i) => s0 * Math.pow(m, i)); }
      else if (t === 2) { const d1 = ctx.int(1, 5), d2 = ctx.int(1, 5); a = [s, s + d1, s + d1 + d2, s + 2 * d1 + d2, s + 2 * d1 + 2 * d2]; }
      else if (t === 3) { const k = ctx.int(1, 6); a = [0, 1, 2, 3, 4].map((i) => (k + i) * (k + i)); }
      else if (t === 4) { const df = ctx.int(2, 8), top = 40 + ctx.int(0, 30); a = [0, 1, 2, 3, 4].map((i) => top - df * i); }
      else if (t === 5) { const x = ctx.int(1, 5), y = ctx.int(1, 6); a = [x, y, x + y, x + 2 * y, 2 * x + 3 * y]; }
      else { const k = ctx.int(1, 4); a = [0, 1, 2, 3, 4].map((i) => (k + i) * (k + i + 1) / 2); }
      ans = a[4]; row.innerHTML = a.slice(0, 4).map((v) => `<span>${v}</span>`).join('') + '<span class="q">?</span>';
      opts = numOptions(ctx, ans, Math.max(3, Math.round(ans * 0.15)), 0);
      choice4(ctx, grid, 'blue', opts, pick);
    }
    function pick(i) {
      if (opts[i] === ans) { streak++; ctx.right(12 + Math.min(streak, 5) * 2); } else { streak = 0; ctx.wrong(8); }
      make();
    }
    ctx.key((e) => { const i = digitKey(e); if (i >= 0) pick(i); });
    make();
  };

  /* FALTA EL SIGNO */
  G.operator = function (ctx) {
    const OPS = ['+', '−', '×', '÷'];
    const d = ctx.dom('g-center');
    h('div', 'g-sub', '¿Qué signo falta?', d);
    const eq = h('div', 'g-big', '', d), grid = h('div', 'g-grid g-grid4', '', d);
    let ans = 0, streak = 0;
    const calc = (op, a, b) => (op === 0 ? a + b : op === 1 ? a - b : op === 2 ? a * b : (b !== 0 && a % b === 0 ? a / b : null));
    function make() {
      for (let guard = 0; guard < 60; guard++) {
        const op = ctx.int(0, ctx.diff === 0 ? 2 : 3); let a, b;
        if (op === 0) { a = ctx.int(2, [20, 40, 60][ctx.diff]); b = ctx.int(2, [20, 40, 60][ctx.diff]); }
        else if (op === 1) { a = ctx.int(5, [25, 50, 80][ctx.diff]); b = ctx.int(1, a - 1); }
        else if (op === 2) { a = ctx.int(2, [9, 10, 12][ctx.diff]); b = ctx.int(2, [9, 10, 12][ctx.diff]); }
        else { b = ctx.int(2, 9); a = b * ctx.int(2, [9, 10, 12][ctx.diff]); }
        const c = calc(op, a, b), ok = [0, 1, 2, 3].filter((k) => calc(k, a, b) === c);
        if (ok.length !== 1 || (ctx.diff === 0 && ok[0] === 3)) continue;
        ans = op; eq.textContent = `${a}  ❓  ${b}  =  ${c}`; break;
      }
      choice4(ctx, grid, 'pink op', OPS, pick);
    }
    function pick(i) { if (i === ans) { streak++; ctx.right(12 + Math.min(streak, 5)); } else { streak = 0; ctx.wrong(8); } make(); }
    ctx.key((e) => { const i = digitKey(e); if (i >= 0) pick(i); });
    make();
  };

  /* SUMA DE DADOS */
  G.dice = function (ctx) {
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const d = ctx.dom('g-center');
    h('div', 'g-sub', '¿Cuánto suman los dados?', d);
    const tray = h('div', 'dice-tray', '', d), grid = h('div', 'g-grid g-grid2', '', d);
    let sum = 0, opts = [];
    function make() {
      const n = ctx.int([3, 4, 5][ctx.diff], [5, 6, 8][ctx.diff]), vals = Array.from({ length: n }, () => ctx.int(1, 6));
      sum = vals.reduce((a, b) => a + b, 0); tray.innerHTML = '';
      vals.forEach((v) => { const die = h('div', 'die', '', tray); for (let c = 0; c < 9; c++) h('i', PIPS[v].includes(c) ? 'on' : '', '', die); die.style.transform = `rotate(${ctx.int(-12, 12)}deg)`; });
      opts = numOptions(ctx, sum, 4, 1); choice4(ctx, grid, 'blue', opts, pick);
    }
    function pick(i) { if (opts[i] === sum) ctx.right(10 + Math.min(10, sum >> 1)); else ctx.wrong(8); make(); }
    ctx.key((e) => { const i = digitKey(e); if (i >= 0) pick(i); });
    make();
  };

  /* SUMA OBJETIVO */
  G.target = function (ctx) {
    const d = ctx.dom('g-center');
    const top = h('div', 'g-banner ink', '', d), cur = h('div', 'g-sub', '', d), grid = h('div', 'g-grid tg', '', d);
    let vals = [], sel = new Set(), T = 0, k = 2;
    const sumSel = () => [...sel].reduce((a, i) => a + vals[i], 0);
    function paint() { [...grid.children].forEach((b, i) => b.classList.toggle('sel', sel.has(i))); cur.innerHTML = `Llevás <b>${sumSel()}</b> de <b>${T}</b>`; }
    function puzzle() {
      const max = [9, 15, 20][ctx.diff]; k = ctx.diff === 0 ? 2 : ctx.diff === 1 ? ctx.int(2, 3) : 3;
      vals = Array.from({ length: 8 }, () => ctx.int(1, max)); sel = new Set();
      T = ctx.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, k).reduce((a, i) => a + vals[i], 0);
      top.textContent = `Objetivo: ${T}`; grid.innerHTML = '';
      vals.forEach((v, i) => { const b = h('button', 'gbtn blue num', String(v), grid); ctx.press(b, () => toggle(i)); });
      paint();
    }
    function toggle(i) {
      if (sel.has(i)) sel.delete(i); else sel.add(i);
      ctx.sfx.tap();
      const s = sumSel();
      if (s === T) { ctx.right(10 + k * 4); puzzle(); }
      else if (s > T) { ctx.wrong(6, 600); sel = new Set(); paint(); }
      else paint();
    }
    puzzle();
  };

  /* ═════════════ 🎯 HABILIDAD ═════════════ */

  /* TIRO AL BLANCO */
  G.aim = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const R = [40, 32, 26][ctx.diff], vel = [80, 120, 170][ctx.diff], pCiv = [0, 0.15, 0.25][ctx.diff];
    const mk = (y) => ({ x: ctx.rand(R, 600 - R), y, y0: y, vx: (ctx.chance(0.5) ? -1 : 1) * vel * ctx.rand(0.7, 1.3), civ: ctx.chance(pCiv), ph: ctx.rand(0, 6) });
    const ts = [mk(100), mk(200), mk(300)], marks = [];
    cv.onDown((x, y) => {
      for (let i = ts.length - 1; i >= 0; i--) {
        const b = ts[i], dd = Math.hypot(x - b.x, y - b.y);
        if (dd <= R) {
          if (b.civ) { ctx.addScore(-25); ctx.sfx.bad(); ctx.shake(); ctx.lock(600); marks.push({ x, y, t: 0.7, txt: '−25 🐰', ok: false }); }
          else { const p = 10 + Math.round((1 - dd / R) * 40); ctx.addScore(p); ctx.sfx.pop(); cv.burst(x, y, '#ffd43b', 10, 190); marks.push({ x, y, t: 0.6, txt: '+' + p, ok: true }); }
          Object.assign(ts[i], mk(b.y0), { y: b.y0 }); return;
        }
      }
      ctx.addScore(-5); ctx.sfx.bad(); ctx.lock(300); marks.push({ x, y, t: 0.4, txt: '−5', ok: false });
    });
    ctx.loop((dt, t) => {
      ts.forEach((b) => { b.x += b.vx * dt * (1 + t * 0.02); if (b.x < R || b.x > 600 - R) { b.vx *= -1; b.x = clamp(b.x, R, 600 - R); } if (ctx.diff === 2) b.y = b.y0 + Math.sin(t * 2 + b.ph) * 30; });
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#3a2a1a'); bg.addColorStop(1, '#26190f'); cv.clear(bg);
      ts.forEach((b) => {
        if (b.civ) { cv.circle(b.x, b.y, R, 'rgba(46,230,166,.25)', '#2ee6a6', 4); cv.emoji('🐰', b.x, b.y, R * 1.3); return; }
        [[1, '#e8344a'], [0.66, '#fff'], [0.33, '#e8344a']].forEach(([f, col]) => cv.circle(b.x, b.y, R * f, col));
      });
      for (let i = marks.length - 1; i >= 0; i--) { const m = marks[i]; m.t -= dt; if (m.t <= 0) { marks.splice(i, 1); continue; } g.globalAlpha = Math.min(1, m.t * 3); cv.text(m.txt, m.x, m.y - (0.6 - m.t) * 30, { size: 24, weight: 700, color: m.ok ? '#ffe066' : '#ff8787', stroke: 'rgba(0,0,0,.5)' }); g.globalAlpha = 1; }
      cv.text(String(ctx.score), 580, 26, { size: 30, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };

  /* MEDIDOR DE FUERZA */
  G.powerbar = function (ctx) {
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d), track = h('div', 'pb-track', '', d), zone = h('div', 'pb-zone', '', track), mark = h('div', 'pb-mark', '', track);
    const res = h('div', 'g-big', ' ', d), btn = h('button', 'gbtn orange big', '¡AHORA!', d);
    let round = 0, pos = ctx.rand(0, 1), dir = ctx.chance(0.5) ? 1 : -1, speed = 1, zc = 0.5, zw = 0.2, state = 'run';
    function newRound() {
      round++; zw = Math.max(0.05, 0.25 - round * 0.022 - ctx.diff * 0.02); zc = ctx.rand(0.18, 0.82);
      speed = 0.95 + round * 0.13 + ctx.diff * 0.22; state = 'run';
      zone.style.left = ((zc - zw / 2) * 100) + '%'; zone.style.width = (zw * 100) + '%';
      info.textContent = `Ronda ${round} · zona cada vez más chica`; res.textContent = ' ';
    }
    ctx.loop((dt) => {
      if (state !== 'run') return;
      pos += dir * speed * dt; if (pos >= 1) { pos = 1; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; }
      mark.style.left = (pos * 100) + '%';
    });
    function stop() {
      if (state !== 'run') return; state = 'rest';
      const e = Math.abs(pos - zc), half = zw / 2; let p = 0;
      if (e <= half) p = Math.round(100 - 55 * (e / half));
      else if (e <= half * 2) p = Math.round(25 * (1 - (e - half) / half));
      ctx.addScore(p);
      res.textContent = p >= 92 ? `¡PERFECTO! +${p}` : p >= 45 ? `¡Bien! +${p}` : p > 0 ? `Cerca… +${p}` : '¡Fuera!';
      p >= 45 ? ctx.sfx.good() : ctx.sfx.bad();
      ctx.after(750, newRound);
    }
    ctx.press(btn, stop); ctx.press(track, stop); ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') stop(); });
    newRound();
  };

  /* PUENTE PERFECTO */
  G.stick = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g; const GY = 300;
    const wMin = [70, 50, 34][ctx.diff], wMax = [120, 95, 70][ctx.diff];
    const plats = [{ x: 30, w: 100 }];
    let cur = 0, cam = 0, camT = 0, len = 0, ang = 0, phase = 'idle', held = false, px = 30 + 100 - 14, target = 0, walkOk = false, perfect = false, crossed = 0, perfects = 0, fallY = 0, fallV = 0, label = '', labelT = 0;
    function addPlat() {
      const last = plats[plats.length - 1], first = plats.length === 1;
      const gap = first ? 70 : ctx.rand(55, 215), w = first ? 110 : ctx.rand(wMin, wMax);
      plats.push({ x: last.x + last.w + gap, w });
    }
    addPlat(); addPlat();
    const press = () => { if (phase === 'idle') { phase = 'grow'; held = true; len = 0; } };
    const release = () => { held = false; if (phase === 'grow') { phase = 'fall'; ang = 0; } };
    cv.onDown(press); cv.onUp(release); ctx.listen(window, 'pointerup', release);
    ctx.key((e) => { if (e.code === 'Space' || e.code === 'ArrowDown') press(); });
    ctx.listen(window, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowDown') release(); });
    function score() { ctx.setScore(crossed * 10 + perfects * 15); }
    ctx.loop((dt) => {
      const pl = plats[cur], nx = plats[cur + 1], pivot = pl.x + pl.w;
      if (phase === 'grow') { len = Math.min(340, len + 235 * dt); }
      else if (phase === 'fall') {
        ang += (Math.PI / 2) / 0.3 * dt;
        if (ang >= Math.PI / 2) {
          ang = Math.PI / 2; const tip = pivot + len;
          walkOk = tip >= nx.x && tip <= nx.x + nx.w;
          if (walkOk) { perfect = Math.abs(tip - (nx.x + nx.w / 2)) < 7; target = nx.x + nx.w - 14; } else target = tip;
          phase = 'walk'; ctx.sfx.tap();
        }
      } else if (phase === 'walk') {
        px = Math.min(target, px + 330 * dt);
        if (px >= target) {
          if (walkOk) {
            cur++; crossed++; if (perfect) { perfects++; label = '¡PERFECTO! +25'; ctx.sfx.win(); } else { label = '+10'; ctx.sfx.good(); } labelT = 0.9;
            score(); addPlat(); camT = plats[cur].x - 30; phase = 'scroll';
          } else { phase = 'dead'; fallY = GY - 20; fallV = 0; ctx.sfx.lose(); ctx.shake(); ctx.finish(900); }
        }
      } else if (phase === 'scroll') {
        cam += (camT - cam) * Math.min(1, dt * 7);
        if (Math.abs(camT - cam) < 1) { cam = camT; len = 0; ang = 0; phase = 'idle'; if (held) { phase = 'grow'; } }
      } else if (phase === 'dead') { fallV += 1400 * dt; fallY += fallV * dt; }
      labelT = Math.max(0, labelT - dt);
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#1b1044'); bg.addColorStop(1, '#5b3a9a'); cv.clear(bg);
      g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 24; i++) g.fillRect((i * 97 + 13 - cam * 0.15) % 620, (i * 53) % 220, 2, 2);
      plats.forEach((p) => {
        const sx = p.x - cam; if (sx > 640 || sx + p.w < -20) return;
        g.fillStyle = '#12091f'; g.fillRect(sx, GY, p.w, 120); g.fillStyle = '#2a1a4a'; g.fillRect(sx, GY, p.w, 6);
        g.fillStyle = '#ff5b6b'; g.fillRect(sx + p.w / 2 - 3, GY, 6, 6);
      });
      const pvx = pivot - cam;
      if (len > 0) { g.strokeStyle = '#f5e6b8'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(pvx, GY); g.lineTo(pvx + len * Math.sin(ang), GY - len * Math.cos(ang)); g.stroke(); }
      cv.emoji(phase === 'dead' ? '😵' : '🥷', px - cam, (phase === 'dead' ? fallY : GY - 20), 36);
      cv.text(String(ctx.score), 580, 26, { size: 32, align: 'right', weight: 700 });
      if (phase === 'idle' && crossed === 0) cv.text('Mantené para estirar el puente · soltá para tirarlo', 300, 90, { size: 20, color: 'rgba(255,255,255,.85)', stroke: 'rgba(0,0,0,.4)' });
      if (labelT > 0) { g.globalAlpha = Math.min(1, labelT * 2); cv.text(label, 300, 130, { size: 30, weight: 700, color: '#ffe066', stroke: 'rgba(0,0,0,.5)' }); g.globalAlpha = 1; }
    });
  };
})();
