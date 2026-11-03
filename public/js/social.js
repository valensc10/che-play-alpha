/* ChePlay - interacción entre jugadores: reacciones, frases, puntajes en vivo, premios, revancha */
(function () {
  'use strict';
  const REACTIONS = ['👏', '🔥', '😂', '😮', '❤️', '💀'];
  const PHRASES = ['¡GG!', '¡Revancha!', '¡Casi!', '¡Qué crack!', '¡Uf, qué difícil!', '¡Otra más!']; // mismo orden que el servidor
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let socket = null, myId = () => null, lastReact = 0;

  function say(text) { const r = $('#sr-live'); if (r) { r.textContent = ''; setTimeout(() => { r.textContent = text; }, 40); } }

  /* ---------- reacciones ---------- */
  function buildBar() {
    const row = $('#rb-row'), pop = $('#phrase-pop');
    REACTIONS.forEach((e) => { const b = el('button', 'rb', e); b.type = 'button'; b.setAttribute('aria-label', 'Reaccionar ' + e); b.onclick = () => send({ e }); row.appendChild(b); });
    const tg = el('button', 'rb talk', '💬'); tg.type = 'button'; tg.setAttribute('aria-label', 'Frases rápidas'); tg.setAttribute('aria-expanded', 'false');
    tg.onclick = () => { const open = pop.classList.toggle('hidden') === false; tg.setAttribute('aria-expanded', String(open)); };
    row.appendChild(tg);
    PHRASES.forEach((t, i) => { const b = el('button', 'ph', t); b.type = 'button'; b.onclick = () => { send({ ph: i }); pop.classList.add('hidden'); tg.setAttribute('aria-expanded', 'false'); }; pop.appendChild(b); });
  }
  function send(p) { const now = performance.now(); if (now - lastReact < 180) return; lastReact = now; socket.emit('react', p); }

  function floatReact(m) {
    if (document.documentElement.dataset.reactions === 'off' && m.id !== myId()) return;
    const layer = $('#react-layer'); if (!layer || layer.children.length > 28) return;
    const d = el('div', 'fr' + (m.ph ? ' phrase' : '') + (m.id === myId() ? ' mine' : ''));
    d.style.left = (8 + Math.random() * 78) + '%'; d.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    if (m.ph) { const t = el('span', 'who', `${m.avatar} ${m.nick}`); t.style.color = m.color; d.append(t, el('span', 'tx', m.ph)); }
    else { d.append(el('span', 'big', m.e), el('span', 'nm', m.avatar)); }
    layer.appendChild(d); setTimeout(() => d.remove(), 2600);
    if (m.ph) say(`${m.nick}: ${m.ph}`);
  }

  /* ---------- puntajes en vivo ---------- */
  let liveBox = null;
  function renderLive(rows) {
    if (!liveBox || document.documentElement.dataset.live === 'off') { liveBox && liveBox.classList.add('hidden'); return; }
    const me = myId(); let top = rows.slice(0, 5);
    const mine = rows.find((r) => r.id === me); if (mine && !top.includes(mine)) top = top.slice(0, 4).concat(mine);
    liveBox.innerHTML = '';
    top.forEach((r) => {
      const pos = rows.indexOf(r) + 1;
      const c = el('div', 'lv' + (r.id === me ? ' me' : '') + (r.done ? ' done' : ''));
      c.style.setProperty('--pc', r.color);
      c.append(el('span', 'p', '#' + pos), el('span', 'a', r.avatar), el('b', '', String(r.score)));
      liveBox.appendChild(c);
    });
    liveBox.classList.toggle('hidden', rows.length < 2);
  }
  function resetLive() { if (liveBox) { liveBox.innerHTML = ''; liveBox.classList.add('hidden'); } }

  /* ---------- premios ---------- */
  function renderAwards(box, awards) {
    box.innerHTML = '';
    if (!awards || !awards.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.appendChild(el('h3', '', '🎖️ Premios de la partida'));
    const grid = el('div', 'aw-grid');
    awards.forEach((a, i) => {
      const c = el('div', 'aw'); c.style.setProperty('--pc', a.color); c.style.animationDelay = (0.9 + i * 0.18) + 's';
      const who = el('div', 'aw-who'); who.append(el('span', 'av', a.avatar), el('span', '', a.nick));
      c.append(el('div', 'aw-e', a.emoji), el('b', '', a.title), el('small', '', a.desc), who); grid.appendChild(c);
    });
    box.appendChild(grid);
  }

  /* ---------- revancha ---------- */
  function paintRematch(v) {
    const n = $('#rematch-n'), b = $('#btn-rematch'); if (!n) return;
    n.textContent = v && v.total ? `${v.votes}/${v.total}` : '';
    const mine = v && v.ids && v.ids.includes(myId()); b.classList.toggle('voted', !!mine); b.setAttribute('aria-pressed', String(!!mine));
    if (v) say(`Revancha: ${v.votes} de ${v.total} votaron`);
  }

  function init(o) {
    socket = o.socket; myId = o.myId; liveBox = $('#livebar');
    buildBar();
    socket.on('react', floatReact);
    socket.on('round:live', renderLive);
    socket.on('rematch:votes', paintRematch);
    $('#btn-rematch').onclick = () => socket.emit('rematch:vote');
    // la barra de reacciones solo aparece fuera de las partidas
    window.Social.onScreen = (name) => { $('#reactbar').classList.toggle('hidden', !['lobby', 'podium', 'final'].includes(name)); $('#phrase-pop').classList.add('hidden'); document.body.dataset.screen = name; };
  }
  window.Social = { init, say, renderAwards, resetLive, paintRematch, onScreen() {} };
})();
