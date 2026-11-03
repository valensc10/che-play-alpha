'use strict';
/* ChePlay - servidor (Express + Socket.IO)
   El servidor es la autoridad: maneja lobbies, configuración (solo host), rondas,
   tiempos máximos, validación de puntajes, puntos por posición con empates y reconexión. */
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Server } = require('socket.io');
const fs = require('fs');
const CATALOG = require('../shared/catalog.js');
const { AVATARS } = CATALOG;
const { createStore } = require('./db.js');
const { makeSigner, verifyGoogle } = require('./auth.js');

const GAME = Object.fromEntries(CATALOG.map((g) => [g.id, g]));
const PORT = Number(process.env.PORT) || 3000;
const THEMES = ['cheplay', 'neon', 'sunset', 'ocean', 'forest', 'candy'];
const REACTIONS = ['👏', '🔥', '😂', '😮', '❤️', '💀'];
const PHRASES = ['¡GG!', '¡Revancha!', '¡Casi!', '¡Qué crack!', '¡Uf, qué difícil!', '¡Otra más!'];
const COLORS = ['#ff4d8d', '#7c5cff', '#2ee6a6', '#ffc83d', '#4dabf7', '#ff8a3d', '#e599f7', '#69db7c', '#ff6b6b', '#38d9a9', '#fcc419', '#74c0fc'];
const GRACE_MS = 4000;          // margen extra sobre la duración del juego
const LOBBY_LEAVE_GRACE = 20000; // tiempo para reconectar antes de sacar a un jugador del lobby
const HOST_GRACE = 12000;        // si el host se desconecta, se transfiere pasado este tiempo
const EMPTY_TTL = 60000;         // lobby sin nadie conectado se elimina

/* ---------- cuentas (opcional): Google + base de datos ---------- */
const IS_PROD = process.env.NODE_ENV === 'production';
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const DEV_LOGIN = !IS_PROD && process.env.DEV_LOGIN === '1'; // login de prueba, nunca en producción
const store = createStore();
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (store.kind === 'postgres') { console.warn('  ⚠️  Falta SESSION_SECRET: las sesiones se cerrarán cada vez que el servidor reinicie.'); return crypto.randomBytes(32).toString('hex'); }
  const f = path.join(__dirname, '..', 'data', 'secret.txt'); // modo archivo: se guarda para sobrevivir reinicios
  try { return fs.readFileSync(f, 'utf8').trim(); } catch (e) { const v = crypto.randomBytes(32).toString('hex'); try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, v); } catch (e2) { /* noop */ } return v; }
}
const signer = makeSigner(loadSecret());

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 15000, maxHttpBufferSize: 1e5 });
app.get('/healthz', (_, res) => res.type('text').send('ok'));
app.get('/api/config', (_, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID || null, devLogin: DEV_LOGIN, storage: store.kind }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

const lobbies = new Map();   // code -> lobby
const sessions = new Map();  // token -> { code, id }

/* ---------- utilidades ---------- */
const rid = (n = 6) => crypto.randomBytes(n).toString('hex');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toInt = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
function cleanText(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function genCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let tries = 0; tries < 50; tries++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += abc[crypto.randomInt(abc.length)];
    if (!lobbies.has(c)) return c;
  }
  return rid(3).toUpperCase();
}
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function defaultConfig() {
  return {
    totalGames: 8,          // cantidad de juegos de la partida
    targetPoints: 0,        // 0 = sin límite; si alguien llega, termina la partida
    games: CATALOG.map((g) => g.id), // juegos habilitados
    difficulty: 1,          // 0 fácil, 1 normal, 2 difícil
    maxPlayers: 12,
    introSeconds: 5,
    order: 'random',        // random | fixed
    manualAdvance: false,   // el host avanza el podio a mano
    podiumSeconds: 7,
    chat: true,
    theme: 'cheplay'
  };
}

