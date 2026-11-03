# ChePlay 🎮

Minijuegos multijugador en tiempo real: **40 juegos en 7 packs**, un solo intento, podio en cada ronda.
Node.js + Express + Socket.IO (servidor autoritativo) y cliente web sin frameworks.

## Cómo correrlo
- **Windows:** doble clic en `boot.bat`.
- **Mac:** `chmod +x boot.command` (una vez) y doble clic en `boot.command`; o desde Terminal: `npm install && node server/index.js`.
- **Linux / servidor:** `npm install && node server/index.js` (puerto con `PORT=4000`).

Se abre en `http://localhost:3000`. Para jugar en LAN, compartí el link "En LAN" que muestra la consola.
Requiere Node.js 18 o más nuevo.

## Qué trae
- Lobbies públicos/privados con código, host que configura (cantidad de juegos, packs, dificultad, tiempos, tema).
- Ruleta de juegos antes de cada ronda, podio con premios y revancha por votación.
- Reacciones y frases rápidas, chat y puntajes en vivo.
- Anti-spam en juegos de elegir (bloqueo creciente tras errores).
- Ajustes de accesibilidad (⚙️): volumen, reducir movimiento, sin destellos, alto contraste, modo daltónico, tamaño de texto, vibración, modo zurdo.

## Cuentas y estadísticas
- Iniciar sesión con Google guarda **nickname y avatar** (se usan solos en los lobbies) y tus **récords por juego y dificultad** (menú 👤 → Estadísticas). Solo cuentan las partidas con lobby; la práctica no.
- Sin configurar nada se juega como invitado. Variables: `GOOGLE_CLIENT_ID`, `DATABASE_URL` (Postgres; si falta usa `data/db.json`), `SESSION_SECRET`, `DEV_LOGIN=1` (login de prueba, solo fuera de producción), `PORT`.
- Guía paso a paso para publicarlo gratis: **DEPLOY.md**.

## Estructura
```
server/index.js        servidor · db.js (archivo/Postgres) · auth.js (sesión y Google) (lobbies, rondas, puntajes, reacciones, premios)
shared/catalog.js      catálogo de 40 juegos y 7 packs (cliente y servidor)
public/index.html      pantallas
public/css/style.css   base y juegos · css/cheplay.css marca, animaciones, accesibilidad
public/js/engine.js    motor de minijuegos (sonido, anti-spam, canvas)
public/js/games/       set1..set5: los 40 minijuegos
public/js/{main,social,roulette,settings}.js
public/img/            logo, íconos, miniaturas de los juegos
```

## Publicarlo en internet
Necesita un servidor Node con WebSockets y **una sola instancia** (los lobbies viven en memoria). Ver notas de despliegue aparte.
Antes de publicar, cambiá en `public/index.html` las URL de `og:image` por la absoluta de tu dominio.
Botón de apoyo: https://cafecito.app/che-play
