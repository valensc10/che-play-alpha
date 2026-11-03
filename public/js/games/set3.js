/* Juegos 17-24 */
(function () {
  'use strict';
  const G = window.Games.impl;
  const h = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  /* 17 ─ MAYOR O MENOR */
  G.compare = function (ctx) {
    const d = ctx.dom('g-center');
    const rule = h('div', 'g-banner', '', d), row = h('div', 'g-row', '', d);
    const A = h('button', 'gbtn blue cmp', '', row), B = h('button', 'gbtn pink cmp', '', row);
    let va = 0, vb = 0, bigger = true;
    function expr() {
      const op = ctx.pick(ctx.diff === 0 ? ['+', '-'] : ['+', '-', '×']); let a, b, v;
      if (op === '+') { a = ctx.int(3, 45); b = ctx.int(3, 45); v = a + b; }
      else if (op === '-') { a = ctx.int(10, 70); b = ctx.int(1, a - 1); v = a - b; }
      else { a = ctx.int(2, 12); b = ctx.int(2, 12); v = a * b; }
      return { s: `${a} ${op} ${b}`, v };
    }
    function next() {
      let ea, eb; do { ea = expr(); eb = expr(); } while (ea.v === eb.v || (ctx.diff === 0 && Math.abs(ea.v - eb.v) < 6));
      va = ea.v; vb = eb.v; A.textContent = ea.s; B.textContent = eb.s;
      bigger = ctx.diff === 0 ? true : ctx.chance(0.6);
      rule.textContent = bigger ? '⬆️ ¿Cuál es MAYOR?' : '⬇️ ¿Cuál es MENOR?'; rule.className = 'g-banner ' + (bigger ? 'good' : 'bad');
    }
    function pick(side) {
      const ok = side === 'A' ? (bigger ? va > vb : va < vb) : (bigger ? vb > va : vb < va);
      if (ok) ctx.right(10); else ctx.wrong(8);
      next();
    }
    ctx.press(A, () => pick('A')); ctx.press(B, () => pick('B'));
    ctx.key((e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick('A'); if (e.code === 'ArrowRight' || e.code === 'KeyD') pick('B'); });
    next();
  };

  /* 18 ─ NINJA FRUTAS */
  G.ninja = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const FRUITS = [['🍉', '#ff4d6d'], ['🍊', '#ff9f1a'], ['🍎', '#ff4757'], ['🍋', '#ffd43b'], ['🍇', '#9b59b6'], ['🥝', '#7bd957']];
    let list = [], halves = [], trail = [], spawn = 0.4, comboT = 0, comboN = 0;
    function launch(bomb) {
      const f = ctx.pick(FRUITS); const x = ctx.rand(110, 490);
      list.push({ x, y: 430, vx: (300 - x) * ctx.rand(0.15, 0.45) + ctx.rand(-60, 60), vy: -ctx.rand(640, 780), a: 0, va: ctx.rand(-4, 4), e: bomb ? '💣' : f[0], c: f[1], bomb, r: 30 });
    }
    function slice(x1, y1, x2, y2) {
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const f = list[i];
        const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1;
        let t = ((f.x - x1) * dx + (f.y - y1) * dy) / L; t = Math.max(0, Math.min(1, t));
        if (Math.hypot(f.x - (x1 + dx * t), f.y - (y1 + dy * t)) < f.r + 6) {
          list.splice(i, 1);
          if (f.bomb) { ctx.addScore(-20); ctx.sfx.bad(); ctx.shake(); ctx.flash('bad'); cv.burst(f.x, f.y, '#ff922b', 22, 300); cv.float('-20', f.x, f.y, '#ff6b6b', 30); comboN = 0; }
          else { n++; halves.push({ x: f.x, y: f.y, vx: f.vx - 90, vy: f.vy, a: f.a, va: -3, e: f.e, side: 0 }, { x: f.x, y: f.y, vx: f.vx + 90, vy: f.vy, a: f.a, va: 3, e: f.e, side: 1 }); cv.burst(f.x, f.y, f.c, 14, 230); ctx.sfx.pop(); }
        }
      }
      if (n) {
        comboN = comboT > 0 ? comboN + n : n; comboT = 0.3;
        const pts = 10 * n + (comboN > 1 ? 5 * (comboN - 1) : 0); ctx.addScore(pts);
        cv.float(comboN > 1 ? `COMBO x${comboN} +${pts}` : `+${pts}`, x2, y2 - 20, comboN > 1 ? '#ffe066' : '#fff', comboN > 1 ? 28 : 24);
      }
    }
    cv.onDown(() => { trail = []; });
    cv.onMove((x, y) => { if (!cv.ptr.down) return; slice(cv.ptr.px, cv.ptr.py, x, y); trail.push({ x, y, l: 0.25 }); });
    ctx.loop((dt, t) => {
      comboT = Math.max(0, comboT - dt); spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.35, 0.95 - t * 0.03 - ctx.diff * 0.1);
        const n = ctx.int(1, 2 + (t > 5 ? 1 : 0)); const bombP = 0.12 + ctx.diff * 0.07;
        for (let i = 0; i < n; i++) launch(ctx.chance(bombP));
      }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#3a1c2e'); bg.addColorStop(1, '#1a0f1c'); cv.clear(bg);
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 6; i++) g.fillRect(i * 110, 0, 55, 400);
      for (let i = list.length - 1; i >= 0; i--) { const f = list[i]; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.a += f.va * dt; cv.emoji(f.e, f.x, f.y, 62, f.a); if (f.y > 460 && f.vy > 0) list.splice(i, 1); }
      for (let i = halves.length - 1; i >= 0; i--) {
        const f = halves[i]; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.a += f.va * dt;
        g.save(); g.beginPath(); g.rect(f.side ? f.x : f.x - 60, f.y - 60, 60, 120); g.clip(); cv.emoji(f.e, f.x, f.y, 62, f.a); g.restore(); if (f.y > 480) halves.splice(i, 1);
      }
      for (let i = trail.length - 1; i >= 0; i--) { trail[i].l -= dt; if (trail[i].l <= 0) trail.splice(i, 1); }
      if (trail.length > 1) { g.lineCap = 'round'; g.lineJoin = 'round'; for (let i = 1; i < trail.length; i++) { g.strokeStyle = `rgba(255,255,255,${Math.max(0, trail[i].l / 0.25)})`; g.lineWidth = 3 + trail[i].l * 24; g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke(); } }
      cv.text(String(ctx.score), 570, 26, { size: 32, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };

  /* 20 ─ LLUVIA DE METEOROS */
  G.meteors = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    let sx = 300, sy = 320, lives = 2, inv = 0, stars = 0, ms = [], pk = [], spawn = 0.5, spawnS = 2, keys = {};
    const bgStars = Array.from({ length: 40 }, () => [Math.random() * 600, Math.random() * 400, Math.random() * 2 + 0.5]);
    ctx.listen(window, 'keydown', (e) => { keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); });
    ctx.listen(window, 'keyup', (e) => { keys[e.code] = false; });
    ctx.loop((dt, t) => {
      let tx = sx, ty = sy; if (cv.ptr.seen || cv.ptr.down) { tx = cv.ptr.x; ty = cv.ptr.y - (cv.ptr.down ? 36 : 0); }
      const dx = tx - sx, dy = ty - sy, dist = Math.hypot(dx, dy) || 1, mv = Math.min(dist, 440 * dt * (1 + dist / 120));
      sx += dx / dist * mv; sy += dy / dist * mv;
      if (keys.ArrowLeft || keys.KeyA) sx -= 340 * dt; if (keys.ArrowRight || keys.KeyD) sx += 340 * dt; if (keys.ArrowUp || keys.KeyW) sy -= 340 * dt; if (keys.ArrowDown || keys.KeyS) sy += 340 * dt;
      sx = Math.max(18, Math.min(582, sx)); sy = Math.max(18, Math.min(382, sy)); inv = Math.max(0, inv - dt);
      spawn -= dt; spawnS -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.16, 0.5 - t * 0.02 - ctx.diff * 0.07) * (0.6 + ctx.rand() * 0.8);
        const side = ctx.int(0, 2), r = ctx.rand(11, 26); let x, y;
        if (side === 0) { x = ctx.rand(0, 600); y = -30; } else if (side === 1) { x = -30; y = ctx.rand(0, 250); } else { x = 630; y = ctx.rand(0, 250); }
        const aim = Math.atan2(sy + ctx.rand(-90, 90) - y, sx + ctx.rand(-90, 90) - x), v = ctx.rand(150, 240) + ctx.diff * 35 + t * 6;
        ms.push({ x, y, vx: Math.cos(aim) * v, vy: Math.sin(aim) * v, r, a: 0, va: ctx.rand(-3, 3) });
      }
      if (spawnS <= 0) { spawnS = ctx.rand(1.2, 2.2); pk.push({ x: ctx.rand(40, 560), y: ctx.rand(40, 360), l: 3.2 }); }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#05051a'); bg.addColorStop(1, '#1c1040'); cv.clear(bg);
      bgStars.forEach((s) => { s[1] += s[2] * 14 * dt; if (s[1] > 400) s[1] = 0; cv.circle(s[0], s[1], s[2] * 0.7, 'rgba(255,255,255,.6)'); });
      for (let i = pk.length - 1; i >= 0; i--) { const p = pk[i]; p.l -= dt; if (p.l <= 0) { pk.splice(i, 1); continue; } cv.emoji('⭐', p.x, p.y, 34 + Math.sin(t * 8) * 3); if (Math.hypot(p.x - sx, p.y - sy) < 30) { stars++; ctx.sfx.coin(); cv.burst(p.x, p.y, '#ffd43b', 10); cv.float('+20', p.x, p.y - 12, '#ffe066'); pk.splice(i, 1); } }
      for (let i = ms.length - 1; i >= 0; i--) {
        const m = ms[i]; m.x += m.vx * dt; m.y += m.vy * dt; m.a += m.va * dt;
        cv.emoji('☄️', m.x, m.y, m.r * 2.4, m.a * 0.2 + 0.8);
        if (inv <= 0 && Math.hypot(m.x - sx, m.y - sy) < m.r * 0.8 + 11) { lives--; inv = 1.2; ms.splice(i, 1); ctx.sfx.bad(); ctx.shake(); ctx.flash('bad'); cv.burst(sx, sy, '#ff6b35', 18, 240); if (lives <= 0) { ctx.sfx.lose(); ctx.finish(500); } }
        else if (m.x < -80 || m.x > 680 || m.y > 480) ms.splice(i, 1);
      }
      if (!ctx.ended) ctx.setScore(t * 20 + stars * 20);
      if (inv <= 0 || Math.floor(inv * 14) % 2 === 0) cv.emoji(lives > 0 ? '🚀' : '💥', sx, sy, 36, -0.8);
      for (let i = 0; i < 2; i++) cv.emoji(i < lives ? '❤️' : '🖤', 28 + i * 30, 26, 24);
      cv.text(String(ctx.score), 570, 26, { size: 28, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };

  /* 21 ─ TECLEA RÁPIDO */
  G.typing = function (ctx) {
    const WORDS = ['casa', 'gato', 'perro', 'luz', 'mesa', 'silla', 'sol', 'luna', 'mar', 'playa', 'nube', 'lluvia', 'viento', 'fuego', 'tierra', 'agua', 'libro', 'lapiz', 'papel', 'tinta', 'radio', 'video', 'juego', 'ganar', 'campeon', 'premio', 'punto', 'ronda', 'carrera', 'salto', 'rapido', 'fuerte', 'dulce', 'verde', 'rojo', 'azul', 'negro', 'blanco', 'cielo', 'monte', 'rio', 'lago', 'isla', 'selva', 'tigre', 'oso', 'pato', 'vaca', 'caballo', 'pelota', 'tren', 'barco', 'avion', 'moto', 'coche', 'calle', 'puente', 'torre', 'reloj', 'llave', 'puerta', 'ventana', 'techo', 'jardin', 'flor', 'arbol', 'hoja', 'fruta', 'manzana', 'naranja', 'limon', 'queso', 'pan', 'leche', 'cafe', 'torta', 'helado', 'musica', 'baile', 'fiesta', 'amigo', 'risa', 'feliz', 'sueno'];
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', 'Escribí la palabra y listo', d), box = h('div', 'type-word', '', d);
    const input = h('input', 'type-input', '', d); input.type = 'text'; input.autocomplete = 'off'; input.autocapitalize = 'none'; input.spellcheck = false; input.setAttribute('autocorrect', 'off'); input.placeholder = 'Escribí acá…';
    let word = '', done = 0, last = '';
    function nextWord() {
      const pool = WORDS.filter((w) => w !== last && (ctx.diff === 0 ? w.length <= 5 : ctx.diff === 1 ? w.length <= 7 : true));
      word = ctx.pick(pool); last = word; input.value = ''; render('');
    }
    function render(val) {
      box.innerHTML = '';
      const ok = word.startsWith(val);
      for (let i = 0; i < word.length; i++) { const s = h('span', i < val.length ? (ok ? 'c-ok' : 'c-bad') : '', word[i], box); }
      input.classList.toggle('bad', !ok);
    }
    input.addEventListener('input', () => {
      const v = input.value.toLowerCase().replace(/\s/g, ''); input.value = v; render(v);
      if (v === word) { done++; ctx.addScore(word.length * 5); ctx.sfx.good(); ctx.flash('good'); nextWord(); }
      else if (!word.startsWith(v)) ctx.sfx.tick();
    });
    ctx.listen(window, 'keydown', () => { if (document.activeElement !== input) input.focus(); });
    d.addEventListener('pointerdown', () => input.focus());
    setTimeout(() => input.focus(), 30); nextWord();
  };

  /* 22 ─ RITMO */
  G.rhythm = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const N = ctx.diff === 2 ? 5 : 4, LX = 120, LW = 360 / N, HIT_Y = 330, FALL = ctx.diff === 2 ? 1.2 : 1.3;
    const COLS = N === 5 ? ['#ff6b8b', '#ffd43b', '#c77dff', '#4ade80', '#60a5fa'] : ['#ff6b8b', '#ffd43b', '#4ade80', '#60a5fa'];
    const LABELS = N === 5 ? ['D', 'F', 'ESP', 'J', 'K'] : ['D', 'F', 'J', 'K'];
    const notes = []; let tt = 1.6, lane = ctx.int(0, N - 1);
    while (tt < 13.2) { notes.push({ t: tt, lane, hit: false, miss: false }); tt += ctx.pick([0.45, 0.45, 0.6, 0.3 + 0.0001 * 0]) * (1 - ctx.diff * 0.06); lane = ctx.chance(0.2) ? lane : ctx.int(0, N - 1); }
    const glow = Array(N).fill(0); let combo = 0, judge = '', judgeT = 0, now = 0;
    const KEYS = N === 5
      ? { KeyD: 0, KeyF: 1, Space: 2, KeyJ: 3, KeyK: 4, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 3, ArrowRight: 4 }
      : { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
    function press(l) {
      if (ctx.ended) return; glow[l] = 1;
      let best = null, be = 9;
      for (const n of notes) if (n.lane === l && !n.hit && !n.miss) { const e = Math.abs(n.t - now); if (e < be) { be = e; best = n; } }
      if (best && be <= 0.17) {
        best.hit = true; combo++;
        const pts = be <= 0.06 ? 30 : be <= 0.11 ? 18 : 8; judge = be <= 0.06 ? '¡PERFECTO!' : be <= 0.11 ? 'BIEN' : 'OK';
        ctx.addScore(pts + Math.floor(combo / 5) * 2); judgeT = 0.5; ctx.sfx.note(l); cv.burst(LX + l * LW + LW / 2, HIT_Y, COLS[l], 8, 150);
      } else { ctx.addScore(-8); combo = 0; ctx.sfx.bad(); judge = 'FALLASTE'; judgeT = 0.4; }
    }
    ctx.key((e) => { if (e.code in KEYS) press(KEYS[e.code]); });
    cv.onDown((x) => { const l = Math.floor((x - LX) / LW); if (l >= 0 && l < N) press(l); else press(x < LX ? 0 : N - 1); });
    ctx.loop((dt, t) => {
      now = t;
      for (const n of notes) if (!n.hit && !n.miss && now - n.t > 0.17) { n.miss = true; combo = 0; judge = 'MISS'; judgeT = 0.4; }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#220a3a'); bg.addColorStop(1, '#0f0520'); cv.clear(bg);
      for (let l = 0; l < N; l++) {
        glow[l] = Math.max(0, glow[l] - dt * 5);
        cv.rrect(LX + l * LW + 3, 0, LW - 6, 400, 8, `rgba(255,255,255,${0.04 + glow[l] * 0.18})`);
        cv.rrect(LX + l * LW + 6, HIT_Y - 18, LW - 12, 36, 12, null, COLS[l], 4);
        cv.text(LABELS[l], LX + l * LW + LW / 2, HIT_Y + 44, { size: 18, color: 'rgba(255,255,255,.55)' });
      }
      for (const n of notes) {
        const y = HIT_Y - (n.t - now) / FALL * (HIT_Y + 20); if (n.hit || y < -30 || y > 420) continue;
        cv.rrect(LX + n.lane * LW + 8, y - 15, LW - 16, 30, 12, n.miss ? 'rgba(120,120,120,.5)' : COLS[n.lane], '#fff', 2);
      }
      judgeT = Math.max(0, judgeT - dt);
      if (judgeT > 0) cv.text(judge, 300, 150, { size: 34, weight: 700, color: judge === 'MISS' || judge === 'FALLASTE' ? '#ff8787' : '#ffe066', stroke: 'rgba(0,0,0,.5)' });
      if (combo > 1) cv.text(combo + ' combo', 300, 190, { size: 20, color: 'rgba(255,255,255,.8)' });
      cv.text(String(ctx.score), 570, 26, { size: 30, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };

  /* 23 ─ GLOBOS COLOR */
  G.balloons = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const COL = [['ROJOS', '#ff4757'], ['AZULES', '#3d8bff'], ['VERDES', '#2ed573'], ['AMARILLOS', '#ffc312'], ['VIOLETAS', '#a55eea']];
    let ts = ctx.int(0, 4), tTimer = 0, list = [], spawn = 0.2, bannerT = 1;
    cv.onDown((x, y) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        if (Math.hypot(x - b.x, (y - b.y) * 0.85) < b.r + 6) {
          list.splice(i, 1); cv.burst(b.x, b.y, b.gold ? '#ffd43b' : COL[b.c][1], 12, 200);
          if (b.gold) { ctx.addScore(25); ctx.sfx.win(); cv.float('+25', b.x, b.y, '#ffe066', 30); }
          else if (b.c === ts) { ctx.addScore(10); ctx.sfx.pop(); cv.float('+10', b.x, b.y, '#fff'); }
          else { ctx.addScore(-10); ctx.sfx.bad(); ctx.shake(); cv.float('-10', b.x, b.y, '#ff6b6b'); ctx.lock(450); }
          return;
        }
      }
      ctx.addScore(-3); cv.float('-3', x, y - 10, '#ff8787', 20); ctx.sfx.bad(); ctx.lock(300); // tocar el aire también cuesta
    });
    ctx.loop((dt, t) => {
      tTimer += dt; bannerT = Math.max(0, bannerT - dt);
      if (tTimer > 3.4 - ctx.diff * 0.5) { tTimer = 0; let n; do { n = ctx.int(0, 4); } while (n === ts); ts = n; bannerT = 1; ctx.sfx.go(); }
      spawn -= dt;
      if (spawn <= 0) { spawn = Math.max(0.16, 0.34 - ctx.diff * 0.05 - t * 0.008) * (0.6 + ctx.rand() * 0.8); list.push({ x: ctx.rand(36, 564), y: 440, v: ctx.rand(110, 170) + ctx.diff * 22 + t * 4, r: ctx.rand(26, 36), c: ctx.int(0, 4), gold: ctx.chance(0.05), ph: ctx.rand(0, 6) }); }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#7ed0ff'); bg.addColorStop(1, '#d8f1ff'); cv.clear(bg);
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i]; b.y -= b.v * dt; const wx = b.x + Math.sin(t * 2 + b.ph) * 10;
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(wx, b.y + b.r); g.lineTo(wx + Math.sin(t * 3 + b.ph) * 5, b.y + b.r + 28); g.stroke();
        const col = b.gold ? '#ffd43b' : COL[b.c][1];
        g.fillStyle = col; g.beginPath(); g.ellipse(wx, b.y, b.r * 0.82, b.r, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(wx - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.18, b.r * 0.3, 0.5, 0, Math.PI * 2); g.fill();
        if (b.gold) cv.text('★', wx, b.y, { size: 24, color: '#fff' });
        b.x = b.x; if (b.y < -60) list.splice(i, 1); else { b.dx = wx; }
      }
      cv.rrect(110, 8, 380, 46, 23, 'rgba(20,10,50,.82)', COL[ts][1], 4 + bannerT * 3);
      cv.text(`¡Reventá los ${COL[ts][0]}!`, 300, 32, { size: 24 + bannerT * 4, weight: 700, color: COL[ts][1], stroke: 'rgba(0,0,0,.4)', lw: 3 });
      cv.text(String(ctx.score), 570, 80, { size: 32, align: 'right', weight: 700, stroke: 'rgba(0,0,0,.35)' });
      cv.fxStep(dt);
    });
  };

  /* 24 ─ GANA AL ROBOT */
  G.rps = function (ctx) {
    const MOVES = ['✊', '✋', '✌️']; // piedra, papel, tijera: i vence a (i+2)%3  (papel>piedra, tijera>papel, piedra>tijera)
    const beats = (a, b) => (a + 2) % 3 === b;
    const d = ctx.dom('g-center');
    const rule = h('div', 'g-banner', '', d), robot = h('div', 'rps-robot', '', d), row = h('div', 'g-row', '', d);
    let rm = 0, win = true, streak = 0;
    MOVES.forEach((m, i) => { const b = h('button', 'gbtn yellow big', `<small>${i + 1}</small>${m}`, row); ctx.press(b, () => pick(i)); });
    function next() {
      rm = ctx.int(0, 2); win = ctx.diff === 0 ? true : ctx.chance(0.55);
      robot.innerHTML = `<span class="bot">🤖</span><span class="mv">${MOVES[rm]}</span>`;
      rule.textContent = win ? '🏆 ¡GANALE!' : '💀 ¡PERDÉ A PROPÓSITO!'; rule.className = 'g-banner ' + (win ? 'good' : 'bad');
    }
    function pick(i) {
      const ok = win ? beats(i, rm) : beats(rm, i);
      if (ok) { streak++; ctx.right(10 + Math.min(streak, 5)); } else { streak = 0; ctx.wrong(10); }
      next();
    }
    ctx.key((e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 3) pick(n - 1); });
    next();
  };
})();