function applyConfig(l, patch) {
  const c = l.config;
  if (patch.targetPoints !== undefined) c.targetPoints = clamp(toInt(patch.targetPoints, 0), 0, 9999);
  if (Array.isArray(patch.games)) {
    const set = new Set(patch.games.filter((id) => GAME[id]));
    c.games = CATALOG.map((g) => g.id).filter((id) => set.has(id));
  }
  if (patch.totalGames !== undefined) c.totalGames = clamp(toInt(patch.totalGames, c.totalGames), 1, CATALOG.length);
  if (patch.difficulty !== undefined) c.difficulty = clamp(toInt(patch.difficulty, 1), 0, 2);
  if (patch.maxPlayers !== undefined) c.maxPlayers = clamp(toInt(patch.maxPlayers, 12), Math.max(1, l.players.size), 24);
  if (patch.introSeconds !== undefined) c.introSeconds = clamp(toInt(patch.introSeconds, 5), 3, 15);
  if (patch.order !== undefined) c.order = patch.order === 'fixed' ? 'fixed' : 'random';
  if (patch.manualAdvance !== undefined) c.manualAdvance = !!patch.manualAdvance;
  if (patch.podiumSeconds !== undefined) c.podiumSeconds = clamp(toInt(patch.podiumSeconds, 7), 4, 30);
  if (patch.chat !== undefined) c.chat = !!patch.chat;
  if (patch.theme !== undefined && THEMES.includes(patch.theme)) c.theme = patch.theme;
  if (patch.isPublic !== undefined) l.isPublic = !!patch.isPublic;
  if (patch.name !== undefined) { const n = cleanText(patch.name, 24); if (n.length >= 2) l.name = n; }
  if (c.games.length === 0) c.games = [CATALOG[0].id];
}

/* ---------- vistas públicas ---------- */
function publicPlayer(l, p) {
  return { id: p.id, nick: p.nick, avatar: p.avatar, color: p.color, connected: p.connected, total: p.total, done: p.done, isHost: p.id === l.hostId };
}
function snapshot(l) {
  return {
    code: l.code, name: l.name, isPublic: l.isPublic, hasPassword: !!l.password,
    hostId: l.hostId, state: l.state, config: { ...l.config, totalGames: Math.min(l.config.totalGames, l.config.games.length) },
    players: [...l.players.values()].map((p) => publicPlayer(l, p)),
    round: { index: l.roundIndex, total: l.queue.length, gameId: l.currentGame }
  };
}
function emitState(l) { io.to(l.code).emit('lobby:state', snapshot(l)); scheduleList(); }

let listTimer = null;
function listPayload() {
  return [...lobbies.values()].filter((l) => l.isPublic).map((l) => ({
    code: l.code, name: l.name, players: l.players.size, max: l.config.maxPlayers,
    state: l.state, hasPassword: !!l.password,
    host: (l.players.get(l.hostId) || {}).nick || '—'
  })).sort((a, b) => (a.state === 'LOBBY' ? 0 : 1) - (b.state === 'LOBBY' ? 0 : 1) || b.players - a.players);
}
function scheduleList() {
  if (listTimer) return;
  listTimer = setTimeout(() => { listTimer = null; io.to('menu').emit('lobby:list', listPayload()); }, 400);
}

