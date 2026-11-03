/* Juegos 1-8 */
(function () {
  'use strict';
  const G = window.Games.impl;
  const h = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* 1 ─ CLICKER FRENZY */
  G.clicker = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    let pulse = 0, cps = [], hue = 340;
    function hit(x, y) {
      if (ctx.ended) return;
      ctx.addScore(1); pulse = 1; ctx.sfx.tap(); hue = (hue + 9) % 360;
      cps.push(performance.now()); cv.burst(x, y, `hsl(${hue},90%,65%)`, 5, 120);
    }
    cv.onDown((x, y) => hit(x, y));
    ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') hit(300 + (Math.random() - .5) * 80, 200 + (Math.random() - .5) * 80); });
    ctx.loop((dt) => {
      pulse = Math.max(0, pulse - dt * 7);
      const now = performance.now(); cps = cps.filter((t) => now - t < 1000);
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#2a1348'); bg.addColorStop(1, '#14082a');
      cv.clear(bg);
      const r = 105 - pulse * 14;
      const grd = g.createRadialGradient(300 - 25, 190 - 30, 10, 300, 200, r);
      grd.addColorStop(0, `hsl(${hue},95%,75%)`); grd.addColorStop(1, `hsl(${hue},85%,50%)`);
      g.shadowColor = `hsl(${hue},90%,60%)`; g.shadowBlur = 30 + pulse * 30;
      cv.circle(300, 200, r, grd); g.shadowBlur = 0;
      cv.circle(300, 200, r, null, 'rgba(255,255,255,.55)', 5);
      cv.text(String(ctx.score), 300, 192, { size: 74, weight: 700, stroke: 'rgba(0,0,0,.35)' });
      cv.text('¡TOCÁ!', 300, 250, { size: 24, color: 'rgba(255,255,255,.9)' });
      cv.text(cps.length + ' toques/seg', 300, 360, { size: 22, color: 'rgba(255,255,255,.7)' });
      cv.fxStep(dt);
    });
  };

  /* 2 ─ MATH RUSH */
  G.math = function (ctx) {
    const d = ctx.dom('g-center');
    const exp = h('div', 'g-big', '', d), grid = h('div', 'g-grid g-grid2', '', d), info = h('div', 'g-sub', '', d);
    let streak = 0, answer = 0, opts = [];
    function gen() {
      const lv = ctx.diff, t = Math.min(1, ctx.elapsed() / 12);
      let a, b, op, res;
      const kinds = lv === 0 ? ['+', '-'] : lv === 1 ? ['+', '-', '×'] : ['+', '-', '×', '×'];
      op = ctx.pick(kinds);
      const hi = [12, 20, 35][lv] + Math.round(t * 8);
      if (op === '+') { a = ctx.int(2, hi); b = ctx.int(2, hi); res = a + b; }
      else if (op === '-') { a = ctx.int(6, hi + 8); b = ctx.int(1, a - 1); res = a - b; }
      else { a = ctx.int(2, lv === 1 ? 9 : 12); b = ctx.int(2, lv === 1 ? 9 : 12); res = a * b; }
      exp.textContent = `${a} ${op} ${b} = ?`;
      const set = new Set([res]);
      while (set.size < 4) { const off = ctx.int(1, 6) * (ctx.chance(0.5) ? 1 : -1); const v = res + off; if (v >= 0) set.add(v); }
      opts = ctx.shuffle([...set]); answer = res;
      grid.innerHTML = '';
      opts.forEach((v, i) => {
        const b2 = h('button', 'gbtn blue', `<small>${i + 1}</small>${v}`, grid);
        ctx.press(b2, () => pick(v, b2));
      });
      info.textContent = streak >= 2 ? `🔥 Racha x${streak}` : ' ';
    }
    function pick(v, node) {
      if (v === answer) { streak++; ctx.right(10 + Math.min(streak, 6) * 2); }
      else { streak = 0; ctx.wrong(8); }
      gen();
    }
    ctx.key((e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 4) pick(opts[n - 1]); });
    gen();
  };

  /* 4 ─ COLOR CORRECTO (Stroop) */
  G.stroop = function (ctx) {
    const NAMES = ['ROJO', 'VERDE', 'AZUL', 'AMARILLO'], HEX = ['#ff4757', '#2ed573', '#3d8bff', '#ffc312'];
    const d = ctx.dom('g-center');
    const rule = h('div', 'g-banner', '', d), word = h('div', 'g-word', '', d), grid = h('div', 'g-grid g-grid4', '', d);
    let ans = 0, mode = 'word';
    HEX.forEach((c, i) => { const b = h('button', 'gbtn color', `<small>${i + 1}</small>`, grid); b.style.background = c; b.style.setProperty('--sh', 'rgba(0,0,0,.35)'); ctx.press(b, () => pick(i)); });
    function next() {
      mode = ctx.diff === 0 ? 'word' : (ctx.chance(0.5) ? 'word' : 'ink');
      const w = ctx.int(0, 3); let ink = ctx.int(0, 3);
      if (ctx.chance(0.75)) ink = (w + ctx.int(1, 3)) % 4;
      word.textContent = NAMES[w]; word.style.color = HEX[ink]; ans = mode === 'word' ? w : ink;
      rule.textContent = mode === 'word' ? '👀 ¿QUÉ DICE LA PALABRA?' : '🖌️ ¿DE QUÉ COLOR ESTÁ PINTADA?';
      rule.className = 'g-banner ' + mode;
    }
    function pick(i) {
      if (i === ans) ctx.right(10); else ctx.wrong(8);
      next();
    }
    ctx.key((e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 4) pick(n - 1); });
    next();
  };

  /* 5 ─ REFLEJO FLASH (3 intentos) */
  G.reflex = function (ctx) {
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', 'Intento 1 de 3', d);
    const box = h('div', 'flash-box wait', '<span>ESPERÁ…</span>', d);
    const res = h('div', 'g-sub', ' ', d);
    let round = 0, state = 'idle', tGo = 0, total = 0, tm = 0;
    function begin() {
      if (round >= 3) { ctx.finish(900); return; }
      round++; info.textContent = `Intento ${round} de 3`;
      box.className = 'flash-box wait'; box.firstChild.textContent = 'ESPERÁ…'; state = 'wait';
      tm = ctx.after(1400 + ctx.rand(0, 2600), () => { state = 'go'; box.className = 'flash-box go'; box.firstChild.textContent = '¡YA!'; tGo = performance.now(); ctx.sfx.go(); });
    }
    function tap() {
      if (state === 'wait') {
        clearTimeout(tm); state = 'done'; box.className = 'flash-box early'; box.firstChild.textContent = '¡MUY PRONTO!'; res.textContent = '0 puntos'; ctx.sfx.bad(); ctx.shake();
        ctx.after(1300, begin);
      } else if (state === 'go') {
        const ms = Math.round(performance.now() - tGo); state = 'done';
        const s = Math.max(0, Math.round(1000 - ms * 2)); total += s; ctx.setScore(total);
        box.className = 'flash-box res'; box.firstChild.textContent = ms + ' ms'; res.textContent = `+${s} puntos`; ctx.sfx.good();
        ctx.after(1300, begin);
      }
    }
    ctx.press(box, tap); ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') tap(); });
    ctx.after(500, begin);
  };

  /* 6 ─ CRONÓMETRO CIEGO */
  G.stopwatch = function (ctx) {
    const target = [5, 6, 8][ctx.diff], hideAt = [3, 2, 1][ctx.diff];
    const d = ctx.dom('g-center');
    h('div', 'g-sub', 'Frená justo en', d); h('div', 'g-banner ink', target.toFixed(2) + ' s', d);
    const clock = h('div', 'clock', '0.00', d);
    const stop = h('button', 'gbtn orange big', '¡STOP!', d);
    const res = h('div', 'g-sub', ' ', d);
    let t0 = performance.now(), stopped = false;
    ctx.loop(() => { if (stopped) return; const t = (performance.now() - t0) / 1000; clock.textContent = t < hideAt ? t.toFixed(2) : '?.??'; clock.classList.toggle('hid', t >= hideAt); });
    function doStop() {
      if (stopped) return; stopped = true;
      const t = (performance.now() - t0) / 1000, diff = Math.abs(t - target);
      const s = Math.round(Math.max(0, 1 - diff / 2.5) * 1000); ctx.setScore(s);
      clock.textContent = t.toFixed(2); clock.classList.remove('hid');
      res.innerHTML = `Diferencia: <b>${diff.toFixed(2)}s</b> → <b>${s} pts</b>`; diff < 0.15 ? ctx.sfx.win() : ctx.sfx.tap();
      stop.disabled = true; ctx.finish(1400);
    }
    ctx.press(stop, doStop); ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') doStop(); });
  };

  /* 7 ─ LLUVIA DE TESOROS (antes Atrapa Monedas): combos, imán, doble puntaje y olas con patrones */
  G.coins = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const BW = 54, BY = 346, EMO = { coin: '🪙', gem: '💎', bomb: '💣', magnet: '🧲', dbl: '✨' };
    let bx = 300, items = [], keys = {}, spawn = 0.4, wave = 2.8, combo = 0, magnet = 0, dbl = 0, banner = '', bannerT = 0, lastCatch = 0;
    ctx.listen(window, 'keydown', (e) => { keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); });
    ctx.listen(window, 'keyup', (e) => { keys[e.code] = false; });
    const mult = () => Math.min(5, 1 + Math.floor(combo / 6));
    const add = (kind, x, y, v) => items.push({ kind, x, y, v, a: ctx.rand(0, 6) });
    function say(txt) { banner = txt; bannerT = 1.3; }
    function spawnWave(t) {
      const v = 200 + ctx.diff * 30 + Math.min(70, t * 5), type = ctx.int(0, 3);
      if (type === 0) { const x0 = ctx.rand(70, 330); for (let i = 0; i < 6; i++) add(i === 3 ? 'gem' : 'coin', x0 + i * 38, -20, v); say('🪙 ¡Línea de monedas!'); }
      else if (type === 1) { const dir = ctx.chance(0.5) ? 1 : -1, x0 = dir > 0 ? 50 : 550; for (let i = 0; i < 8; i++) add('coin', x0 + dir * i * 58, -20 - i * 52, v); say('↘ ¡Seguí la diagonal!'); }
      else if (type === 2) {
        const gp = ctx.int(1, 8), hole = ctx.diff === 2 ? [gp, gp + 1] : [gp - 1, gp, gp + 1];
        for (let c = 0; c < 10; c++) if (!hole.includes(c)) add('bomb', 30 + c * 60, -20, v * 0.92);
        add('gem', 30 + gp * 60 + (ctx.diff === 2 ? 30 : 0), -80, v * 0.92); say('💣 ¡Muro de bombas! Buscá el hueco');
      } else { for (let i = 0; i < 11; i++) add('coin', ctx.rand(30, 570), -20 - i * 38, v); say('🌧️ ¡Lluvia de oro!'); }
    }
    function single(t) {
      const r = ctx.rand(), v = 185 + ctx.rand(0, 70) + ctx.diff * 30 + Math.min(70, t * 5), x = ctx.rand(26, 574);
      const pb = 0.17 + ctx.diff * 0.06;
      if (r < pb) add('bomb', x, -20, v);
      else if (r < pb + 0.035) add('magnet', x, -20, v * 0.85);
      else if (r < pb + 0.07) add('dbl', x, -20, v * 0.85);
      else if (r < pb + 0.15) add('gem', x, -20, v);
      else add('coin', x, -20, v);
    }
    ctx.loop((dt, t) => {
      const target = (cv.ptr.seen || cv.ptr.down) ? cv.ptr.x : bx;
      bx += (target - bx) * Math.min(1, dt * 18);
      if (keys.ArrowLeft || keys.KeyA) bx -= 500 * dt; if (keys.ArrowRight || keys.KeyD) bx += 500 * dt;
      bx = Math.max(BW, Math.min(600 - BW, bx));
      magnet = Math.max(0, magnet - dt); dbl = Math.max(0, dbl - dt); bannerT = Math.max(0, bannerT - dt);
      spawn -= dt; wave -= dt;
      if (wave <= 0) { wave = ctx.rand(4.2, 5.6) - ctx.diff * 0.4; spawnWave(t); }
      if (spawn <= 0) { spawn = (0.5 - ctx.diff * 0.05) * (0.6 + ctx.rand() * 0.9); single(t); }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#3a1f6b'); bg.addColorStop(1, '#1b0d3a'); cv.clear(bg);
      if (magnet > 0) { g.strokeStyle = `rgba(255,120,120,${0.25 + 0.15 * Math.sin(t * 10)})`; g.lineWidth = 3; g.beginPath(); g.arc(bx, BY, 200, Math.PI, 0); g.stroke(); }
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.y += it.v * dt; it.a += dt * 6;
        if (magnet > 0 && (it.kind === 'coin' || it.kind === 'gem') && Math.hypot(it.x - bx, it.y - BY) < 200) it.x += (bx - it.x) * Math.min(1, dt * 5);
        const sc = it.kind === 'coin' ? Math.abs(Math.cos(it.a)) * 0.5 + 0.5 : 1;
        g.save(); g.translate(it.x, it.y); g.scale(sc, 1);
        if (it.kind === 'magnet' || it.kind === 'dbl') { g.shadowColor = it.kind === 'dbl' ? '#ffe066' : '#ff8787'; g.shadowBlur = 18; }
        cv.emoji(EMO[it.kind], 0, 0, it.kind === 'gem' ? 38 : 34); g.restore(); g.shadowBlur = 0;
        if (it.y > BY - 16 && it.y < BY + 24 && Math.abs(it.x - bx) < BW) {
          if (it.kind === 'bomb') { ctx.addScore(-20); combo = 0; ctx.sfx.bad(); ctx.shake(); cv.burst(it.x, it.y, '#ff4757', 14, 220); cv.float('-20', it.x, it.y - 10, '#ff6b6b'); }
          else if (it.kind === 'magnet') { magnet = 6; ctx.sfx.win(); cv.float('🧲 ¡IMÁN!', it.x, it.y - 20, '#ffb3b3', 24); }
          else if (it.kind === 'dbl') { dbl = 6; ctx.sfx.win(); cv.float('✨ ¡DOBLE!', it.x, it.y - 20, '#ffe066', 24); }
          else { combo++; const p = (it.kind === 'gem' ? 15 : 5) * mult() * (dbl > 0 ? 2 : 1); ctx.addScore(p); ctx.sfx.coin(); cv.burst(it.x, it.y, '#ffd43b', 8); cv.float('+' + p, it.x, it.y - 10, mult() > 1 ? '#8cffd6' : '#ffe066', 22 + mult() * 2); lastCatch = t; }
          items.splice(i, 1);
        } else if (it.y > 430) { if (it.kind === 'coin' || it.kind === 'gem') combo = 0; items.splice(i, 1); }
      }
      cv.rrect(bx - BW, BY - 8, BW * 2, 34, 12, '#ff9f43', '#ffd8a8', 4); cv.emoji('🧺', bx, BY - 2, 44);
      // HUD
      cv.text(String(ctx.score), 580, 26, { size: 30, align: 'right', weight: 700 });
      cv.text(`x${mult()}`, 20, 26, { size: 30, align: 'left', weight: 700, color: mult() > 1 ? '#8cffd6' : 'rgba(255,255,255,.6)', stroke: 'rgba(0,0,0,.4)' });
      cv.rrect(64, 18, 90, 10, 5, 'rgba(255,255,255,.15)'); cv.rrect(64, 18, Math.max(0, 90 * ((combo % 6) / 6)), 10, 5, '#8cffd6');
      if (magnet > 0) cv.text('🧲 ' + magnet.toFixed(0) + 's', 20, 58, { size: 20, align: 'left' });
      if (dbl > 0) cv.text('✨ x2 ' + dbl.toFixed(0) + 's', 20, 84, { size: 20, align: 'left', color: '#ffe066' });
      if (bannerT > 0) { g.globalAlpha = Math.min(1, bannerT * 2); cv.text(banner, 300, 120, { size: 26, weight: 700, stroke: 'rgba(0,0,0,.5)' }); g.globalAlpha = 1; }
      cv.fxStep(dt);
    });
  };

  /* 8 ─ MACHACA TOPOS */
  G.moles = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const holes = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) holes.push({ x: 150 + c * 150, y: 120 + r * 100, m: null });
    let spawn = 0.4;
    cv.onDown((x, y) => {
      for (const hl of holes) {
        if (hl.m && !hl.m.struck && Math.hypot(x - hl.x, y - (hl.y - 12)) < 48) {
          hl.m.hit = 0.3; hl.m.struck = true;
          if (hl.m.bomb) { ctx.addScore(-15); ctx.sfx.bad(); ctx.shake(); cv.float('-15', hl.x, hl.y - 40, '#ff6b6b'); cv.burst(hl.x, hl.y, '#ff922b', 16, 240); }
          else { ctx.addScore(10); ctx.sfx.pop(); cv.float('+10', hl.x, hl.y - 40, '#ffe066'); cv.burst(hl.x, hl.y - 20, '#c08457', 8); }
          return;
        }
      }
      // click en un hueco vacío (o en un topo ya golpeado): penalización corta
      ctx.addScore(-3); ctx.sfx.bad(); cv.float('-3', x, y - 10, '#ff8787', 20); ctx.lock(350);
    });
    ctx.loop((dt, t) => {
      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.22, 0.55 - t * 0.02 - ctx.diff * 0.07) * (0.6 + ctx.rand() * 0.8);
        const free = holes.filter((x) => !x.m);
        if (free.length) { const hl = ctx.pick(free); hl.m = { age: 0, life: Math.max(0.55, 1.15 - t * 0.03 - ctx.diff * 0.15), bomb: ctx.chance(0.14 + ctx.diff * 0.05), hit: 0 }; }
      }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#3c6e3a'); bg.addColorStop(1, '#264d2a'); cv.clear(bg);
      for (const hl of holes) {
        cv.g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(hl.x, hl.y + 18, 52, 20, 0, 0, Math.PI * 2); g.fill();
        if (hl.m) {
          const m = hl.m; m.age += dt; if (m.struck) m.hit -= dt;
          const up = m.struck ? Math.max(0, m.hit / 0.3) : Math.min(1, m.age / 0.12) * (m.age > m.life - 0.12 ? Math.max(0, (m.life - m.age) / 0.12) : 1);
          g.save(); g.beginPath(); g.rect(hl.x - 70, hl.y - 90, 140, 108); g.clip();
          cv.emoji(m.bomb ? '💣' : '🐹', hl.x, hl.y + 46 - up * 62, 62, m.struck ? 0.4 : 0); g.restore();
          if (m.age >= m.life || (m.struck && m.hit <= 0)) hl.m = null;
        }
        g.fillStyle = '#5a3a22'; g.beginPath(); g.ellipse(hl.x, hl.y + 20, 56, 14, 0, 0, Math.PI); g.fill();
      }
      cv.text(String(ctx.score), 570, 26, { size: 30, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };
})();
