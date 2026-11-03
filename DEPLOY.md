# Publicar ChePlay gratis (prueba con cuentas de Google)

Stack gratuito: **Render** (el servidor Node) + **Neon** (base de datos Postgres) + **Google Cloud** (el botón "Iniciar sesión con Google").
Los datos de esta etapa son de prueba y se pueden borrar al lanzar la versión final.

## 1) Subir el proyecto a GitHub
1. Creá un repo (puede ser privado) y subí esta carpeta **sin** `node_modules` ni `data` (ya están en `.gitignore`).

## 2) Base de datos en Neon
1. Entrá a https://neon.tech → crear cuenta (sin tarjeta) → *New project*.
2. Copiá la **connection string** (`postgresql://usuario:clave@...neon.tech/neondb?sslmode=require`). Es tu `DATABASE_URL`.
3. No hace falta crear tablas: el servidor las crea solo al arrancar.

## 3) Google: Client ID
1. https://console.cloud.google.com → proyecto nuevo → *APIs y servicios* → **Pantalla de consentimiento de OAuth** (tipo Externo, nombre ChePlay, tu mail). Dejala en modo "Prueba" y agregá tu mail (y el de tus testers) como usuarios de prueba, o publicá la app.
2. *Credenciales* → *Crear credenciales* → **ID de cliente de OAuth** → tipo **Aplicación web**.
3. En **Orígenes autorizados de JavaScript** agregá:
   - `https://TU-APP.onrender.com` (la URL que te dé Render en el paso 4)
   - `http://localhost:3000` (para probar en tu compu)
4. Copiá el **Client ID** (termina en `.apps.googleusercontent.com`). No necesitás el "secret".

## 4) Render
1. https://render.com → *New* → **Web Service** → conectá el repo (o *Blueprint*: usa `render.yaml`).
2. Plan **Free**, build `npm install`, start `node server/index.js`.
3. Variables de entorno:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = la de Neon
   - `GOOGLE_CLIENT_ID` = el de Google
   - `SESSION_SECRET` = texto largo al azar (Render puede generarlo)
4. Deploy. Con la URL final, volvé a Google y agregala en *Orígenes autorizados* si no lo hiciste.
5. Al arrancar, los logs dicen: `Cuentas: Google activado · datos en Postgres`.

## Cosas a saber (plan gratis)
- Render duerme el servicio tras ~15 min sin visitas; el primer ingreso tarda ~1 minuto. Los lobbies en curso se pierden si se reinicia (viven en memoria), las cuentas y estadísticas **no** (están en Neon).
- Neon también "duerme" la base tras 5 min; el servidor reintenta solo la primera consulta.
- El login de Google **solo funciona en https o en localhost**, no en `http://192.168.x.x` (LAN). Para LAN existe el login de prueba: `DEV_LOGIN=1 node server/index.js` (nunca en producción: se desactiva con `NODE_ENV=production`).
- Una sola instancia: no escales a varias.
- Para correrlo local con Postgres: `DATABASE_URL=... GOOGLE_CLIENT_ID=... node server/index.js`. Sin `DATABASE_URL`, guarda en `data/db.json`.
