'use strict';
/* ChePlay - persistencia de cuentas y estadísticas.
   - Con DATABASE_URL (Postgres, p. ej. Neon) usa la base remota.
   - Sin DATABASE_URL guarda en data/db.json (para probar en tu PC o en LAN). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const newId = () => 'u_' + crypto.randomBytes(8).toString('hex');
const DIFFS = [0, 1, 2];

/* ───────────── Archivo local (JSON) ───────────── */
function fileStore(dir) {
  const file = path.join(dir, 'db.json');
  let db = { users: {}, stats: {} };
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* primera vez */ }
  let timer = null;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(db)); fs.renameSync(file + '.tmp', file); } catch (e) { console.error('No se pudo guardar db.json:', e.message); }
    }, 150);
  }
  const bySub = (sub) => Object.values(db.users).find((u) => u.sub === sub);
  const pub = (u) => u && { id: u.id, email: u.email, nick: u.nick, avatar: u.avatar, createdAt: u.createdAt, matchesPlayed: u.matchesPlayed || 0, matchesWon: u.matchesWon || 0 };
  return {
    kind: 'file',
    async init() { fs.mkdirSync(dir, { recursive: true }); },
    async upsertGoogleUser({ sub, email, nick, avatar }) {
      let u = bySub(sub);
      if (!u) { u = { id: newId(), sub, email, nick, avatar, createdAt: new Date().toISOString(), matchesPlayed: 0, matchesWon: 0 }; db.users[u.id] = u; }
      u.email = email || u.email; u.lastLogin = new Date().toISOString(); save();
      return pub(u);
    },
    async getUser(id) { return pub(db.users[id]); },
    async updateProfile(id, { nick, avatar }) { const u = db.users[id]; if (!u) return null; u.nick = nick; u.avatar = avatar; save(); return pub(u); },
    async deleteUser(id) { delete db.users[id]; for (const k of Object.keys(db.stats)) if (k.startsWith(id + '|')) delete db.stats[k]; save(); },
    async recordRound(userId, gameId, diff, score, won) {
      if (!db.users[userId]) return;
      const k = `${userId}|${gameId}|${diff}`;
      const s = db.stats[k] || (db.stats[k] = { best: 0, plays: 0, wins: 0, total: 0, last: null });
      s.best = Math.max(s.best, score); s.plays++; s.wins += won ? 1 : 0; s.total += score; s.last = new Date().toISOString(); save();
    },
    async recordMatch(userId, won) { const u = db.users[userId]; if (!u) return; u.matchesPlayed = (u.matchesPlayed || 0) + 1; if (won) u.matchesWon = (u.matchesWon || 0) + 1; save(); },
    async getStats(userId) {
      const games = {};
      for (const [k, s] of Object.entries(db.stats)) {
        const [uid, gid, d] = k.split('|'); if (uid !== userId) continue;
        const g = games[gid] || (games[gid] = { best: [0, 0, 0], playsBy: [0, 0, 0], plays: 0, wins: 0, total: 0, last: null });
        g.best[+d] = s.best; g.playsBy[+d] = s.plays; g.plays += s.plays; g.wins += s.wins; g.total += s.total;
        if (!g.last || s.last > g.last) g.last = s.last;
      }
      return { user: pub(db.users[userId]), games };
    }
  };
}

/* ───────────── Postgres (Neon, Supabase, etc.) ───────────── */
function pgStore(url) {
  let Pool;
  try { ({ Pool } = require('pg')); } catch (e) { throw new Error('Falta el paquete "pg". Ejecutá: npm install'); }
  const local = /localhost|127\.0\.0\.1/.test(url);
  const clean = url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
  const pool = new Pool({ connectionString: clean, ssl: local ? false : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 20000, connectionTimeoutMillis: 15000 });
  pool.on('error', (e) => console.error('Postgres (conexión inactiva):', e.message)); // Neon cierra conexiones ociosas
  const q = async (text, params) => { // un reintento: el primer query tras el "sueño" de Neon puede fallar
    try { return await pool.query(text, params); } catch (e) { if (/terminat|ECONNRESET|closed|timeout/i.test(e.message)) return pool.query(text, params); throw e; }
  };
  const toUser = (r) => r && { id: r.id, email: r.email, nick: r.nick, avatar: r.avatar, createdAt: r.created_at, matchesPlayed: r.matches_played, matchesWon: r.matches_won };
  return {
    kind: 'postgres',
    async init() {
      await q(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, sub TEXT UNIQUE NOT NULL, email TEXT, nick TEXT NOT NULL, avatar TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ,
        matches_played INTEGER NOT NULL DEFAULT 0, matches_won INTEGER NOT NULL DEFAULT 0)`);
      await q(`CREATE TABLE IF NOT EXISTS game_stats (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, game_id TEXT NOT NULL, diff SMALLINT NOT NULL,
        best_score INTEGER NOT NULL DEFAULT 0, plays INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0,
        total_score BIGINT NOT NULL DEFAULT 0, last_played TIMESTAMPTZ, PRIMARY KEY (user_id, game_id, diff))`);
    },
    async upsertGoogleUser({ sub, email, nick, avatar }) {
      const r = await q(`INSERT INTO users (id, sub, email, nick, avatar, last_login) VALUES ($1,$2,$3,$4,$5, now())
        ON CONFLICT (sub) DO UPDATE SET email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email), last_login = now() RETURNING *`, [newId(), sub, email, nick, avatar]);
      return toUser(r.rows[0]);
    },
    async getUser(id) { const r = await q('SELECT * FROM users WHERE id = $1', [id]); return toUser(r.rows[0]); },
    async updateProfile(id, { nick, avatar }) { const r = await q('UPDATE users SET nick = $2, avatar = $3 WHERE id = $1 RETURNING *', [id, nick, avatar]); return toUser(r.rows[0]); },
    async deleteUser(id) { await q('DELETE FROM users WHERE id = $1', [id]); },
    async recordRound(userId, gameId, diff, score, won) {
      await q(`INSERT INTO game_stats (user_id, game_id, diff, best_score, plays, wins, total_score, last_played)
        VALUES ($1,$2,$3,$4,1,$5,$4, now())
        ON CONFLICT (user_id, game_id, diff) DO UPDATE SET best_score = GREATEST(game_stats.best_score, EXCLUDED.best_score),
          plays = game_stats.plays + 1, wins = game_stats.wins + EXCLUDED.wins, total_score = game_stats.total_score + EXCLUDED.best_score, last_played = now()`,
      [userId, gameId, diff, score, won ? 1 : 0]);
    },
    async recordMatch(userId, won) { await q('UPDATE users SET matches_played = matches_played + 1, matches_won = matches_won + $2 WHERE id = $1', [userId, won ? 1 : 0]); },
    async getStats(userId) {
      const u = await this.getUser(userId);
      const r = await q('SELECT * FROM game_stats WHERE user_id = $1', [userId]);
      const games = {};
      for (const s of r.rows) {
        const g = games[s.game_id] || (games[s.game_id] = { best: [0, 0, 0], playsBy: [0, 0, 0], plays: 0, wins: 0, total: 0, last: null });
        g.best[s.diff] = s.best_score; g.playsBy[s.diff] = s.plays; g.plays += s.plays; g.wins += s.wins; g.total += Number(s.total_score);
        if (!g.last || s.last_played > g.last) g.last = s.last_played;
      }
      return { user: u, games };
    }
  };
}

function createStore() {
  const url = process.env.DATABASE_URL;
  return url ? pgStore(url) : fileStore(path.join(__dirname, '..', 'data'));
}
module.exports = { createStore, fileStore, pgStore, DIFFS };
