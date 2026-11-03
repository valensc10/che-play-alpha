/* ChePlay - cuentas: login con Google, perfil guardado (nick + avatar) y estadísticas por juego */
(function () {
  'use strict';
  const LS = 'cp_auth';
  const lsGet = () => { try { return localStorage.getItem(LS); } catch (e) { return null; } };
  const lsSet = (v) => { try { if (v) localStorage.setItem(LS, v); else localStorage.removeItem(LS); } catch (e) { /* noop */ } };

  function init(c) {
    const { socket, S, $, el, show, toast, sfx, goMenu } = c;
    const AV = window.AVATARS, CAT = window.CATALOG, PACKS = window.PACKS;
    let cfg = { googleClientId: null, devLogin: false }, gsiReady = false, delArmed = 0, pendAvatar = null;
    const guest = { nick: S.nick, avatar: S.avatar };

    /* ---------- estado de sesión ---------- */
    function paintMe() {
      const u = S.user;
      $('#me-avatar').textContent = S.avatar; $('#me-nick').textContent = S.nick;
      $('#btn-profile small').textContent = u ? 'mi cuenta' : 'cambiar';
      $('#login-cta').classList.toggle('hidden', !!u || !(cfg.googleClientId || cfg.devLogin));
      $('#login-box').classList.toggle('hidden', !!u || !(cfg.googleClientId || cfg.devLogin));
    }
    function setUser(u) {
      if (!S.user) { guest.nick = S.nick; guest.avatar = S.avatar; } // se recuerda el perfil de invitado
      S.user = u;
      if (u) { S.nick = u.nick; S.avatar = u.avatar; } else { S.nick = guest.nick; S.avatar = guest.avatar; }
      paintMe();
    }
    function onLogin(r) {
      if (!r || !r.ok) return toast((r && r.error) || 'No se pudo iniciar sesión.', true);
      lsSet(r.token); setUser(r.user); sfx.good(); toast(`¡Hola, ${r.user.nick}!`); goMenu();
    }
    function reauth() { // en cada (re)conexión el servidor necesita reconocer la cuenta
      const t = lsGet(); if (!t) return;
      socket.emit('auth:token', { token: t }, (r) => {
        if (!r || !r.ok) { lsSet(null); setUser(null); return; }
        const wasNick = S.screen === 'nick'; setUser(r.user); if (wasNick) goMenu();
      });
    }
    socket.on('connect', reauth);
    function logout(silent) {
      socket.emit('auth:logout', null, () => {});
      lsSet(null); try { window.google && window.google.accounts.id.disableAutoSelect(); } catch (e) { /* noop */ }
      setUser(null); $('#in-nick').value = S.nick; if (!silent) toast('Cerraste sesión'); show('nick');
    }

    /* ---------- login con Google ---------- */
    function setupLogin() {
      paintMe();
      if (cfg.devLogin) $('#dev-login').classList.remove('hidden');
      if (cfg.googleClientId) {
        const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
        s.onload = () => {
          try {
            window.google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: (resp) => socket.emit('auth:google', { credential: resp.credential }, onLogin), auto_select: false, cancel_on_tap_outside: true });
            window.google.accounts.id.renderButton($('#gsi-btn'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es', width: 280 });
            gsiReady = true;
          } catch (e) { gsiFail(); }
        };
        s.onerror = gsiFail; document.head.appendChild(s);
      }
    }
    function gsiFail() { const m = $('#gsi-msg'); m.textContent = 'No se pudo cargar el inicio de sesión de Google. Revisá tu conexión o desactivá el bloqueador de anuncios.'; m.classList.remove('hidden'); }
    $('#btn-dev').onclick = () => socket.emit('auth:dev', { name: $('#dev-name').value }, onLogin);
    $('#btn-login-cta').onclick = () => { show('nick'); setTimeout(() => $('#login-box').scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };
    fetch('/api/config').then((r) => r.json()).then((j) => { cfg = j; setupLogin(); }).catch(() => {});

    /* ---------- pantalla "Mi cuenta" ---------- */
    const avBox = $('#acc-avatars');
    AV.forEach((a) => { const b = el('button', '', a); b.type = 'button'; b.setAttribute('aria-label', 'Avatar ' + a); b.onclick = () => { pendAvatar = a; sfx.tap(); paintAv(); }; avBox.appendChild(b); });
    function paintAv() { [...avBox.children].forEach((b) => { const on = b.textContent === pendAvatar; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }
    function openAccount() {
      if (!S.user) return show('nick');
      $('#acc-email').textContent = S.user.email || ''; $('#acc-nick').value = S.user.nick; pendAvatar = S.user.avatar; paintAv();
      $('#acc-err').classList.add('hidden'); resetDelete(); tab('profile'); show('account');
    }
    function tab(t) {
      [...$('#acc-tabs').children].forEach((b) => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      $('#acc-profile').classList.toggle('hidden', t !== 'profile'); $('#acc-stats').classList.toggle('hidden', t !== 'stats');
      if (t === 'stats') loadStats();
    }
    $('#acc-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) tab(b.dataset.t); };
    $('#btn-profile').onclick = () => (S.user ? openAccount() : show('nick'));
    $('#btn-acc-back').onclick = () => goMenu();
    $('#btn-acc-save').onclick = () => {
      const nick = $('#acc-nick').value.replace(/[<>]/g, '').trim(), err = $('#acc-err');
      if (nick.length < 2) { err.textContent = 'El nickname debe tener al menos 2 caracteres.'; return err.classList.remove('hidden'); }
      socket.emit('account:update', { nick, avatar: pendAvatar }, (r) => {
        if (!r || !r.ok) { err.textContent = (r && r.error) || 'No se pudo guardar.'; return err.classList.remove('hidden'); }
        err.classList.add('hidden'); setUser(r.user); sfx.good(); toast('Perfil guardado ✔');
      });
    };
    $('#btn-logout').onclick = () => logout();
    function resetDelete() { delArmed = 0; const b = $('#btn-delete'); b.textContent = 'Borrar mi cuenta'; b.classList.remove('armed'); }
    $('#btn-delete').onclick = () => {
      const b = $('#btn-delete');
      if (!delArmed) { delArmed = 1; b.textContent = '¿Seguro? Se borran tu perfil y tus récords. Tocá de nuevo'; b.classList.add('armed'); setTimeout(resetDelete, 6000); return; }
      socket.emit('account:delete', null, (r) => { if (r && r.ok) { logout(true); toast('Cuenta borrada'); } else toast((r && r.error) || 'No se pudo borrar.', true); });
    };

    /* ---------- estadísticas ---------- */
    function loadStats() {
      const box = $('#st-list'); box.innerHTML = '<p class="hint">Cargando…</p>'; $('#st-summary').innerHTML = '';
      socket.emit('account:stats', null, (r) => { if (!r || !r.ok) { box.innerHTML = ''; return toast((r && r.error) || 'No se pudieron cargar las estadísticas.', true); } renderStats(r); });
    }
    const DN = ['Fácil', 'Normal', 'Difícil'];
    const fmt = (n) => Number(n).toLocaleString('es-AR');
    function renderStats(r) {
      const u = r.user || {}, G = r.games || {};
      const tried = CAT.filter((g) => G[g.id] && G[g.id].plays > 0).length, rounds = Object.values(G).reduce((a, g) => a + g.plays, 0);
      const tiles = [['🎮', u.matchesPlayed || 0, 'Partidas jugadas'], ['🏆', u.matchesWon || 0, 'Partidas ganadas'], ['🔁', rounds, 'Rondas jugadas'], ['🧩', `${tried}/${CAT.length}`, 'Juegos probados']];
      const sm = $('#st-summary'); sm.innerHTML = '';
      tiles.forEach(([e, v, l]) => { const t = el('div', 'st-tile'); t.append(el('span', 'e', e), el('b', '', String(v)), el('small', '', l)); sm.appendChild(t); });
      const box = $('#st-list'); box.innerHTML = '';
      PACKS.forEach((pk) => {
        const sec = el('div', 'pack card'); sec.style.setProperty('--pk', pk.color);
        const head = el('div', 'pack-head'); head.append(el('span', 'pe', pk.emoji)); const t = el('div', 'pt', pk.name); t.append(el('small', '', pk.desc)); head.append(t); sec.appendChild(head);
        CAT.filter((g) => g.pack === pk.id).forEach((g) => {
          const s = G[g.id], best = s ? Math.max(...s.best) : 0, row = el('div', 'gs-row' + (s && s.plays ? '' : ' none'));
          row.style.setProperty('--gc', g.color);
          const nm = el('div', 'st-name'); nm.append(el('span', 'e', g.emoji), el('span', 'n', g.name));
          const sc = el('div', 'st-best'); sc.append(el('b', '', s && s.plays ? fmt(best) : '—'), el('small', '', s && s.plays ? 'récord' : 'sin jugar'));
          const bar = el('div', 'st-bar'); const fill = el('i'); fill.style.width = Math.min(100, Math.round(best / g.maxScore * 100)) + '%'; bar.appendChild(fill);
          const chips = el('div', 'st-chips');
          DN.forEach((d, i) => { const ch = el('span', 'dc' + (s && s.best[i] ? ' on' : ''), `${d} ${s && s.best[i] ? fmt(s.best[i]) : '–'}`); chips.appendChild(ch); });
          const meta = el('div', 'st-meta', s && s.plays ? `▶ ${s.plays} ${s.plays === 1 ? 'vez' : 'veces'} · 🥇 ${s.wins} · prom. ${fmt(Math.round(s.total / s.plays))}` : 'Jugá una partida con lobby para registrar tu récord');
          row.append(nm, sc, bar, chips, meta); sec.appendChild(row);
        });
        box.appendChild(sec);
      });
    }

    paintMe();
    return { openAccount, setUser };
  }
  window.Account = { init };
})();