/* ---------- ciclo de vida del lobby ---------- */
function newLobby({ name, isPublic, password, maxPlayers }) {
  const l = {
    code: genCode(), name, isPublic: !!isPublic, password: password || '',
    hostId: null, state: 'LOBBY', config: defaultConfig(), players: new Map(),
    queue: [], roundIndex: 0, currentGame: null, seed: 0, startedAt: 0,
    participants: [], timer: null, hostTimer: null, emptyTimer: null, last: null, chatLog: []
  };
  if (maxPlayers) l.config.maxPlayers = clamp(toInt(maxPlayers, 12), 2, 24);
  lobbies.set(l.code, l);
  return l;
}
function destroyLobby(l) {
  clearTimeout(l.timer); clearTimeout(l.hostTimer); clearTimeout(l.emptyTimer);
  for (const p of l.players.values()) { clearTimeout(p.leaveTimer); sessions.delete(p.token); }
  lobbies.delete(l.code);
  scheduleList();
}
function connectedCount(l) { let n = 0; for (const p of l.players.values()) if (p.connected) n++; return n; }
function checkEmpty(l) {
  clearTimeout(l.emptyTimer);
  if (l.players.size === 0) return destroyLobby(l);
  if (connectedCount(l) === 0) l.emptyTimer = setTimeout(() => { if (connectedCount(l) === 0) destroyLobby(l); }, EMPTY_TTL);
}
function transferHost(l, toId) {
  const target = toId ? l.players.get(toId) : [...l.players.values()].find((p) => p.connected);
  if (!target) return;
  l.hostId = target.id;
}
function addPlayer(l, socket, nick, avatar, userId) {
  const id = rid(3), token = rid(12);
  const used = new Set([...l.players.values()].map((p) => p.color));
  const color = COLORS.find((c) => !used.has(c)) || COLORS[l.players.size % COLORS.length];
  const p = { id, token, nick, avatar, color, socketId: socket.id, connected: true, total: 0, score: 0, progress: 0, done: false, gained: 0, msgTimes: [], leaveTimer: null, userId: userId || null, finished: false };
  l.players.set(id, p);
  sessions.set(token, { code: l.code, id });
  socket.data.token = token;
  socket.leave('menu');
  socket.join(l.code);
  if (!l.hostId) l.hostId = id;
  return p;
}
function removePlayer(l, p, reason) {
  clearTimeout(p.leaveTimer);
  l.players.delete(p.id);
  sessions.delete(p.token);
  const s = io.sockets.sockets.get(p.socketId);
  if (s) {
    s.leave(l.code); s.join('menu'); s.data.token = null;
    if (reason) s.emit('kicked', reason);
  }
  if (l.players.size === 0) return destroyLobby(l);
  if (l.hostId === p.id) transferHost(l);
  if (l.state === 'PLAYING') maybeEndRound(l);
  emitState(l);
}
function ctxOf(socket) {
  const s = socket.data.token && sessions.get(socket.data.token);
  if (!s) return {};
  const l = lobbies.get(s.code);
  if (!l) return {};
  const p = l.players.get(s.id);
  return p ? { l, p } : {};
}
function validNick(l, nick, exceptId) {
  const n = cleanText(nick, 14);
  if (n.length < 2) return { error: 'El nickname debe tener entre 2 y 14 caracteres.' };
  const low = n.toLowerCase();
  for (const p of l.players.values()) if (p.id !== exceptId && p.nick.toLowerCase() === low) return { error: 'Ese nickname ya está en uso en este lobby.' };
  return { nick: n };
}

function defaultNick(name, email) {
  let n = cleanText(String(name || '').split(' ')[0], 14);
  if (n.length < 2) n = cleanText(String(email || '').split('@')[0], 14);
  return n.length >= 2 ? n : 'Jugador' + Math.floor(Math.random() * 900 + 100);
}
function uniqueNick(l, nick) { // en cuentas, si el nick ya está en el lobby se le agrega un número
  let n = nick, i = 2;
  const taken = (x) => [...l.players.values()].some((p) => p.nick.toLowerCase() === x.toLowerCase());
  while (taken(n)) n = nick.slice(0, 14 - String(i).length - 1) + ' ' + i++;
  return n;
}
const logErr = (what) => (e) => console.error(`[db] ${what}:`, e && e.message);

/* ---------- partida ---------- */
function buildQueue(l) {
  const c = l.config;
  let list = c.games.slice();
  if (c.order === 'random') list = shuffle(list);
  return list.slice(0, Math.min(c.totalGames, list.length));
}
function startGame(l) {
  l.queue = buildQueue(l);
  l.roundIndex = 0; l.history = []; l.rematch = new Set();
  for (const p of l.players.values()) { p.total = 0; p.gained = 0; }
  startRound(l);
}
function startRound(l) {
  clearTimeout(l.timer);
  l.roundIndex += 1;
  l.state = 'PLAYING';
  const gameId = l.queue[l.roundIndex - 1];
  const meta = GAME[gameId];
  l.currentGame = gameId;
  l.seed = crypto.randomInt(1, 2 ** 31 - 1);
  const introMs = l.config.introSeconds * 1000;
  l.startedAt = Date.now() + introMs;
  l.participants = [...l.players.values()].map((p) => p.id);
  for (const p of l.players.values()) { p.score = 0; p.progress = 0; p.gained = 0; p.done = !p.connected; p.finished = false; }
  l.last = null;
  io.to(l.code).emit('round:start', {
    index: l.roundIndex, total: l.queue.length, gameId, seed: l.seed,
    difficulty: l.config.difficulty, introMs
  });
  io.to(l.code).emit('round:progress', roundProgress(l));
  l.timer = setTimeout(() => endRound(l), introMs + meta.duration + GRACE_MS);
  emitState(l);
  maybeEndRound(l);
}

