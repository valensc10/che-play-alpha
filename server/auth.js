'use strict';
/* ChePlay - sesiones firmadas y verificación de "Iniciar sesión con Google" (sin dependencias externas) */
const crypto = require('crypto');

const b64u = (b) => Buffer.from(b).toString('base64url');
const fromB64u = (s) => Buffer.from(s, 'base64url');

/* ---------- token de sesión propio (HMAC-SHA256) ---------- */
function makeSigner(secret, ttlDays = 30) {
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return {
    issue(userId) {
      const body = b64u(JSON.stringify({ u: userId, exp: Date.now() + ttlDays * 86400e3 }));
      return body + '.' + sign(body);
    },
    verify(token) {
      if (typeof token !== 'string' || token.length > 600) return null;
      const [body, sig] = token.split('.');
      if (!body || !sig) return null;
      const good = sign(body);
      if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
      try { const d = JSON.parse(fromB64u(body).toString('utf8')); return d && d.u && d.exp > Date.now() ? d.u : null; } catch (e) { return null; }
    }
  };
}

/* ---------- Google: verificación del ID token (JWT RS256) ---------- */
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let certCache = { keys: null, until: 0 };
let certProvider = async () => { // se puede reemplazar en tests
  if (certCache.keys && Date.now() < certCache.until) return certCache.keys;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error('No se pudieron obtener las claves de Google');
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  const j = await r.json();
  certCache = { keys: j.keys, until: Date.now() + (m ? +m[1] : 3600) * 1000 };
  return j.keys;
};
function setCertProvider(fn) { certProvider = fn; }

async function verifyGoogle(idToken, clientId) {
  if (!clientId) throw new Error('Google no está configurado');
  if (typeof idToken !== 'string' || idToken.length > 4096) throw new Error('Token inválido');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token inválido');
  let header, payload;
  try { header = JSON.parse(fromB64u(parts[0]).toString('utf8')); payload = JSON.parse(fromB64u(parts[1]).toString('utf8')); } catch (e) { throw new Error('Token inválido'); }
  if (header.alg !== 'RS256') throw new Error('Algoritmo no permitido');
  const keys = await certProvider();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Clave desconocida');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, fromB64u(parts[2]));
  if (!ok) throw new Error('Firma inválida');
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') throw new Error('Emisor inválido');
  if (payload.aud !== clientId) throw new Error('Cliente inválido');
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('El token venció');
  if (!payload.sub) throw new Error('Token sin usuario');
  return { sub: String(payload.sub), email: payload.email || '', name: payload.name || '' };
}

module.exports = { makeSigner, verifyGoogle, setCertProvider };
