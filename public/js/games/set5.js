/* Juegos nuevos B: Visión, Mente, Acción y Ritmo/Teclado */
(function () {
  'use strict';
  const G = window.Games.impl;
  const h = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const digitKey = (e) => { const n = parseInt(e.key, 10); return n >= 1 && n <= 4 ? n - 1 : -1; };
  function choice4(ctx, parent, cls, labels, pick) {
    parent.innerHTML = '';
    labels.forEach((lb, i) => { const b = h('button', 'gbtn ' + cls, `<small>${i + 1}</small>${lb}`, parent); ctx.press(b, () => pick(i)); });
  }

  /* ═════════════ 👀 VISIÓN ═════════════ */

  /* BUSCA EL EMOJI */
  G.findemoji = function (ctx) {
    const PAIRS = [['😀', '😃'], ['🙂', '🙃'], ['🍎', '🍅'], ['🐶', '🐺'], ['🕐', '🕑'], ['😗', '😙'], ['⭐', '🌟'], ['🐱', '🐯'], ['🍊', '🥭'], ['😐', '😑'], ['🌞', '🌝'], ['🐸', '🐢'], ['🍓', '🍒'], ['🔔', '🔕'], ['😮', '😯'], ['🧡', '🟠']];
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d), grid = h('div', 'fe-grid', '', d);
    let lvl = 0, t0 = performance.now();
    function build() {
      const cols = Math.min(8, 4 + Math.floor(lvl / 2) + (ctx.diff > 0 ? 1 : 0)), rows = Math.min(5, 3 + Math.floor(lvl / 3) + (ctx.diff === 2 ? 1 : 0));
      const [a, b0] = ctx.pick(PAIRS), swap = ctx.chance(0.5), base = swap ? b0 : a, odd = swap ? a : b0, idx = ctx.int(0, cols * rows - 1);
      grid.style.setProperty('--cols', cols); grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; grid.innerHTML = '';
      for (let i = 0; i < cols * rows; i++) { const c = h('button', 'fe-cell', i === idx ? odd : base, grid); ctx.press(c, () => pick(i === idx, c)); }
      info.innerHTML = `Encontrá el <b>${odd}</b> escondido entre los <b>${base}</b>`; t0 = performance.now();
    }
    function pick(ok, node) {
      if (ok) { const sec = (performance.now() - t0) / 1000; ctx.right(15 + Math.max(0, Math.round(10 - sec * 2.5))); lvl++; build(); }
      else { node.classList.add('err'); ctx.wrong(8); }
    }
    build();
  };

  /* MÁS PUNTOS */
  G.majority = function (ctx) {
    const COLS = [['#4d8dff', 'AZUL'], ['#ff8a3d', 'NARANJA']];
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d), field = h('div', 'maj-field', '', d), row = h('div', 'g-row', '', d);
    const bA = h('button', 'gbtn maj', '🔵 Azul', row), bB = h('button', 'gbtn maj orange', '🟠 Naranja', row);
    let state = 'show', ans = 0, streak = 0;
    const showMs = [1500, 1050, 780][ctx.diff], share = [0.64, 0.57, 0.535][ctx.diff];
    function trial() {
      state = 'show'; field.innerHTML = ''; row.classList.add('dim'); info.textContent = '¡Mirá bien los puntos!';
      const n = ctx.int(26, 46); let a = Math.round(n * share); if (a * 2 === n) a++;
      ans = ctx.chance(0.5) ? 0 : 1; const counts = ans === 0 ? [a, n - a] : [n - a, a], placed = [];
      for (let c = 0; c < 2; c++) for (let i = 0; i < counts[c]; i++) {
        let x, y, tries = 0;
        do { x = ctx.rand(4, 94); y = ctx.rand(5, 90); tries++; } while (tries < 30 && placed.some((p) => Math.hypot((p[0] - x) * 1.6, p[1] - y) < 8));
        placed.push([x, y]); const s = h('span', 'dot', '', field); s.style.left = x + '%'; s.style.top = y + '%'; s.style.background = COLS[c][0];
      }
      ctx.after(showMs, () => { field.innerHTML = '<div class="g-big">?</div>'; info.textContent = '¿De qué color había MÁS puntos?'; row.classList.remove('dim'); state = 'ask'; });
    }
    function pick(i) {
      if (state !== 'ask') return; state = 'wait';
      if (i === ans) { streak++; ctx.right(14 + Math.min(streak, 5)); } else { streak = 0; ctx.wrong(10, 800); }
      trial();
    }
    ctx.press(bA, () => pick(0)); ctx.press(bB, () => pick(1));
    ctx.key((e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick(0); if (e.code === 'ArrowRight' || e.code === 'KeyD') pick(1); });
    trial();
  };

  /* LEE EL RELOJ */
  G.clock = function (ctx) {
    const d = ctx.dom('g-center');
    h('div', 'g-sub', '¿Qué hora marca el reloj?', d);
    const face = h('div', 'clock-face', '', d), grid = h('div', 'g-grid g-grid2', '', d);
    let ans = '', opts = [], streak = 0;
    const fmt = (hh, mm) => `${hh}:${String(mm).padStart(2, '0')}`;
    function svg(hh, mm, nums) {
      const P = (deg, r) => [110 + r * Math.sin(deg * Math.PI / 180), 110 - r * Math.cos(deg * Math.PI / 180)];
      let s = '<svg viewBox="0 0 220 220" width="100%" height="100%"><circle cx="110" cy="110" r="102" fill="#fff" stroke="#2a1a4a" stroke-width="6"/>';
      for (let i = 0; i < 12; i++) { const [x1, y1] = P(i * 30, 92), [x2, y2] = P(i * 30, 100); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a1a4a" stroke-width="4"/>`; }
      if (nums) for (let i = 1; i <= 12; i++) { const [x, y] = P(i * 30, 76); s += `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="19" font-weight="700" fill="#2a1a4a" font-family="sans-serif">${i}</text>`; }
      const [hx, hy] = P((hh % 12) * 30 + mm * 0.5, 52), [mx, my] = P(mm * 6, 80);
      s += `<line x1="110" y1="110" x2="${hx}" y2="${hy}" stroke="#2a1a4a" stroke-width="9" stroke-linecap="round"/><line x1="110" y1="110" x2="${mx}" y2="${my}" stroke="#ff4d6d" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="110" r="7" fill="#2a1a4a"/></svg>`;
      return s;
    }
    function make() {
      const hh = ctx.int(1, 12), mm = ctx.diff === 0 ? ctx.pick([0, 30]) : ctx.int(0, 11) * 5;
      ans = fmt(hh, mm); face.innerHTML = svg(hh, mm, ctx.diff < 2);
      const cand = new Set([fmt((hh % 12) + 1, mm), fmt(((hh + 10) % 12) + 1, mm), fmt(hh, (mm + 30) % 60), fmt(hh, (mm + 5) % 60), fmt(hh, (mm + 55) % 60)]);
      if (mm % 5 === 0 && mm !== 0) cand.add(fmt(mm / 5, (hh % 12) * 5));
      cand.delete(ans);
      const pool = ctx.shuffle([...cand]); const set = [ans, ...pool.slice(0, 3)]; let g = 0;
      while (set.length < 4 && g++ < 30) { const x = fmt(ctx.int(1, 12), ctx.int(0, 11) * 5); if (!set.includes(x)) set.push(x); }
      opts = ctx.shuffle(set); choice4(ctx, grid, 'purple clk', opts, pick);
    }
    function pick(i) { if (opts[i] === ans) { streak++; ctx.right(14 + Math.min(streak, 4)); } else { streak = 0; ctx.wrong(8); } make(); }
    ctx.key((e) => { const i = digitKey(e); if (i >= 0) pick(i); });
    make();
  };

  /* ═════════════ 🧠 MENTE ═════════════ */

  /* VERDADERO O FALSO */
  G.truefalse = function (ctx) {
    const d = ctx.dom('g-center');
    h('div', 'g-sub', '¿La cuenta está bien?', d);
    const eq = h('div', 'g-big', '', d), row = h('div', 'g-row', '', d);
    const bT = h('button', 'gbtn green big', '<small>←</small>✔', row), bF = h('button', 'gbtn red big', '<small>→</small>✘', row);
    let truth = true, streak = 0;
    function make() {
      const op = ctx.int(0, ctx.diff === 0 ? 1 : 2); let a, b, r;
      if (op === 0) { a = ctx.int(3, [30, 60, 99][ctx.diff]); b = ctx.int(3, [30, 60, 99][ctx.diff]); r = a + b; }
      else if (op === 1) { a = ctx.int(10, [50, 80, 120][ctx.diff]); b = ctx.int(2, a - 2); r = a - b; }
      else { a = ctx.int(3, [9, 11, 14][ctx.diff]); b = ctx.int(3, [9, 11, 14][ctx.diff]); r = a * b; }
      truth = ctx.chance(0.5); let shown = r;
      if (!truth) { const off = ctx.pick(ctx.diff === 0 ? [1, 2, 3, 10] : [1, 1, 2, 10, 10, 9, 11]); shown = r + (ctx.chance(0.5) ? off : -off); if (shown === r || shown < 0) shown = r + off; }
      eq.textContent = `${a} ${['+', '−', '×'][op]} ${b} = ${shown}`;
    }
    function pick(v) { if (v === truth) { streak++; ctx.right(10 + Math.min(streak, 6)); } else { streak = 0; ctx.wrong(10, 900); } make(); }
    ctx.press(bT, () => pick(true)); ctx.press(bF, () => pick(false));
    ctx.key((e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyV' || e.code === 'KeyA') pick(true); if (e.code === 'ArrowRight' || e.code === 'KeyF' || e.code === 'KeyD') pick(false); });
    make();
  };

  /* PALABRA INTRUSA */
  G.category = function (ctx) {
    const GR = [
      { fam: 'fauna', w: ['perro', 'gato', 'caballo', 'vaca', 'oveja', 'conejo', 'tigre', 'elefante', 'jirafa', 'zorro'] },
      { fam: 'fauna', w: ['gallina', 'paloma', 'búho', 'cisne', 'pato', 'loro', 'águila', 'pingüino', 'flamenco'] },
      { fam: 'comida', w: ['manzana', 'pera', 'banana', 'uva', 'frutilla', 'durazno', 'sandía', 'melón', 'ananá'] },
      { fam: 'comida', w: ['zanahoria', 'papa', 'lechuga', 'cebolla', 'zapallo', 'brócoli', 'espinaca', 'choclo', 'remolacha'] },
      { fam: 'musica', w: ['guitarra', 'violín', 'arpa', 'bajo', 'chelo', 'ukelele', 'mandolina'] },
      { fam: 'musica', w: ['flauta', 'trompeta', 'clarinete', 'saxofón', 'trombón', 'oboe'] },
      { fam: 'musica', w: ['tambor', 'bombo', 'platillos', 'xilófono', 'timbal', 'pandereta'] },
      { fam: 'deporte', w: ['fútbol', 'básquet', 'tenis', 'vóley', 'rugby', 'handball', 'hockey', 'golf'] },
      { fam: 'deporte', w: ['natación', 'ajedrez', 'boxeo', 'ciclismo', 'esgrima', 'judo', 'atletismo', 'gimnasia'] },
      { fam: 'viaje', w: ['auto', 'colectivo', 'tren', 'moto', 'bicicleta', 'camión', 'tranvía'] },
      { fam: 'viaje', w: ['avión', 'helicóptero', 'globo', 'parapente', 'cohete', 'dron'] },
      { fam: 'viaje', w: ['barco', 'lancha', 'submarino', 'velero', 'canoa', 'ferry'] },
      { fam: 'casa', w: ['remera', 'pantalón', 'campera', 'zapatos', 'gorra', 'bufanda', 'medias', 'pollera'] },
      { fam: 'casa', w: ['mesa', 'silla', 'sillón', 'cama', 'ropero', 'escritorio', 'estante'] },
      { fam: 'casa', w: ['martillo', 'serrucho', 'destornillador', 'taladro', 'pinza', 'llave', 'pala'] },
      { fam: 'cielo', w: ['Marte', 'Venus', 'Júpiter', 'Saturno', 'Neptuno', 'Urano', 'Mercurio'] },
      { fam: 'mundo', w: ['Argentina', 'Brasil', 'Chile', 'Perú', 'Italia', 'Japón', 'México', 'Egipto', 'Canadá'] },
      { fam: 'cuerpo', w: ['mano', 'pie', 'ojo', 'nariz', 'oreja', 'rodilla', 'codo', 'hombro'] }
    ];
    const d = ctx.dom('g-center');
    h('div', 'g-banner bad', '🚫 ¿Cuál NO pertenece al grupo?', d);
    const grid = h('div', 'g-grid g-grid2', '', d);
    let ans = '', opts = [], streak = 0;
    function make() {
      const ia = ctx.int(0, GR.length - 1), A = GR[ia];
      let pool = GR.filter((x, i) => i !== ia && (ctx.diff === 2 ? x.fam === A.fam : x.fam !== A.fam));
      if (!pool.length) pool = GR.filter((x, i) => i !== ia);
      const B = ctx.pick(pool), three = ctx.shuffle(A.w).slice(0, 3);
      let odd = ctx.pick(B.w), g = 0; while (A.w.includes(odd) && g++ < 20) odd = ctx.pick(B.w);
      ans = odd; opts = ctx.shuffle([...three, odd]); choice4(ctx, grid, 'pink word', opts, pick);
    }
    function pick(i) { if (opts[i] === ans) { streak++; ctx.right(14 + Math.min(streak, 4)); } else { streak = 0; ctx.wrong(8); } make(); }
    ctx.key((e) => { const i = digitKey(e); if (i >= 0) pick(i); });
    make();
  };

  /* ═════════════ 🕹️ ACCIÓN ═════════════ */

  /* SERPIENTE */
  G.snake = function (ctx) {
    const W = 600, H = 390, CS = 30, COLS = 20, ROWS = 13;
    const cv = ctx.canvas(W, H); const g = cv.g;
    const wrap = ctx.diff === 0, base = [0.2, 0.15, 0.12][ctx.diff];
    let snake = [[6, 6], [5, 6], [4, 6]], dir = [1, 0], queue = [], acc = 0, apple = null, apples = 0, dead = false, grow = 0, golden = false, goldenT = 0, sx = 0, sy = 0;
    const DIRS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    function place() {
      for (let k = 0; k < 200; k++) { const x = ctx.int(0, COLS - 1), y = ctx.int(0, ROWS - 1); if (!snake.some((s) => s[0] === x && s[1] === y)) { apple = [x, y]; break; } }
      golden = apples > 0 && apples % 5 === 4; goldenT = golden ? 6 : 0;
    }
    function turn(v) { const last = queue.length ? queue[queue.length - 1] : dir; if (v[0] === -last[0] && v[1] === -last[1]) return; if (v[0] === last[0] && v[1] === last[1]) return; if (queue.length < 2) queue.push(v); }
    ctx.key((e) => { if (DIRS[e.code]) turn(DIRS[e.code]); });
    cv.onDown((x, y) => { sx = x; sy = y; });
    cv.onMove((x, y) => { if (!cv.ptr.down) return; const dx = x - sx, dy = y - sy; if (Math.hypot(dx, dy) < 22) return; turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); sx = x; sy = y; });
    place();
    function die() { if (dead) return; dead = true; ctx.sfx.lose(); ctx.shake(); ctx.flash('bad'); ctx.finish(700); }
    ctx.loop((dt) => {
      if (!dead) {
        acc += dt; goldenT = Math.max(0, goldenT - dt); if (golden && goldenT <= 0) { golden = false; apple && (apple = apple); }
        const step = Math.max(0.07, base - snake.length * 0.0018);
        while (acc >= step && !dead) {
          acc -= step; if (queue.length) dir = queue.shift();
          let nx = snake[0][0] + dir[0], ny = snake[0][1] + dir[1];
          if (wrap) { nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS; } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { die(); break; }
          if (snake.some((s, i) => i < snake.length - (grow > 0 ? 0 : 1) && s[0] === nx && s[1] === ny)) { die(); break; }
          snake.unshift([nx, ny]);
          if (apple && nx === apple[0] && ny === apple[1]) {
            const gp = golden && goldenT > 0; apples++; ctx.addScore(gp ? 50 : 20); ctx.sfx.coin(); grow += 1; cv.burst(nx * CS + 15, ny * CS + 15, gp ? '#ffe066' : '#ff6b6b', 10, 180); cv.float(gp ? '+50' : '+20', nx * CS + 15, ny * CS, gp ? '#ffe066' : '#fff', 22); place();
          }
          if (grow > 0) grow--; else snake.pop();
        }
      }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? '#1d3b26' : '#234a2e'; g.fillRect(x * CS, y * CS, CS, CS); }
      if (apple) cv.emoji(golden && goldenT > 0 ? '🌟' : '🍎', apple[0] * CS + 15, apple[1] * CS + 15, 26);
      snake.forEach((s, i) => { cv.rrect(s[0] * CS + 2, s[1] * CS + 2, CS - 4, CS - 4, 9, `hsl(${120 - Math.min(60, i * 3)},65%,${i === 0 ? 62 : 48}%)`); });
      if (snake[0]) { cv.emoji(dead ? '😵' : '😛', snake[0][0] * CS + 15, snake[0][1] * CS + 15, 22); }
      cv.text(String(ctx.score), 580, 22, { size: 28, align: 'right', weight: 700, stroke: 'rgba(0,0,0,.5)' });
      if (wrap) cv.text('modo fácil: sin paredes', 10, 372, { size: 14, align: 'left', color: 'rgba(255,255,255,.55)' });
      cv.fxStep(dt);
    });
  };

  /* DEFENSA ESPACIAL */
  G.shooter = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    let sx = 300, lives = 3, inv = 0, fire = 0, spawn = 0.5, keys = {}, bullets = [], foes = [];
    const FY = 360, rate = [0.2, 0.22, 0.25][ctx.diff];
    const stars = Array.from({ length: 36 }, () => [ctx.rand(0, 600), ctx.rand(0, 400), ctx.rand(0.6, 2)]);
    ctx.listen(window, 'keydown', (e) => { keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); });
    ctx.listen(window, 'keyup', (e) => { keys[e.code] = false; });
    ctx.loop((dt, t) => {
      const target = (cv.ptr.seen || cv.ptr.down) ? cv.ptr.x : sx; sx += (target - sx) * Math.min(1, dt * 16);
      if (keys.ArrowLeft || keys.KeyA) sx -= 420 * dt; if (keys.ArrowRight || keys.KeyD) sx += 420 * dt;
      sx = clamp(sx, 24, 576); inv = Math.max(0, inv - dt);
      fire -= dt; if (fire <= 0 && lives > 0) { fire = rate; bullets.push({ x: sx, y: FY - 20 }); }
      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.26, 0.85 - t * 0.03 - ctx.diff * 0.1) * (0.7 + ctx.rand() * 0.6);
        const r = ctx.rand(), x = ctx.rand(30, 570), sp = 62 + ctx.rand(0, 25) + t * 2 + ctx.diff * 14;
        if (t > 4 && r < 0.2) foes.push({ x, y: -24, hp: 3, max: 3, v: sp * 0.7, pts: 30, e: '🛸', z: 0 });
        else if (t > 8 && r < 0.45) foes.push({ x, y: -24, hp: 1, max: 1, v: sp * 1.1, pts: 20, e: '👽', z: ctx.rand(0, 6), x0: x });
        else foes.push({ x, y: -24, hp: 1, max: 1, v: sp, pts: 10, e: '👾', z: 0 });
      }
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#05051a'); bg.addColorStop(1, '#1c1040'); cv.clear(bg);
      stars.forEach((s) => { s[1] += s[2] * 30 * dt; if (s[1] > 400) s[1] = 0; cv.circle(s[0], s[1], s[2] * 0.7, 'rgba(255,255,255,.6)'); });
      for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.y -= 560 * dt; if (b.y < -10) { bullets.splice(i, 1); continue; } cv.rrect(b.x - 2, b.y - 8, 4, 14, 2, '#8cffd6'); }
      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i]; f.y += f.v * dt; if (f.z) f.x = clamp(f.x0 + Math.sin(t * 3 + f.z) * 60, 20, 580);
        let dead = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.abs(b.x - f.x) < 22 && Math.abs(b.y - f.y) < 20) { bullets.splice(j, 1); f.hp--; cv.burst(b.x, b.y, '#8cffd6', 3, 90); if (f.hp <= 0) { dead = true; break; } else ctx.sfx.tick(); }
        }
        if (dead) { ctx.addScore(f.pts); ctx.sfx.pop(); cv.burst(f.x, f.y, '#ffd43b', 12, 200); cv.float('+' + f.pts, f.x, f.y - 10, '#ffe066', 20); foes.splice(i, 1); continue; }
        if (inv <= 0 && lives > 0 && Math.hypot(f.x - sx, f.y - FY) < 32) { lives--; inv = 1.2; foes.splice(i, 1); ctx.sfx.bad(); ctx.shake(); ctx.flash('bad'); cv.burst(sx, FY, '#ff6b35', 16, 230); if (lives <= 0) { ctx.sfx.lose(); ctx.finish(600); } continue; }
        if (f.y > 392) { foes.splice(i, 1); if (lives > 0) { lives--; ctx.sfx.bad(); ctx.shake(); ctx.flash('bad'); if (lives <= 0) { ctx.sfx.lose(); ctx.finish(600); } } continue; }
        cv.emoji(f.e, f.x, f.y, 38);
        if (f.max > 1) { cv.rrect(f.x - 18, f.y - 28, 36, 5, 2, 'rgba(0,0,0,.5)'); cv.rrect(f.x - 18, f.y - 28, 36 * f.hp / f.max, 5, 2, '#ff6b6b'); }
      }
      if (lives > 0 && (inv <= 0 || Math.floor(inv * 14) % 2 === 0)) cv.emoji('🚀', sx, FY, 40);
      for (let i = 0; i < 3; i++) cv.emoji(i < lives ? '❤️' : '🖤', 28 + i * 30, 26, 24);
      cv.text(String(ctx.score), 580, 26, { size: 30, align: 'right', weight: 700 });
      cv.fxStep(dt);
    });
  };

  /* ═════════════ 🎵 RITMO Y TECLADO ═════════════ */

  /* SIGUE EL PULSO */
  G.pulse = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const bpm = ctx.rand([78, 95, 112][ctx.diff], [98, 115, 134][ctx.diff]), P = 60 / bpm, T0 = 1.0, GUIDE = 6;
    const claimed = new Set(); let played = -1, flash = 0, msg = '', msgT = 0, lastErr = 0, hits = 0;
    function tap() {
      const tt = ctx.elapsed();
      if (tt < T0 + (GUIDE - 0.5) * P) { msg = 'Escuchá el ritmo…'; msgT = 0.6; return; }
      const k = Math.round((tt - T0) / P), e = tt - (T0 + k * P), ae = Math.abs(e);
      if (claimed.has(k) || ae > 0.28 * P) { ctx.wrong(8, 350); msg = claimed.has(k) ? '¡Ya tocaste ese pulso!' : (e < 0 ? '¡Muy pronto!' : '¡Muy tarde!'); msgT = 0.8; return; }
      claimed.add(k); hits++;
      const p = Math.round(50 * (1 - ae / (0.28 * P))); ctx.addScore(p); ctx.sfx.note(k); flash = 1; lastErr = e / (0.28 * P);
      msg = ae < 0.035 ? `¡PERFECTO! +${p}` : `${e < 0 ? 'Un poco pronto' : 'Un poco tarde'} +${p}`; msgT = 0.8;
    }
    cv.onDown(tap); ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') tap(); });
    ctx.loop((dt, t) => {
      const k = Math.floor((t - T0) / P);
      if (k > played && k >= 0 && k < GUIDE) { played = k; ctx.sfx.note(k); flash = 1; }
      flash = Math.max(0, flash - dt * 4); msgT = Math.max(0, msgT - dt);
      const guide = t < T0 + GUIDE * P - 0.05;
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#2a0f44'); bg.addColorStop(1, '#12071f'); cv.clear(bg);
      if (guide) { const r = 70 + flash * 26; g.shadowColor = '#e599f7'; g.shadowBlur = 20 + flash * 40; cv.circle(300, 170, r, `hsl(290,80%,${55 + flash * 20}%)`, '#fff', 5); g.shadowBlur = 0; cv.text(t < T0 ? 'Preparate…' : `${Math.min(GUIDE, Math.max(1, k + 1))}`, 300, 170, { size: 44, weight: 700, stroke: 'rgba(0,0,0,.4)' }); cv.text('🔊 Escuchá y memorizá el ritmo', 300, 290, { size: 22, color: 'rgba(255,255,255,.85)' }); }
      else {
        const r = 70 + flash * 18; cv.circle(300, 170, r, flash > 0.05 ? 'rgba(229,153,247,.35)' : 'rgba(255,255,255,.07)', 'rgba(255,255,255,.35)', 4); cv.text('🙈', 300, 170, { size: 54 });
        cv.text('¡Ahora vos! Seguí tocando al mismo ritmo', 300, 290, { size: 22, color: 'rgba(255,255,255,.85)' });
        cv.rrect(150, 330, 300, 12, 6, 'rgba(255,255,255,.12)'); cv.rrect(298, 326, 4, 20, 2, '#8cffd6');
        if (hits) cv.circle(300 + clamp(lastErr, -1, 1) * 148, 336, 9, '#ffe066');
      }
      if (msgT > 0) { g.globalAlpha = Math.min(1, msgT * 2); cv.text(msg, 300, 230, { size: 26, weight: 700, color: '#ffe066', stroke: 'rgba(0,0,0,.5)' }); g.globalAlpha = 1; }
      cv.text(String(ctx.score), 580, 26, { size: 30, align: 'right', weight: 700 });
    });
  };

  /* TECLA RÁPIDA */
  G.keyletter = function (ctx) {
    const SETS = ['asdfjklgheiou', 'abcdefghijklmnopqrstuvwxyz', 'abcdefghijklmnopqrstuvwxyz0123456789'];
    const pool = SETS[ctx.diff].split('');
    const d = ctx.dom('g-center');
    h('div', 'g-sub', 'Apretá esa tecla en el teclado (o tocá el botón)', d);
    const big = h('div', 'key-big', '', d), grid = h('div', 'g-grid g-grid4', '', d);
    let target = '', opts = [], t0 = 0, token = 0, streak = 0;
    function next() {
      target = ctx.pick(pool); const set = new Set([target]); while (set.size < 4) set.add(ctx.pick(pool));
      opts = ctx.shuffle([...set]); big.textContent = target.toUpperCase(); big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop');
      grid.innerHTML = ''; opts.forEach((o) => { const b = h('button', 'gbtn purple', o.toUpperCase(), grid); ctx.press(b, () => answer(o)); });
      t0 = performance.now(); const my = ++token;
      if (ctx.diff === 2) ctx.after(1700, () => { if (my === token) { ctx.addScore(-3); ctx.sfx.bad(); next(); } });
    }
    function answer(ch) {
      if (ch === target) { const ms = performance.now() - t0; streak++; ctx.right(10 + (ms < 700 ? 6 : ms < 1100 ? 3 : 0) + Math.min(streak, 4)); }
      else { streak = 0; ctx.wrong(8, 800); }
      next();
    }
    ctx.key((e) => { if (e.key && e.key.length === 1 && /[a-z0-9]/i.test(e.key)) answer(e.key.toLowerCase()); });
    next();
  };

  /* ANAGRAMA */
  G.anagram = function (ctx) {
    const WORDS = [
      ['gato', 'mesa', 'luna', 'pato', 'casa', 'rosa', 'playa', 'perro', 'tigre', 'libro', 'nube', 'fuego', 'reloj', 'plato', 'silla', 'lapiz', 'mundo', 'queso', 'arbol', 'barco', 'leche', 'avion', 'radio'],
      ['pelota', 'ventana', 'tortuga', 'teclado', 'gallina', 'cocina', 'planeta', 'camisa', 'cuchara', 'zapato', 'bufanda', 'cohete', 'espejo', 'guante', 'cartera', 'galleta'],
      ['guitarra', 'mariposa', 'chocolate', 'elefante', 'semaforo', 'escalera', 'bicicleta', 'cangrejo', 'sandwich', 'pizarron', 'dinosaur']
    ];
    const pool = ctx.diff === 0 ? WORDS[0] : ctx.diff === 1 ? WORDS[0].concat(WORDS[1]) : WORDS[1].concat(WORDS[2]).filter((w) => w !== 'dinosaur');
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d), tiles = h('div', 'ana-tiles', '', d);
    const input = h('input', 'type-input', '', d); input.type = 'text'; input.autocomplete = 'off'; input.autocapitalize = 'none'; input.spellcheck = false; input.setAttribute('autocorrect', 'off'); input.placeholder = 'Escribí la palabra…';
    const skip = h('button', 'gbtn ghost', 'Pasar (−5)', d);
    let word = '', last = '', t0 = 0;
    function scramble(w) { let s = w, g = 0; while (s === w && g++ < 20) s = ctx.shuffle(w.split('')).join(''); return s; }
    function next() {
      let w; do { w = ctx.pick(pool); } while (w === last); word = last = w; input.value = ''; t0 = performance.now();
      tiles.innerHTML = scramble(w).split('').map((c) => `<span>${c.toUpperCase()}</span>`).join(''); info.textContent = `Ordená las letras (${w.length} letras)`;
    }
    input.addEventListener('input', () => {
      if (ctx.locked) { input.value = ''; return; }
      const v = input.value.toLowerCase().replace(/[^a-zñ]/g, ''); input.value = v;
      if (v.length >= word.length) {
        if (v === word) { const sec = (performance.now() - t0) / 1000; ctx.right(word.length * 5 + (sec < 4 ? 8 : sec < 7 ? 3 : 0)); next(); }
        else { ctx.wrong(8, 800); input.value = ''; }
      }
    });
    ctx.press(skip, () => { ctx.wrong(5, 700); next(); });
    ctx.listen(window, 'keydown', () => { if (document.activeElement !== input) input.focus(); });
    setTimeout(() => input.focus(), 30); next();
  };
})();