function scheduleLive(l) {
  if (l.liveTimer) return;
  l.liveTimer = setTimeout(() => {
    l.liveTimer = null; if (l.state !== 'PLAYING') return;
    const rows = l.participants.map((id) => l.players.get(id)).filter(Boolean)
      .map((p) => ({ id: p.id, avatar: p.avatar, color: p.color, nick: p.nick, score: p.done ? p.score : p.progress, done: p.done }))
      .sort((a, b) => b.score - a.score);
    io.to(l.code).emit('round:live', rows);
  }, 600);
}
function roundProgress(l) {
  const ps = l.participants.map((id) => l.players.get(id)).filter(Boolean);
  return { done: ps.filter((p) => p.done).length, total: ps.length };
}
function maybeEndRound(l) {
  if (l.state !== 'PLAYING') return;
  const ps = l.participants.map((id) => l.players.get(id)).filter(Boolean);
  if (ps.length === 0 || ps.every((p) => p.done || !p.connected)) {
    clearTimeout(l.timer);
    l.timer = setTimeout(() => endRound(l), 700);
  }
}
function rankBy(list, key) {
  // ranking de competición: empates comparten posición
  const sorted = list.slice().sort((a, b) => b[key] - a[key]);
  return sorted.map((p) => ({ p, rank: 1 + sorted.filter((q) => q[key] > p[key]).length }));
}
function endRound(l) {
  if (l.state !== 'PLAYING') return;
  clearTimeout(l.timer);
  l.state = 'PODIUM';
  const ps = l.participants.map((id) => l.players.get(id)).filter(Boolean);
  for (const p of ps) { if (!p.done) p.score = p.progress; p.score = Math.max(0, Math.round(p.score)); }
  const n = ps.length;
  const ranked = rankBy(ps, 'score');
  for (const { p, rank } of ranked) { p.gained = n - rank + 1; p.total += p.gained; }
  const meta = GAME[l.currentGame];
  const ranking = ranked.map(({ p, rank }) => ({
    id: p.id, nick: p.nick, avatar: p.avatar, color: p.color, score: p.score, rank, gained: p.gained, total: p.total, connected: p.connected
  }));
  const target = l.config.targetPoints;
  const reached = target > 0 && ps.some((p) => p.total >= target);
  const lastRound = l.roundIndex >= l.queue.length;
  for (const { p, rank } of ranked) { // estadísticas de cuentas (la práctica nunca llega acá)
    if (p.userId && (p.finished || p.connected)) store.recordRound(p.userId, meta.id, l.config.difficulty, p.score, rank === 1 && n >= 2).catch(logErr('recordRound'));
  }
  (l.history = l.history || []).push({ gameId: meta.id, max: meta.maxScore, rows: ranking.map((r) => ({ id: r.id, rank: r.rank, score: r.score, total: r.total })) });
  const payload = { index: l.roundIndex, total: l.queue.length, gameId: meta.id, ranking, target };
  if (reached || lastRound) {
    l.last = { event: 'round:result', payload: { ...payload, auto: null, final: true } };
    io.to(l.code).emit('round:result', l.last.payload);
    l.timer = setTimeout(() => finishGame(l, reached ? 'target' : 'rounds'), 6500);
  } else {
    const auto = l.config.manualAdvance ? null : l.config.podiumSeconds * 1000;
    l.last = { event: 'round:result', payload: { ...payload, auto, final: false } };
    io.to(l.code).emit('round:result', l.last.payload);
    if (auto) l.timer = setTimeout(() => { if (l.state === 'PODIUM') startRound(l); }, auto);
  }
  emitState(l);
}
function finishGame(l, reason) {
  if (l.state !== 'PODIUM') return;
  clearTimeout(l.timer);
  l.state = 'FINAL';
  const ps = [...l.players.values()];
  const ranked = rankBy(ps, 'total');
  const ranking = ranked.map(({ p, rank }) => ({ id: p.id, nick: p.nick, avatar: p.avatar, color: p.color, total: p.total, rank, connected: p.connected }));
  l.rematch = new Set();
  for (const r of ranking) { const q = l.players.get(r.id); if (q && q.userId && l.roundIndex >= 1) store.recordMatch(q.userId, r.rank === 1 && ranking.length >= 2).catch(logErr('recordMatch')); }
  l.last = { event: 'game:final', payload: { ranking, reason, rounds: l.roundIndex, awards: computeAwards(l, ranking) } };
  io.to(l.code).emit('game:final', l.last.payload);
  emitState(l);
}

