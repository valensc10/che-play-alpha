/* ChePlay - cliente: pantallas, lobbies, flujo de partida, podios */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const CAT = window.CATALOG;
  const BYID = Object.fromEntries(CAT.map((g) => [g.id, g]));
  const sfx = window.Games.sfx;
  const AVATARS = window.AVATARS;
  const THEMES = [['cheplay', 'ChePlay', '#ff5a4d,#00a8ff'], ['neon', 'Neón', '#7c5cff,#ff4d8d'], ['sunset', 'Atardecer', '#ff7a45,#ffcb47'], ['ocean', 'Océano', '#1fb6ff,#2ee6c9'], ['forest', 'Bosque', '#5ee37d,#d9f26a'], ['candy', 'Caramelo', '#ff8ad8,#8ad6ff']];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* noop */ } }
  };
  const S = { nick: store.get('pa_nick', ''), avatar: store.get('pa_avatar', AVATARS[0]), token: store.sget('pa_token'), me: null, lobby: null, runner: null, practice: null, pdiff: 1, round: null, lastProgressAt: 0 };
  const socket = io({ reconnection: true, reconnectionDelay: 400, reconnectionDelayMax: 2500 });
  window.Social.init({ socket, myId: () => S.me });
  const reduced = () => document.documentElement.dataset.motion === 'reduced';
  // contador animado (puntos del podio)
  function countUp(node, to, prefix, suffix, ms) {
    if (reduced()) { node.textContent = prefix + to + suffix; return; }
    const t0 = performance.now(); (function f(now) { const t = Math.min(1, (now - t0) / ms); node.textContent = prefix + Math.round(to * (1 - Math.pow(1 - t, 3))) + suffix; if (t < 1) requestAnimationFrame(f); })(t0);
  }

  /* ---------- utilidades UI ---------- */
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 's-' + name));
    S.screen = name; window.scrollTo(0, 0);
    window.Social && window.Social.onScreen(name);
  }
  function toast(text, err) {
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = text;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3100);
  }
  function showErr(id, msg) { const e = $(id); e.textContent = msg; e.classList.toggle('hidden', !msg); }
  function applyTheme(n) { document.documentElement.dataset.theme = n || 'cheplay'; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const isHost = () => !!(S.lobby && S.me && S.lobby.hostId === S.me);
  const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '#' + r);

  // formas flotantes de fondo
  (function floaters() {
    const bg = $('#bg'), em = ['🎮', '⭐', '🎯', '🎲', '🕹️', '🏆', '💎', '🎈', '⚡', '🍕'];
    for (let i = 0; i < 16; i++) { const s = document.createElement('span'); s.textContent = em[i % em.length]; s.style.left = Math.random() * 100 + '%'; s.style.fontSize = 22 + Math.random() * 40 + 'px'; s.style.animationDuration = 22 + Math.random() * 30 + 's'; s.style.animationDelay = -Math.random() * 40 + 's'; bg.appendChild(s); }
  })();

  /* ---------- confetti ---------- */
  let confettiRAF = 0;
  function confetti(ms = 5000) {
    if (reduced()) return;
    const c = $('#confetti'), g = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    const cols = ['#ff4d8d', '#ffc83d', '#2ee6a6', '#4d8dff', '#ff8a3d', '#e599f7'];
    const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.6, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0] }));
    const end = performance.now() + ms; cancelAnimationFrame(confettiRAF);
    (function step() {
      g.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); });
      if (performance.now() < end) confettiRAF = requestAnimationFrame(step); else g.clearRect(0, 0, c.width, c.height);
    })();
  }

  /* ---------- 1. NICKNAME ---------- */
  const avBox = $('#avatars');
  AVATARS.forEach((a) => { const b = el('button', '', a); b.type = 'button'; b.onclick = () => { S.avatar = a; sfx.tap(); paintAvatars(); }; avBox.appendChild(b); });
  function paintAvatars() { [...avBox.children].forEach((b) => b.classList.toggle('on', b.textContent === S.avatar)); }
  $('#in-nick').value = S.nick; paintAvatars();
  function nickOk() {
    sfx.unlock();
    const n = $('#in-nick').value.replace(/[<>]/g, '').trim();
    if (n.length < 2) return showErr('#nick-err', 'El nickname debe tener al menos 2 caracteres.');
    showErr('#nick-err', ''); S.nick = n.slice(0, 14); store.set('pa_nick', S.nick); store.set('pa_avatar', S.avatar);
    goMenu();
  }
  $('#btn-nick-ok').onclick = nickOk; $('#in-nick').addEventListener('keydown', (e) => { if (e.key === 'Enter') nickOk(); });

  /* ---------- 2. MENÚ ---------- */
  function goMenu() {
    $('#me-avatar').textContent = S.avatar; $('#me-nick').textContent = S.nick; applyTheme('cheplay'); showErr('#menu-err', '');
    show('menu'); socket.emit('lobby:list', null, renderLobbyList);
  }
  $('#brand').onclick = (e) => { e.preventDefault(); if (!S.lobby && !S.runner) show(S.nick ? 'menu' : 'nick'); };
  function renderLobbyList(list) {
    const box = $('#lobby-list'); box.innerHTML = '';
    if (!list || !list.length) { const e = el('div', 'empty'); e.innerHTML = '<b>🏜️</b>No hay lobbies públicos todavía.<br>¡Creá el primero!'; box.appendChild(e); return; }
    list.forEach((l) => {
      const b = el('button', 'lobby-item' + (l.state !== 'LOBBY' || l.players >= l.max ? ' busy' : ''));
      const main = el('div', 'li-main'); main.append(el('div', 'li-name', (l.hasPassword ? '🔒 ' : '') + l.name), el('div', 'li-sub', `Host: ${l.host} · código ${l.code}`));
      const pl = el('span', 'pill', `👥 ${l.players}/${l.max}`), st = el('span', 'pill ' + (l.state === 'LOBBY' ? 'live' : 'warn'), l.state === 'LOBBY' ? 'Abierto' : 'En juego');
      b.append(main, pl, st);
      b.onclick = () => { if (l.state !== 'LOBBY') return toast('Esa partida ya comenzó', true); if (l.hasPassword) { $('#in-code').value = l.code; $('#in-code-pass').classList.remove('hidden'); $('#in-code-pass').focus(); toast('Ingresá la contraseña'); } else joinLobby(l.code, ''); };
      box.appendChild(b);
    });
  }
  socket.on('lobby:list', (l) => { if (S.screen === 'menu') renderLobbyList(l); });
  function joinLobby(code, pass) {
    sfx.unlock();
    socket.emit('lobby:join', { code, password: pass, nick: S.nick, avatar: S.avatar }, (r) => {
      if (!r || !r.ok) { if (r && r.needPassword) $('#in-code-pass').classList.remove('hidden'); showErr('#menu-err', (r && r.error) || 'No se pudo unir.'); return toast((r && r.error) || 'Error', true); }
      enterLobby(r);
    });
  }
  $('#btn-join-code').onclick = () => { const c = $('#in-code').value.trim().toUpperCase(); if (c.length < 4) return showErr('#menu-err', 'El código tiene 4 letras.'); joinLobby(c, $('#in-code-pass').value); };
  $('#in-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join-code').click(); });
  $('#in-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

  // crear lobby
  $('#btn-create').onclick = () => { sfx.unlock(); $('#mc-name').value = `Sala de ${S.nick}`; showErr('#mc-err', ''); $('#modal-create').classList.remove('hidden'); $('#mc-name').select(); };
  $('#mc-cancel').onclick = () => $('#modal-create').classList.add('hidden');
  $('#mc-max').oninput = (e) => { $('#mc-max-v').textContent = e.target.value; };
  $('#mc-ok').onclick = () => {
    socket.emit('lobby:create', { name: $('#mc-name').value, maxPlayers: +$('#mc-max').value, isPublic: $('#mc-public').checked, password: $('#mc-pass').value, nick: S.nick, avatar: S.avatar }, (r) => {
      if (!r || !r.ok) return showErr('#mc-err', (r && r.error) || 'No se pudo crear.');
      $('#modal-create').classList.add('hidden'); enterLobby(r);
    });
  };

  /* ---------- PRÁCTICA ---------- */
  const PACKS = window.PACKS || [];
  const gamesOf = (pk) => CAT.filter((g) => g.pack === pk.id);
  function packBlock(box, pk, cls, extraHead) {
    const sec = el('div', 'pack'); sec.style.setProperty('--pk', pk.color);
    const head = el('div', 'pack-head'); head.append(el('span', 'pe', pk.emoji));
    const t = el('div', 'pt', pk.name); t.append(el('small', '', pk.desc)); head.append(t);
    if (extraHead) extraHead(head);
    const grid = el('div', 'game-grid ' + cls); sec.append(head, grid); box.appendChild(sec);
    return grid;
  }
  function buildPractice() {
    const box = $('#practice-grid'); box.innerHTML = '';
    PACKS.forEach((pk) => {
      const grid = packBlock(box, pk, '');
      gamesOf(pk).forEach((g) => {
        const b = el('button', 'gcard practice'); b.style.setProperty('--gc', g.color); b.title = g.desc;
        const th = el('div', 'thumb'); const im = el('img'); im.src = 'img/games/' + g.id + '.jpg'; im.alt = ''; im.loading = 'lazy'; im.draggable = false; th.append(im, el('span', 'e', g.emoji));
        b.append(th, el('div', 'n', g.name), el('small', '', `${Math.round(g.duration / 1000)}s máx`));
        b.onclick = () => startPractice(g.id); grid.appendChild(b);
      });
    });
  }
  buildPractice();
  $('#btn-practice').onclick = () => { sfx.unlock(); show('practice'); };
  $('#btn-practice-back').onclick = () => show('menu');
  $('#practice-diff').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.pdiff = +b.dataset.d; [...$('#practice-diff').children].forEach((x) => x.classList.toggle('on', x === b)); };
  function startPractice(id) {
    S.practice = id; const meta = BYID[id];
    runGame(meta, (Math.random() * 2e9) | 0, S.pdiff, 3000, { label: '🎯' });
  }
  $('#btn-retry').onclick = () => startPractice(S.practice);
  $('#btn-practice-exit').onclick = () => { stopRunner(); S.practice = null; show('practice'); };
  $('#btn-quit-practice').onclick = () => { stopRunner(); S.practice = null; show('practice'); };

  /* ---------- 3. LOBBY ---------- */
  function enterLobby(r) {
    S.token = r.token || S.token; store.sset('pa_token', S.token); S.me = r.me; S.lobby = r.snapshot;
    $('#chat-log').innerHTML = ''; show('lobby'); renderLobby(); sfx.good();
  }
  function leaveLocal() {
    S.lobby = null; S.me = null; S.token = null; store.sset('pa_token', null); stopRunner(); goMenu();
  }
  $('#btn-leave').onclick = () => socket.emit('lobby:leave', null, leaveLocal);
  $('#btn-final-leave').onclick = () => socket.emit('lobby:leave', null, leaveLocal);
  $('#lb-code').onclick = () => { const c = S.lobby.code; (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(() => toast('Código copiado: ' + c), () => toast('Código: ' + c)); };

  // construir controles de tema
  THEMES.forEach(([id, name, g]) => { const d = el('div', 'theme-dot'); d.title = name; d.dataset.v = id; const [a, b] = g.split(','); d.style.background = `linear-gradient(135deg, ${a}, ${b})`; d.onclick = () => { if (isHost()) sendCfg({ theme: id }); }; $('#cfg-theme').appendChild(d); });
  // sliders
  const SLIDERS = ['totalGames', 'targetPoints', 'maxPlayers', 'introSeconds', 'podiumSeconds'];
  let cfgTimer = null, cfgPatch = {};
  function sendCfg(p) { Object.assign(cfgPatch, p); clearTimeout(cfgTimer); cfgTimer = setTimeout(() => { socket.emit('lobby:config', cfgPatch); cfgPatch = {}; }, 120); }
  const fmt = { targetPoints: (v) => (+v === 0 ? 'Sin límite' : v + ' pts'), introSeconds: (v) => v + 's', podiumSeconds: (v) => v + 's' };
  SLIDERS.forEach((k) => { $('#cfg-' + k).addEventListener('input', (e) => { $('#v-' + k).textContent = (fmt[k] || ((v) => v))(e.target.value); if (isHost()) sendCfg({ [k]: +e.target.value }); }); });
  $('#cfg-name').addEventListener('input', (e) => { if (isHost()) sendCfg({ name: e.target.value }); });
  ['isPublic', 'manualAdvance', 'chat'].forEach((k) => $('#cfg-' + k).addEventListener('change', (e) => { if (isHost()) sendCfg({ [k]: e.target.checked }); }));
  $('#cfg-difficulty').onclick = (e) => { const b = e.target.closest('button'); if (b && isHost()) sendCfg({ difficulty: +b.dataset.v }); };
  $('#cfg-order').onclick = (e) => { const b = e.target.closest('button'); if (b && isHost()) sendCfg({ order: b.dataset.v }); };
  $('#g-all').onclick = () => { if (isHost()) sendCfg({ games: CAT.map((g) => g.id) }); };
  $('#g-none').onclick = () => { if (isHost()) { sendCfg({ games: [CAT[0].id] }); toast('Dejé 1 juego habilitado como mínimo'); } };

  function renderLobby() {
    const L = S.lobby; if (!L || S.screen !== 'lobby') return;
    const host = isHost(), c = L.config;
    applyTheme(c.theme);
    $('#lb-name').textContent = L.name; $('#lb-code').textContent = L.code;
    $('#lb-vis').textContent = (L.isPublic ? '🌐 Público' : '🔒 Privado') + (L.hasPassword ? ' · con contraseña' : '');
    const role = $('#lb-role'); role.textContent = host ? '👑 Sos el host' : 'Jugador'; role.classList.toggle('hidden', false);
    // jugadores
    const ul = $('#players'); ul.innerHTML = '';
    L.players.slice().sort((a, b) => (b.isHost - a.isHost)).forEach((p) => {
      const li = el('li', (p.connected ? '' : 'off ') + (p.id === S.me ? 'me' : '')); li.style.setProperty('--pc', p.color);
      li.append(el('span', 'av', p.avatar), el('span', 'nm', p.nick + (p.id === S.me ? ' (vos)' : '') + (p.connected ? '' : ' · reconectando…')));
      if (p.isHost) li.append(el('span', 'crown', '👑'));
      else if (host) { const a = el('span', 'act'); const mk = el('button', '', '👑'); mk.title = 'Pasar el host'; mk.onclick = () => socket.emit('lobby:host', { id: p.id }); const kk = el('button', '', '✖'); kk.title = 'Expulsar'; kk.onclick = () => socket.emit('lobby:kick', { id: p.id }); a.append(mk, kk); li.append(a); }
      ul.appendChild(li);
    });
    $('#lb-count').textContent = `${L.players.length}/${c.maxPlayers}`;
    // config
    $('#cfg-card').classList.toggle('locked', !host); $('#cfg-lock').classList.toggle('hidden', host);
    const setIf = (id, v) => { const e = $(id); if (document.activeElement !== e) e.value = v; };
    setIf('#cfg-name', L.name); $('#cfg-totalGames').max = c.games.length;
    SLIDERS.forEach((k) => { setIf('#cfg-' + k, c[k]); $('#v-' + k).textContent = (fmt[k] || ((v) => v))(c[k]); });
    $('#cfg-name').disabled = !host;
    $('#cfg-isPublic').checked = L.isPublic; $('#cfg-manualAdvance').checked = c.manualAdvance; $('#cfg-chat').checked = c.chat;
    [...$('#cfg-difficulty').children].forEach((b) => b.classList.toggle('on', +b.dataset.v === c.difficulty));
    [...$('#cfg-order').children].forEach((b) => b.classList.toggle('on', b.dataset.v === c.order));
    [...$('#cfg-theme').children].forEach((d) => d.classList.toggle('on', d.dataset.v === c.theme));
    // pool de juegos, agrupado por packs
    const pool = $('#games-pool'); pool.innerHTML = ''; const on = new Set(c.games);
    const setGames = (set) => { if (set.size < 1) return toast('Tiene que haber al menos 1 juego', true); sfx.tap(); sendCfg({ games: [...set] }); };
    const curSet = () => new Set(cfgPatch.games || S.lobby.config.games);
    PACKS.forEach((pk) => {
      const gs = gamesOf(pk), n = gs.filter((g) => on.has(g.id)).length;
      const grid = packBlock(pool, pk, 'compact', (head) => {
        head.append(el('span', 'pc', `${n}/${gs.length}`));
        if (host) {
          const tb = el('button', 'btn ghost xs', n === gs.length ? 'Quitar pack' : 'Todo el pack');
          tb.onclick = () => { const s = curSet(); if (n === gs.length) gs.forEach((g) => s.delete(g.id)); else gs.forEach((g) => s.add(g.id)); setGames(s); };
          head.append(tb);
        }
      });
      gs.forEach((g) => {
        const b = el('button', 'gcard ' + (on.has(g.id) ? 'on' : 'off') + (host ? '' : ' ro')); b.style.setProperty('--gc', g.color); b.title = g.desc;
        b.append(el('div', 'e', g.emoji), el('div', 'n', g.name));
        b.onclick = () => { if (!host) return; const s = curSet(); if (s.has(g.id)) s.delete(g.id); else s.add(g.id); setGames(s); };
        grid.appendChild(b);
      });
    });
    $('#games-count').textContent = `${c.games.length}/${CAT.length}`; $('#games-actions').classList.toggle('hidden', !host);
    $('#btn-start').classList.toggle('hidden', !host); $('#wait-host').classList.toggle('hidden', host);
    $('#chat-card').classList.toggle('hidden', !c.chat);
  }
  $('#btn-start').onclick = () => { sfx.unlock(); socket.emit('game:start'); };

  socket.on('lobby:state', (snap) => {
    const wasHost = isHost(); S.lobby = snap;
    if (S.me && !snap.players.some((p) => p.id === S.me)) return;
    if (!wasHost && isHost() && S.screen === 'lobby') toast('👑 Ahora sos el host');
    renderLobby();
  });
  socket.on('lobby:back', () => { stopRunner(); show('lobby'); renderLobby(); });
  socket.on('kicked', (msg) => { toast(msg || 'Saliste del lobby', true); leaveLocal(); });
  socket.on('toast', ({ text }) => toast(text));

  // chat
  function sendChat() { const i = $('#in-chat'); const t = i.value.trim(); if (t) { socket.emit('chat', { text: t }); i.value = ''; } }
  $('#btn-chat').onclick = sendChat; $('#in-chat').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
  socket.on('chat', (m) => {
    const log = $('#chat-log'), d = el('div', 'chat-msg'), b = el('b', '', `${m.avatar} ${m.nick}`); b.style.color = m.color;
    d.append(b, document.createTextNode(m.text)); log.appendChild(d); log.scrollTop = log.scrollHeight; while (log.children.length > 60) log.firstChild.remove();
  });

  /* ---------- 4. JUEGO ---------- */
  function stopRunner() { if (S.runner) { S.runner.destroy(); S.runner = null; } clearInterval(S.introTimer); window.Roulette && window.Roulette.cancel(); }
  function setScoreHud(v) { $('#hud-score').textContent = v; const p = $('#hud-score').parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }

  function runGame(meta, seed, diff, introMs, o = {}) {
    stopRunner(); show('game');
    const sg = $('#s-game'); sg.style.setProperty('--gcol', meta.color);
    $('#hud-round').textContent = o.label || `${o.index}/${o.total}`; $('#hud-emoji').textContent = meta.emoji; $('#hud-name').textContent = meta.name; $('#hud-score').textContent = '0';
    $('#stage').innerHTML = ''; $('#done').classList.add('hidden'); $('#practice-btns').classList.add('hidden'); $('#btn-quit-practice').classList.toggle('hidden', !S.practice);
    const fill = $('#timebar-fill'); fill.style.transform = 'scaleX(1)'; fill.classList.remove('low');
    $('#in-emoji').textContent = meta.emoji; $('#in-title').textContent = meta.name; $('#in-desc').textContent = meta.desc; $('#in-hint').textContent = '🎮 ' + meta.hint;
    const intro = $('#intro'), cnt = $('#in-count'), info = $('#intro-info'), rl = $('#roulette'); intro.classList.remove('hidden');
    const deadline = performance.now() + introMs; let lastN = -1; sfx.whoosh();
    const spin = !S.practice && document.documentElement.dataset.roulette !== 'off' && introMs >= 2500 && window.Roulette;
    let spinning = !!spin;
    info.classList.toggle('pending', spinning); rl.classList.add('hidden');
    if (spin) { $('#hud-emoji').textContent = '🎲'; $('#hud-name').textContent = '¿Qué juego toca?'; sg.style.setProperty('--gcol', '#ffe04a'); }
    if (spin) {
      const pool = (S.lobby && S.lobby.config && S.lobby.config.games) || null;
      window.Roulette.play(rl, { pool, target: meta.id, ms: Math.min(3200, Math.max(1500, introMs * 0.55)), onDone: () => { spinning = false; info.classList.remove('pending'); $('#hud-emoji').textContent = meta.emoji; $('#hud-name').textContent = meta.name; sg.style.setProperty('--gcol', meta.color); sfx.good(); window.Social.say(`Ronda ${o.index || ''}: ${meta.name}. ${meta.desc}`); } });
    } else window.Social.say(`${meta.name}. ${meta.desc}`);
    S.introTimer = setInterval(() => {
      const rem = deadline - performance.now(), n = Math.ceil(rem / 1000);
      if (n !== lastN && n > 0) { lastN = n; cnt.textContent = n; cnt.classList.remove('tick'); void cnt.offsetWidth; cnt.classList.add('tick'); if (!spinning) sfx.tick(); }
      if (rem <= 0) { clearInterval(S.introTimer); window.Roulette && window.Roulette.cancel(); intro.classList.add('hidden'); rl.classList.add('hidden'); begin(); }
    }, 60);
    function begin() {
      sfx.go();
      S.runner = window.Games.createRunner({
        meta, stage: $('#stage'), seed, diff,
        onScore: (v) => { setScoreHud(v); if (!S.practice) { const now = performance.now(); if (now - S.lastProgressAt > 350) { S.lastProgressAt = now; socket.emit('game:progress', { score: v }); } } },
        onTime: (f) => { fill.style.transform = `scaleX(${f})`; fill.classList.toggle('low', f < 0.25); },
        onFinish: (score) => {
          S.runner = null; $('#hud-score').textContent = score;
          $('#done-score').textContent = score; $('#done').classList.remove('hidden'); fill.style.transform = 'scaleX(0)';
          if (S.practice) { $('#done-wait').textContent = 'Práctica terminada'; $('#done-bar').parentElement.classList.add('hidden'); $('#practice-btns').classList.remove('hidden'); sfx.win(); }
          else { $('#done-wait').textContent = 'Esperando a los demás jugadores…'; $('#done-bar').parentElement.classList.remove('hidden'); $('#done-bar').style.width = '0%'; socket.emit('game:done', { score }); sfx.win(); }
        }
      });
      S.runner.start();
    }
  }

  socket.on('round:start', (r) => {
    S.practice = null; S.round = r; const meta = BYID[r.gameId]; window.Social.resetLive();
    runGame(meta, r.seed, r.difficulty, r.introMs, { index: r.index, total: r.total });
  });
  socket.on('round:progress', ({ done, total }) => {
    $('#done-bar').style.width = (total ? (done / total) * 100 : 0) + '%';
    if (!$('#done').classList.contains('hidden')) $('#done-wait').textContent = `Esperando a los demás… ${done}/${total} listos`;
  });

  /* ---------- 5. PODIO DE RONDA ---------- */
  function podiumBlocks(box, rows, valFn, subFn) {
    box.innerHTML = '';
    const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
    if (!top.length) return;
    const order = top.length >= 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
    order.forEach((r) => {
      const place = Math.min(3, rows.indexOf(r) + 1); const col = el('div', 'pd-col pd-' + place);
      const av = el('div', 'av', r.avatar), nm = el('div', 'nm', r.nick); nm.style.color = r.color;
      const bar = el('div', 'bar'); bar.append(el('div', '', medal(r.rank)), el('b', '', valFn(r)), el('small', '', subFn(r)));
      col.append(av, nm, bar); box.appendChild(col);
    });
  }
  function renderRoundResult(p) {
    stopRunner(); const meta = BYID[p.gameId]; show('podium');
    $('#pd-round').textContent = `Ronda ${p.index}/${p.total}`; $('#pd-title').textContent = `${meta.emoji} ${meta.name}`;
    podiumBlocks($('#pd-stage'), p.ranking, (r) => r.score, (r) => `+${r.gained} pts`);
    const ol = $('#pd-list'); ol.innerHTML = '';
    p.ranking.forEach((r, i) => {
      const li = el('li', r.id === S.me ? 'me' : ''); li.style.setProperty('--pc', r.color); li.style.animationDelay = 0.3 + i * 0.07 + 's';
      const who = el('div', 'who'); who.append(el('span', 'av', r.avatar), el('span', '', r.nick));
      const sc = el('div', 'sc'); sc.innerHTML = 'Juego: <b></b>'; sc.querySelector('b').textContent = r.score;
      li.append(el('div', 'pos', medal(r.rank)), who, sc, el('span', 'gain', '+' + r.gained));
      const tot = el('div', 'tot', r.total + ' pts'); li.append(tot); li.style.gridTemplateColumns = '44px 1fr auto auto auto'; ol.appendChild(li);
    });
    ol.querySelectorAll('.gain').forEach((n, i) => countUp(n, p.ranking[i].gained, '+', '', 900));
    ol.querySelectorAll('.tot').forEach((n, i) => countUp(n, p.ranking[i].total, '', ' pts', 1100));
    const mine = p.ranking.find((r) => r.id === S.me); mine && mine.rank === 1 ? sfx.fanfare() : sfx.good();
    if (mine) window.Social.say(`Terminó la ronda de ${meta.name}. Quedaste en el puesto ${mine.rank} con ${mine.score} puntos y sumás ${mine.gained}.`);
    const bar = $('#pd-bar'), btn = $('#btn-next'), note = $('#pd-note'); bar.style.transition = 'none'; bar.style.width = '100%';
    btn.classList.add('hidden');
    if (p.final) { note.textContent = p.target && p.ranking.some((r) => r.total >= p.target) ? '🎯 ¡Alguien llegó a la meta! Resultado final en unos segundos…' : '🏁 ¡Última ronda! Resultado final en unos segundos…'; bar.style.width = '0%'; }
    else if (p.auto) { note.textContent = 'Siguiente juego en unos segundos…'; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${p.auto}ms linear`; bar.style.width = '0%'; })); }
    else { bar.style.width = '0%'; if (isHost()) { btn.classList.remove('hidden'); note.textContent = ''; } else note.textContent = '⏳ Esperando que el host avance…'; }
  }
  socket.on('round:result', renderRoundResult);
  $('#btn-next').onclick = () => { socket.emit('game:next'); $('#btn-next').classList.add('hidden'); };

  /* ---------- 6. FINAL ---------- */
  function renderFinal(p) {
    stopRunner(); show('final'); const rows = p.ranking;
    const winners = rows.filter((r) => r.rank === 1);
    $('#fn-title').textContent = winners.length === 1 ? `🏆 ¡${winners[0].nick} es el campeón!` : `🏆 Empate: ${winners.map((w) => w.nick).join(' y ')}`;
    podiumBlocks($('#fn-stage'), rows, (r) => r.total, () => 'puntos');
    const ol = $('#fn-list'); ol.innerHTML = '';
    rows.forEach((r, i) => {
      const li = el('li', r.id === S.me ? 'me' : ''); li.style.setProperty('--pc', r.color); li.style.animationDelay = 0.6 + i * 0.07 + 's'; li.style.gridTemplateColumns = '44px 1fr auto';
      const who = el('div', 'who'); who.append(el('span', 'av', r.avatar), el('span', '', r.nick));
      li.append(el('div', 'pos', medal(r.rank)), who, el('div', 'tot', r.total + ' pts')); ol.appendChild(li);
    });
    window.Social.renderAwards($('#fn-awards'), p.awards); window.Social.paintRematch(null); $('#btn-rematch').classList.remove('voted');
    $('#fn-list').querySelectorAll('.tot').forEach((n, i) => countUp(n, rows[i].total, '', ' pts', 1400));
    const w = rows.filter((r) => r.rank === 1); window.Social.say(w.length === 1 ? `Fin de la partida. Ganó ${w[0].nick}.` : 'Fin de la partida. Hubo empate.');
    $('#btn-to-lobby').classList.toggle('hidden', !isHost()); $('#fn-note').textContent = isHost() ? '' : '⏳ Esperando que el host vuelva al lobby…';
    sfx.fanfare(); confetti(); setTimeout(() => confetti(3500), 2500);
  }
  socket.on('game:final', renderFinal);
  $('#btn-to-lobby').onclick = () => socket.emit('game:lobby');

  /* ---------- conexión y reanudación ---------- */
  function resume() {
    if (!S.token) { if (S.screen === 'menu') socket.emit('lobby:list', null, renderLobbyList); return; }
    socket.emit('session:resume', { token: S.token }, (r) => {
      if (!r || !r.ok) { S.token = null; store.sset('pa_token', null); S.lobby = null; S.me = null; if (S.screen !== 'nick' && S.screen !== 'practice' && !S.practice) { toast('Tu sesión de lobby expiró', true); goMenu(); } return; }
      S.me = r.me; S.lobby = r.snapshot; S.token = S.token;
      const st = r.snapshot.state;
      if (st === 'LOBBY') { if (S.screen !== 'lobby') show('lobby'); renderLobby(); }
      else if (st === 'PLAYING') {
        if (!S.runner) { show('game'); const meta = BYID[r.snapshot.round.gameId]; $('#hud-name').textContent = meta.name; $('#hud-emoji').textContent = meta.emoji; $('#s-game').style.setProperty('--gcol', meta.color); $('#intro').classList.add('hidden'); $('#done').classList.remove('hidden'); $('#done-score').textContent = '–'; $('#done-wait').textContent = 'Te reconectaste. Esperando a los demás…'; $('#done-bar').parentElement.classList.remove('hidden'); $('#practice-btns').classList.add('hidden'); }
      } else if (st === 'PODIUM' && r.last) renderRoundResult(r.last.payload);
      else if (st === 'FINAL' && r.last) renderFinal(r.last.payload);
    });
  }
  socket.on('connect', () => { $('#conn').classList.add('hidden'); resume(); });
  socket.on('disconnect', () => { $('#conn').classList.remove('hidden'); });

  /* ---------- sonido ---------- */
  function paintSound() { $('#btn-sound').textContent = sfx.isMuted() ? '🔇' : '🔊'; }
  $('#btn-sound').onclick = () => { sfx.setMuted(!sfx.isMuted()); paintSound(); sfx.tap(); };
  paintSound();
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  /* ---------- efecto "tilt" en tarjetas (solo con mouse y movimiento completo) ---------- */
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.gcard.practice, .gcard.on, .gcard.off');
      if (!c || reduced()) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty('--rx', (-y * 10).toFixed(1) + 'deg'); c.style.setProperty('--ry', (x * 12).toFixed(1) + 'deg'); c.classList.add('tilting');
    });
    document.addEventListener('pointerout', (e) => { const c = e.target.closest && e.target.closest('.gcard'); if (c) { c.classList.remove('tilting'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); } });
  }

  window.Account.init({ socket, S, $, el, show, toast, sfx, goMenu });

  // arranque: si ya hay nick guardado, el usuario igual ve la pantalla de nick para confirmar
  show('nick');
})();
