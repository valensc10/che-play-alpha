/* ChePlay - ruleta horizontal de juegos (animación; el servidor ya eligió el juego) */
(function () {
  'use strict';
  const GAP = 10;
  const reduced = () => document.documentElement.dataset.motion === 'reduced';
  let raf = 0, timer = 0;

  function cancel() { cancelAnimationFrame(raf); clearTimeout(timer); }

  // pool: ids de juegos candidatos, target: id ganador, ms: duración total del giro
  function play(box, o) {
    cancel();
    const track = box.querySelector('.rl-track'), cat = window.CATALOG, byId = Object.fromEntries(cat.map((g) => [g.id, g]));
    const sfx = window.Games.sfx;
    let pool = (o.pool && o.pool.length ? o.pool : cat.map((g) => g.id)).slice();
    // se completa con juegos "señuelo" para que la tira se vea llena aunque haya pocos habilitados
    if (pool.length < 8) cat.map((g) => g.id).filter((id) => !pool.includes(id)).sort(() => Math.random() - 0.5).slice(0, 8 - pool.length).forEach((id) => pool.push(id));
    const N = 44, WIN = N - 6, seq = [];
    let last = null;
    for (let i = 0; i < N; i++) { let id; do { id = pool[Math.floor(Math.random() * pool.length)]; } while (id === last && pool.length > 1); seq.push(id); last = id; }
    seq[WIN] = o.target;
    track.innerHTML = '';
    seq.forEach((id, i) => {
      const g = byId[id], d = document.createElement('div'); d.className = 'rl-item'; d.style.setProperty('--gc', g.color); d.dataset.i = i;
      const img = document.createElement('img'); img.src = 'img/games/' + id + '.jpg'; img.alt = ''; img.draggable = false; img.loading = 'eager';
      const em = document.createElement('span'); em.className = 'em'; em.textContent = g.emoji;
      const nm = document.createElement('b'); nm.textContent = g.name;
      d.append(img, em, nm); track.appendChild(d);
    });
    box.classList.remove('hidden', 'landed'); track.style.transition = 'none'; track.style.transform = 'translateX(0)';
    const W = box.clientWidth || 360, ITEM = track.children[0].offsetWidth || 132, STEP = ITEM + GAP;
    const jitter = (Math.random() - 0.5) * ITEM * 0.5;
    const endX = -(WIN * STEP + ITEM / 2 - W / 2) + jitter;
    const finish = () => { track.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1.2)'; track.style.transform = `translateX(${-(WIN * STEP + ITEM / 2 - W / 2)}px)`; box.classList.add('landed'); track.children[WIN].classList.add('win'); sfx.pop && sfx.pop(); o.onDone && o.onDone(); };
    if (reduced() || o.ms < 500) { track.style.transform = `translateX(${-(WIN * STEP + ITEM / 2 - W / 2)}px)`; box.classList.add('landed'); track.children[WIN].classList.add('win'); timer = setTimeout(() => o.onDone && o.onDone(), 60); return; }
    // giro con easing manual (para poder emitir un "tic" cada vez que cruza un juego)
    const t0 = performance.now(), dur = Math.max(900, o.ms - 350); let lastIdx = -1;
    const ease = (t) => 1 - Math.pow(1 - t, 2.8);
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur), x = endX * ease(t);
      track.style.transform = `translateX(${x}px)`;
      const idx = Math.floor((-x + W / 2) / STEP);
      if (idx !== lastIdx) { lastIdx = idx; if (t < 0.97) sfx.tick(); }
      if (t < 1) raf = requestAnimationFrame(frame); else finish();
    })(t0);
  }
  window.Roulette = { play, cancel };
})();