/* ---------- premios de la partida ---------- */
function computeAwards(l, ranking) {
  const H = l.history || [];
  if (H.length < 2 || ranking.length < 2) return [];
  const ids = ranking.map((r) => r.id), info = Object.fromEntries(ranking.map((r) => [r.id, r]));
  const stat = Object.fromEntries(ids.map((id) => [id, { wins: 0, seconds: 0, ranks: [], best: 0, bestGame: null, cum: [] }]));
  let acc = Object.fromEntries(ids.map((id) => [id, 0]));
  H.forEach((rd) => {
    const n = rd.rows.length;
    rd.rows.forEach((r) => {
      const st = stat[r.id]; if (!st) return;
      if (r.rank === 1) st.wins++; if (r.rank === 2) st.seconds++;
      st.ranks.push(r.rank / n);
      const f = rd.max ? r.score / rd.max : 0; if (f > st.best) { st.best = f; st.bestGame = rd.gameId; }
    });
  });
  const pick = (fn, min) => { // ganador único (sin empate en el primer puesto)
    const list = ids.map((id) => [id, fn(stat[id])]).sort((a, b) => b[1] - a[1]);
    return list[0][1] >= min && (list.length < 2 || list[0][1] > list[1][1]) ? list[0][0] : null;
  };
  const out = []; const used = new Set();
  const add = (key, emoji, title, desc, id) => { if (id && !used.has(id) && out.length < 4) { used.add(id); out.push({ key, emoji, title, desc, id, nick: info[id].nick, avatar: info[id].avatar, color: info[id].color }); } };
  add('wins', '👑', 'Rey de las rondas', 'Ganó más rondas', pick((s) => s.wins, 2));
  add('steady', '🧱', 'El más constante', 'Resultados muy parejos', pick((s) => { if (s.ranks.length < 3) return -1; const m = s.ranks.reduce((a, b) => a + b, 0) / s.ranks.length; return 1 - Math.sqrt(s.ranks.reduce((a, b) => a + (b - m) ** 2, 0) / s.ranks.length); }, 0.5));
  add('best', '🎯', 'Jugada de la partida', 'Mejor puntaje relativo en un juego', pick((s) => s.best, 0.01));
  add('second', '🥈', 'Casi casi', 'Más segundos puestos', pick((s) => s.seconds, 2));
  return out;
}
function backToLobby(l) {
  clearTimeout(l.timer); l.rematch = new Set(); l.history = [];
  l.state = 'LOBBY'; l.roundIndex = 0; l.currentGame = null; l.queue = []; l.last = null;
  for (const p of l.players.values()) { p.total = 0; p.score = 0; p.progress = 0; p.done = false; p.gained = 0; }
  io.to(l.code).emit('lobby:back');
  emitState(l);
}

