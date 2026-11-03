/* ChePlay - ajustes y accesibilidad (se guardan en este navegador) */
(function () {
  'use strict';
  const KEY = 'cp_settings_v1', root = document.documentElement;
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  const DEFAULTS = { motion: mq('(prefers-reduced-motion: reduce)'), fx: false, contrast: mq('(prefers-contrast: more)'), cb: false, text: 's', left: false, live: true, react: true, roulette: true, vib: false };
  let cfg = Object.assign({}, DEFAULTS);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* noop */ }
  const listeners = [];

  function apply() {
    const d = root.dataset;
    d.motion = cfg.motion ? 'reduced' : 'full'; d.fx = cfg.fx ? 'off' : 'on'; d.contrast = cfg.contrast ? 'high' : 'normal';
    d.cb = cfg.cb ? 'on' : 'off'; d.text = cfg.text; d.left = cfg.left ? 'on' : 'off'; d.live = cfg.live ? 'on' : 'off'; d.vib = cfg.vib ? 'on' : 'off';
    d.reactions = cfg.react ? 'on' : 'off'; d.roulette = cfg.roulette ? 'on' : 'off';
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* noop */ } }
  function set(k, v) { cfg[k] = v; apply(); save(); listeners.forEach((f) => f(k, v)); }
  apply();

  window.Settings = { get: (k) => cfg[k], set, onChange: (f) => listeners.push(f), reset() { cfg = Object.assign({}, DEFAULTS); apply(); save(); paint(); listeners.forEach((f) => f('*')); } };

  /* ---------- panel ---------- */
  const $ = (s) => document.querySelector(s), modal = $('#modal-settings');
  if (!modal) return;
  const bind = [['#st-motion', 'motion'], ['#st-fx', 'fx'], ['#st-contrast', 'contrast'], ['#st-cb', 'cb'], ['#st-left', 'left'], ['#st-live', 'live'], ['#st-react', 'react'], ['#st-roulette', 'roulette'], ['#st-vib', 'vib']];
  const sfx = () => (window.Games && window.Games.sfx) || { isMuted: () => false, setMuted() {}, getVolume: () => 0.8, setVolume() {}, tap() {} };
  function paint() {
    bind.forEach(([id, k]) => { $(id).checked = !!cfg[k]; });
    $('#st-mute').checked = sfx().isMuted(); $('#st-vol').value = Math.round(sfx().getVolume() * 100);
    [...$('#st-text').children].forEach((b) => b.classList.toggle('on', b.dataset.v === cfg.text));
    const sb = $('#btn-sound'); if (sb) sb.textContent = sfx().isMuted() ? '🔇' : '🔊';
  }
  bind.forEach(([id, k]) => $(id).addEventListener('change', (e) => set(k, e.target.checked)));
  $('#st-mute').addEventListener('change', (e) => { sfx().setMuted(e.target.checked); paint(); });
  $('#st-vol').addEventListener('input', (e) => { sfx().setVolume(e.target.value / 100); if (sfx().isMuted() && e.target.value > 0) { sfx().setMuted(false); paint(); } });
  $('#st-vol').addEventListener('change', () => sfx().tap());
  $('#st-text').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { set('text', b.dataset.v); paint(); } });
  $('#st-reset').addEventListener('click', () => window.Settings.reset());

  let lastFocus = null;
  function open() { lastFocus = document.activeElement; paint(); modal.classList.remove('hidden'); setTimeout(() => $('#st-close').focus({ preventScroll: true }), 30); }
  function close() { modal.classList.add('hidden'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('#btn-settings').addEventListener('click', open); $('#st-close').addEventListener('click', close); $('#st-ok').addEventListener('click', close);
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') { // foco atrapado dentro del panel
      const f = [...modal.querySelectorAll('button, input, [tabindex]')].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }, true);
  window.Settings.paint = paint;
})();
