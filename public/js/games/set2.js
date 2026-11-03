/* Juegos 9-16 */
(function () {
  'use strict';
  const G = window.Games.impl;
  const h = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  /* 9 ─ ORDENÁ LOS NÚMEROS */
  G.order = function (ctx) {
    const N = [9, 12, 16][ctx.diff], cols = N === 9 ? 3 : 4;
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d);
    const grid = h('div', 'g-grid', '', d); grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    let next = 1, pen = 0;
    const nums = ctx.shuffle(Array.from({ length: N }, (_, i) => i + 1));
    const upd = () => { info.innerHTML = `Buscá el <b>${Math.min(next, N)}</b> · ${next - 1}/${N}${pen ? ` · penalización ${pen}s` : ''}`; };
    nums.forEach((n) => {
      const b = h('button', 'gbtn blue num', String(n), grid);
      ctx.press(b, () => {
        if (b.disabled) return;
        if (n === next) {
          b.disabled = true; b.classList.add('ok'); next++; ctx.sfx.tap(); ctx.setScore((next - 1) * 20); upd();
          if (next > N) { const t = ctx.elapsed(); ctx.sfx.win(); ctx.setScore(N * 20 + Math.round(Math.max(0, 18 - t - pen) * 50)); info.textContent = '¡Completado!'; ctx.finish(700); }
        } else { pen += 1; b.classList.add('err'); setTimeout(() => b.classList.remove('err'), 250); ctx.wrong(0, 600); upd(); }
      });
    });
    upd();
  };

  /* 10 ─ ENCONTRÁ EL INTRUSO */
  G.odd = function (ctx) {
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d);
    const grid = h('div', 'g-grid odd', '', d);
    let lvl = 0;
    function build() {
      const n = Math.min(7, 2 + Math.floor((lvl + 1) / 2)); const hue = ctx.int(0, 359);
      const delta = Math.max(3.2, 17 - lvl * 1.1 - ctx.diff * 2.5) * (ctx.chance(0.5) ? 1 : -1);
      const odd = ctx.int(0, n * n - 1);
      grid.innerHTML = ''; grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      for (let i = 0; i < n * n; i++) {
        const c = h('button', 'tile', '', grid);
        c.style.background = `hsl(${hue},68%,${i === odd ? 56 + delta : 56}%)`;
        ctx.press(c, () => {
          if (i === odd) { lvl++; ctx.right(10); build(); }
          else { c.classList.add('err'); ctx.wrong(8); }
        });
      }
      info.textContent = `Nivel ${lvl + 1}`;
    }
    build();
  };

  /* 11 ─ EQUILIBRIO */
  G.balance = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g;
    const ph = ctx.rand(0, 6.28), ph2 = ctx.rand(0, 6.28), bandH = [110, 92, 76][ctx.diff];
    let y = 330, v = 0, held = false, inTime = 0, was = false;
    cv.onDown(() => { held = true; }); cv.onUp(() => { held = false; });
    ctx.listen(window, 'keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { held = true; e.preventDefault(); } });
    ctx.listen(window, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') held = false; });
    ctx.loop((dt, t) => {
      v += (held ? -1550 : 760) * dt; v = Math.max(-380, Math.min(420, v)); y += v * dt;
      if (y < 24) { y = 24; v = Math.abs(v) * 0.2; } if (y > 376) { y = 376; v = -Math.abs(v) * 0.2; }
      const sp = 1 + ctx.diff * 0.25;
      const cy = 200 + Math.sin(t * 1.25 * sp + ph) * 105 + Math.sin(t * 2.3 * sp + ph2) * 45;
      const inside = Math.abs(y - cy) < bandH / 2 - 6;
      if (inside) { inTime += dt; if (!was) ctx.sfx.tick(); }
      was = inside; ctx.setScore(inTime * 100);
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#12304a'); bg.addColorStop(1, '#0b1a2e'); cv.clear(bg);
      cv.rrect(240, 8, 120, 384, 30, 'rgba(255,255,255,.07)');
      g.shadowColor = inside ? '#2ee6a6' : 'transparent'; g.shadowBlur = inside ? 28 : 0;
      cv.rrect(244, cy - bandH / 2, 112, bandH, 22, inside ? 'rgba(46,230,166,.75)' : 'rgba(46,230,166,.35)', '#2ee6a6', 3); g.shadowBlur = 0;
      cv.circle(300, y, 24, inside ? '#fff' : '#ffd43b', '#fff', 3); cv.emoji(held ? '🚀' : '⚽', 300, y, 26);
      cv.text(String(ctx.score), 560, 28, { size: 32, align: 'right', weight: 700 });
      cv.text(held ? 'subiendo' : 'cayendo', 60, 28, { size: 18, align: 'left', color: 'rgba(255,255,255,.6)' });
    });
  };

  /* 13 ─ TORRE PERFECTA */
  G.tower = function (ctx) {
    const cv = ctx.canvas(); const g = cv.g; const BH = 28;
    const blocks = [{ x: 200, w: 200, hue: 200 }];
    let cur = { x: 0, w: 200, dir: 1 }, speed = 220 + ctx.diff * 40, cam = 0, lvl = 0, perfect = 0, over = false, debris = [], tail = 0;
    function drop() {
      if (over) return;
      const top = blocks[blocks.length - 1];
      const l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ov = r - l;
      if (ov <= 0) { over = true; debris.push({ x: cur.x, w: cur.w, y: blocks.length, vy: 0, hue: (blocks.length * 17) % 360 }); ctx.sfx.lose(); ctx.shake(); ctx.finish(900); return; }
      const dx = cur.x - top.x;
      if (Math.abs(dx) < 7) { blocks.push({ x: top.x, w: top.w, hue: (blocks.length * 17 + 200) % 360 }); perfect++; ctx.addScore(15); ctx.sfx.win(); cv.float('¡PERFECTO!', 300, 120, '#ffe066', 28); }
      else {
        const nb = { x: l, w: ov, hue: (blocks.length * 17 + 200) % 360 }; blocks.push(nb); ctx.addScore(10); ctx.sfx.pop();
        debris.push(dx > 0 ? { x: r, w: cur.x + cur.w - r, y: blocks.length - 1, vy: 0, hue: nb.hue } : { x: cur.x, w: l - cur.x, y: blocks.length - 1, vy: 0, hue: nb.hue });
      }
      lvl++; speed += 14;
      const nt = blocks[blocks.length - 1]; cur = { x: lvl % 2 ? 600 - nt.w : 0, w: nt.w, dir: lvl % 2 ? -1 : 1 };
    }
    cv.onDown(drop); ctx.key((e) => { if (e.code === 'Space' || e.code === 'Enter') drop(); });
    ctx.loop((dt) => {
      if (!over) { cur.x += cur.dir * speed * dt; if (cur.x < 0) { cur.x = 0; cur.dir = 1; } if (cur.x + cur.w > 600) { cur.x = 600 - cur.w; cur.dir = -1; } }
      const targetCam = Math.max(0, (blocks.length - 7) * BH); cam += (targetCam - cam) * Math.min(1, dt * 5);
      const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#2b1055'); bg.addColorStop(1, '#7597de'); cv.clear(bg);
      const sy = (i) => 372 - i * BH + cam;
      blocks.forEach((b, i) => { const y = sy(i); if (y < -40 || y > 420) return; cv.rrect(b.x, y - BH + 2, b.w, BH - 2, 5, `hsl(${b.hue},75%,58%)`, 'rgba(255,255,255,.4)', 2); });
      if (!over) { const y = sy(blocks.length); cv.rrect(cur.x, y - BH + 2, cur.w, BH - 2, 5, `hsl(${(blocks.length * 17 + 200) % 360},85%,65%)`, '#fff', 3); }
      for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.vy += 900 * dt; d.y2 = (d.y2 ?? sy(d.y)) + d.vy * dt; cv.rrect(d.x, d.y2 - BH + 2, d.w, BH - 2, 5, `hsl(${d.hue},60%,45%)`); if (d.y2 > 460) debris.splice(i, 1); }
      cv.text(String(lvl), 54, 40, { size: 46, weight: 700, stroke: 'rgba(0,0,0,.4)', lw: 6 }); cv.text('pisos', 54, 74, { size: 16, color: 'rgba(255,255,255,.75)' });
      cv.fxStep(dt);
    });
  };

  /* 15 ─ FLECHAS LOCAS */
  G.arrows = function (ctx) {
    const d = ctx.dom('g-center');
    const rule = h('div', 'g-banner', '', d), dirBox = h('div', 'arrow-circle', '', d), row = h('div', 'g-row', '', d);
    const bl = h('button', 'gbtn yellow big', '⬅️', row), br = h('button', 'gbtn yellow big', '➡️', row);
    let dir = 'L', opp = false, streak = 0;
    function next() {
      dir = ctx.chance(0.5) ? 'L' : 'R'; opp = ctx.diff > 0 && ctx.chance(ctx.diff === 1 ? 0.4 : 0.5);
      dirBox.textContent = dir === 'L' ? '⬅' : '➡'; dirBox.className = 'arrow-circle ' + (opp ? 'opp' : 'same');
      rule.textContent = opp ? '🔴 ROJO: ¡al lado CONTRARIO!' : '🟢 VERDE: seguí la flecha'; rule.className = 'g-banner ' + (opp ? 'bad' : 'good');
    }
    function pick(side) {
      const want = opp ? (dir === 'L' ? 'R' : 'L') : dir;
      if (side === want) { streak++; ctx.right(10 + Math.min(streak, 5)); } else { streak = 0; ctx.wrong(8); }
      next();
    }
    ctx.press(bl, () => pick('L')); ctx.press(br, () => pick('R'));
    ctx.key((e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick('L'); if (e.code === 'ArrowRight' || e.code === 'KeyD') pick('R'); });
    next();
  };

  /* 16 ─ CUENTA RÁPIDA */
  G.count = function (ctx) {
    const SETS = ['🍎', '⭐', '🐟', '🎈', '🍪', '🐝', '💎', '🌸'];
    const d = ctx.dom('g-center');
    const info = h('div', 'g-sub', '', d), field = h('div', 'count-field', '', d), grid = h('div', 'g-grid g-grid4', '', d);
    let round = 0, ans = 0, opts = [], locked = true;
    function next() {
      locked = true; grid.innerHTML = ''; field.innerHTML = '';
      const n = Math.min(14, 3 + Math.floor(round * 0.8) + ctx.int(0, 2) + ctx.diff); ans = n;
      const em = ctx.pick(SETS); const placed = [];
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do { x = ctx.rand(6, 88); y = ctx.rand(6, 78); tries++; } while (tries < 40 && placed.some((p) => Math.hypot(p[0] - x, (p[1] - y) * 1.4) < 13));
        placed.push([x, y]); const s = h('span', 'cf-item', em, field); s.style.left = x + '%'; s.style.top = y + '%';
      }
      info.textContent = '¿Cuántos hay? ¡Memorizá!';
      const showMs = [1500, 1200, 950][ctx.diff] + n * 60;
      ctx.after(showMs, () => {
        field.innerHTML = '<div class="g-big">?</div>'; info.textContent = '¿Cuántos había?';
        const set = new Set([n]); while (set.size < 4) { const v = n + ctx.int(-3, 3); if (v > 0) set.add(v); }
        opts = [...set].sort((a, b) => a - b);
        opts.forEach((v, i) => { const b = h('button', 'gbtn red', `<small>${i + 1}</small>${v}`, grid); ctx.press(b, () => pick(v)); });
        locked = false;
      });
      round++;
    }
    function pick(v) {
      if (locked) return; locked = true;
      if (v === ans) ctx.right(15 + Math.min(ans, 10)); else ctx.wrong(8);
      next();
    }
    ctx.key((e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 4 && !locked) pick(opts[n - 1]); });
    next();
  };
})();