/* ---------- sockets ---------- */
io.on('connection', (socket) => {
  socket.join('menu');
  const ack = (cb, data) => { if (typeof cb === 'function') cb(data); };

  /* --- cuentas --- */
  let lastAcct = 0;
  const throttled = () => { const n = Date.now(); if (n - lastAcct < 300) return true; lastAcct = n; return false; };
  const loginOk = (cb, user) => { socket.data.user = user; ack(cb, { ok: true, token: signer.issue(user.id), user }); };
  const dbFail = (cb) => (e) => { console.error('[auth]', e && e.message); ack(cb, { ok: false, error: 'No se pudo completar la operación. Probá de nuevo en unos segundos.' }); };
  socket.on('auth:google', async ({ credential } = {}, cb) => {
    if (throttled()) return ack(cb, { ok: false, error: 'Esperá un momento.' });
    try {
      const g = await verifyGoogle(credential, GOOGLE_CLIENT_ID);
      const user = await store.upsertGoogleUser({ sub: g.sub, email: g.email, nick: defaultNick(g.name, g.email), avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] });
      loginOk(cb, user);
    } catch (e) { console.error('[auth] google:', e.message); ack(cb, { ok: false, error: 'No se pudo verificar tu cuenta de Google.' }); }
  });
  socket.on('auth:dev', async ({ name } = {}, cb) => { // solo con DEV_LOGIN=1 y fuera de producción
    if (!DEV_LOGIN) return ack(cb, { ok: false, error: 'Login de prueba desactivado.' });
    const n = cleanText(name, 14) || 'Tester';
    try { loginOk(cb, await store.upsertGoogleUser({ sub: 'dev:' + n.toLowerCase(), email: n.toLowerCase() + '@prueba.local', nick: defaultNick(n, ''), avatar: '😀' })); } catch (e) { dbFail(cb)(e); }
  });
  socket.on('auth:token', async ({ token } = {}, cb) => {
    const id = signer.verify(token);
    if (!id) return ack(cb, { ok: false });
    try { const user = await store.getUser(id); if (!user) return ack(cb, { ok: false }); socket.data.user = user; ack(cb, { ok: true, user }); } catch (e) { dbFail(cb)(e); }
  });
  socket.on('auth:logout', (_, cb) => { socket.data.user = null; ack(cb, { ok: true }); });
  socket.on('account:update', async ({ nick, avatar } = {}, cb) => {
    const u = socket.data.user; if (!u) return ack(cb, { ok: false, error: 'Iniciá sesión.' });
    if (throttled()) return ack(cb, { ok: false, error: 'Esperá un momento.' });
    const n = cleanText(nick, 14);
    if (n.length < 2) return ack(cb, { ok: false, error: 'El nickname debe tener entre 2 y 14 caracteres.' });
    if (!AVATARS.includes(avatar)) return ack(cb, { ok: false, error: 'Avatar inválido.' });
    try { const user = await store.updateProfile(u.id, { nick: n, avatar }); socket.data.user = user; ack(cb, { ok: true, user }); } catch (e) { dbFail(cb)(e); }
  });
  socket.on('account:stats', async (_, cb) => {
    const u = socket.data.user; if (!u) return ack(cb, { ok: false, error: 'Iniciá sesión.' });
    try { ack(cb, { ok: true, ...(await store.getStats(u.id)) }); } catch (e) { dbFail(cb)(e); }
  });
  socket.on('account:delete', async (_, cb) => {
    const u = socket.data.user; if (!u) return ack(cb, { ok: false, error: 'Iniciá sesión.' });
    try { await store.deleteUser(u.id); socket.data.user = null; ack(cb, { ok: true }); } catch (e) { dbFail(cb)(e); }
  });

  socket.on('session:resume', ({ token } = {}, cb) => {
    const s = token && sessions.get(token);
    const l = s && lobbies.get(s.code);
    const p = l && l.players.get(s.id);
    if (!p) return ack(cb, { ok: false });
    p.socketId = socket.id; p.connected = true;
    clearTimeout(p.leaveTimer); clearTimeout(l.emptyTimer);
    socket.data.token = token;
    socket.leave('menu'); socket.join(l.code);
    if (l.state === 'PLAYING' && !p.done) { p.done = true; p.score = p.progress; } // anti re-roll
    if (l.hostId !== p.id && !(l.players.get(l.hostId) || {}).connected) { clearTimeout(l.hostTimer); }
    ack(cb, { ok: true, code: l.code, me: p.id, snapshot: snapshot(l), last: l.last, round: l.state === 'PLAYING' ? roundProgress(l) : null });
    emitState(l);
    maybeEndRound(l);
  });

  socket.on('lobby:list', (_, cb) => ack(cb, listPayload()));

  socket.on('lobby:create', (d = {}, cb) => {
    if (socket.data.token && ctxOf(socket).l) return ack(cb, { ok: false, error: 'Ya estás en un lobby.' });
    const name = cleanText(d.name, 24) || `Sala de ${cleanText(d.nick, 14)}`;
    const acct = socket.data.user || null;
    const nickRes = acct ? acct.nick : cleanText(d.nick, 14);
    if (nickRes.length < 2) return ack(cb, { ok: false, error: 'Elegí un nickname válido.' });
    const l = newLobby({ name, isPublic: d.isPublic !== false, password: cleanText(d.password, 20), maxPlayers: d.maxPlayers });
    const p = addPlayer(l, socket, nickRes, acct ? acct.avatar : (AVATARS.includes(d.avatar) ? d.avatar : '😀'), acct && acct.id);
    ack(cb, { ok: true, token: p.token, code: l.code, me: p.id, snapshot: snapshot(l) });
    emitState(l);
  });

  socket.on('lobby:join', (d = {}, cb) => {
    if (ctxOf(socket).l) return ack(cb, { ok: false, error: 'Ya estás en un lobby.' });
    const l = lobbies.get(cleanText(d.code, 6).toUpperCase());
    if (!l) return ack(cb, { ok: false, error: 'Ese lobby no existe.' });
    if (l.state !== 'LOBBY') return ack(cb, { ok: false, error: 'La partida ya comenzó.' });
    if (l.players.size >= l.config.maxPlayers) return ack(cb, { ok: false, error: 'El lobby está lleno.' });
    if (l.password && l.password !== cleanText(d.password, 20)) return ack(cb, { ok: false, error: 'Contraseña incorrecta.', needPassword: true });
    const acct = socket.data.user || null;
    if (acct && [...l.players.values()].some((q) => q.userId === acct.id)) return ack(cb, { ok: false, error: 'Tu cuenta ya está en este lobby (¿otra pestaña?).' });
    let v;
    if (acct) v = { nick: uniqueNick(l, acct.nick) };
    else { v = validNick(l, d.nick); if (v.error) return ack(cb, { ok: false, error: v.error }); }
    const p = addPlayer(l, socket, v.nick, acct ? acct.avatar : (AVATARS.includes(d.avatar) ? d.avatar : '😀'), acct && acct.id);
    clearTimeout(l.emptyTimer);
    ack(cb, { ok: true, token: p.token, code: l.code, me: p.id, snapshot: snapshot(l) });
    io.to(l.code).emit('toast', { text: `${p.avatar} ${p.nick} se unió` });
    emitState(l);
  });

  socket.on('lobby:leave', (_, cb) => {
    const { l, p } = ctxOf(socket);
    if (l) removePlayer(l, p);
    ack(cb, { ok: true });
  });

  socket.on('lobby:config', (patch = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id || l.state !== 'LOBBY') return;
    applyConfig(l, patch);
    emitState(l);
  });

  socket.on('lobby:kick', ({ id } = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id || id === p.id) return;
    const t = l.players.get(id);
    if (t) removePlayer(l, t, 'El host te sacó del lobby.');
  });

  socket.on('lobby:host', ({ id } = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id) return;
    if (l.players.has(id)) { transferHost(l, id); emitState(l); }
  });

  socket.on('chat', ({ text } = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || !l.config.chat) return;
    const t = cleanText(text, 120);
    if (!t) return;
    const now = Date.now();
    p.msgTimes = p.msgTimes.filter((x) => now - x < 6000);
    if (p.msgTimes.length >= 5) return socket.emit('toast', { text: 'Vas muy rápido con el chat 😅' });
    p.msgTimes.push(now);
    io.to(l.code).emit('chat', { id: p.id, nick: p.nick, avatar: p.avatar, color: p.color, text: t });
  });


  socket.on('react', ({ e, ph } = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || !p) return;
    const now = Date.now();
    p.reactTimes = (p.reactTimes || []).filter((x) => now - x < 3000);
    if (p.reactTimes.length >= 6) return;
    p.reactTimes.push(now);
    const out = { id: p.id, nick: p.nick, avatar: p.avatar, color: p.color };
    if (typeof e === 'string' && REACTIONS.includes(e)) out.e = e;
    else if (Number.isInteger(ph) && PHRASES[ph]) out.ph = PHRASES[ph];
    else return;
    io.to(l.code).emit('react', out);
  });

  socket.on('rematch:vote', () => {
    const { l, p } = ctxOf(socket);
    if (!l || !p || l.state !== 'FINAL') return;
    l.rematch = l.rematch || new Set();
    if (l.rematch.has(p.id)) l.rematch.delete(p.id); else l.rematch.add(p.id);
    const online = [...l.players.values()].filter((q) => q.connected);
    const votes = online.filter((q) => l.rematch.has(q.id)).length;
    io.to(l.code).emit('rematch:votes', { votes, total: online.length, ids: [...l.rematch] });
    if (online.length && votes * 2 > online.length) backToLobby(l);
  });

  socket.on('game:start', () => {
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id || l.state !== 'LOBBY') return;
    startGame(l);
  });

  socket.on('game:progress', ({ score } = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || l.state !== 'PLAYING' || p.done || !l.participants.includes(p.id)) return;
    const meta = GAME[l.currentGame];
    p.progress = clamp(Math.round(Number(score) || 0), 0, meta.maxScore);
    scheduleLive(l);
  });

  socket.on('game:done', ({ score } = {}) => {
    const { l, p } = ctxOf(socket);
    if (!l || l.state !== 'PLAYING' || p.done || !l.participants.includes(p.id)) return;
    if (Date.now() < l.startedAt - 300) return; // no puede terminar antes de empezar
    const meta = GAME[l.currentGame];
    p.score = clamp(Math.round(Number(score) || 0), 0, meta.maxScore);
    p.done = true; p.finished = true; scheduleLive(l);
    io.to(l.code).emit('round:progress', roundProgress(l));
    maybeEndRound(l);
  });

  socket.on('game:next', () => {
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id || l.state !== 'PODIUM' || !l.last || l.last.payload.final) return;
    startRound(l);
  });

  socket.on('game:skip', () => { // el host puede saltar el podio final
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id || l.state !== 'PODIUM' || !l.last || !l.last.payload.final) return;
    finishGame(l, 'rounds');
  });

  socket.on('game:lobby', () => {
    const { l, p } = ctxOf(socket);
    if (!l || l.hostId !== p.id || l.state !== 'FINAL') return;
    backToLobby(l);
  });

  socket.on('disconnect', () => {
    const { l, p } = ctxOf(socket);
    if (!l || p.socketId !== socket.id) return;
    p.connected = false;
    if (l.state === 'LOBBY') {
      p.leaveTimer = setTimeout(() => { if (!p.connected && l.players.has(p.id)) removePlayer(l, p); }, LOBBY_LEAVE_GRACE);
    }
    if (l.hostId === p.id) {
      clearTimeout(l.hostTimer);
      l.hostTimer = setTimeout(() => {
        const h = l.players.get(l.hostId);
        if (h && !h.connected) { transferHost(l); emitState(l); }
      }, HOST_GRACE);
    }
    if (l.state === 'PLAYING') maybeEndRound(l);
    checkEmpty(l);
    emitState(l);
  });
});

process.on('uncaughtException', (e) => console.error('[error]', e));

store.init().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n  🎮  CHEPLAY corriendo\n');
    console.log(`  Local:  http://localhost:${PORT}`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log(`  En LAN: http://${i.address}:${PORT}   <- compartí este link`);
    }
    console.log(`\n  Cuentas: ${GOOGLE_CLIENT_ID ? 'Google activado' : 'Google sin configurar (solo invitados)'}${DEV_LOGIN ? ' + LOGIN DE PRUEBA' : ''} · datos en ${store.kind === 'postgres' ? 'Postgres' : 'data/db.json'}\n`);
  });
}).catch((e) => { console.error('No se pudo iniciar la base de datos:', e.message); process.exit(1); });
