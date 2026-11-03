/* Catálogo de minijuegos: compartido entre servidor (validación) y cliente (UI).
   duration = ms de juego · maxScore = tope que acepta el servidor (anti-trampas) · pack = categoría */
(function (root) {
  const PACKS = [
    { id: 'reflejos',  name: 'Pack Reflejos',     emoji: '⚡', color: '#ffd43b', desc: 'Velocidad de reacción y de dedos' },
    { id: 'mates',     name: 'Pack Matemáticas',  emoji: '➗', color: '#4dabf7', desc: 'Cuentas, series y números' },
    { id: 'habilidad', name: 'Pack Habilidad',    emoji: '🎯', color: '#63e6be', desc: 'Pulso, puntería y precisión' },
    { id: 'vision',    name: 'Pack Visión',       emoji: '👀', color: '#9775fa', desc: 'Ojo de águila' },
    { id: 'mente',     name: 'Pack Mente',        emoji: '🧠', color: '#f06595', desc: 'Atención, lógica y cabeza fría' },
    { id: 'accion',    name: 'Pack Acción',       emoji: '🕹️', color: '#ff922b', desc: 'Arcade en movimiento' },
    { id: 'ritmo',     name: 'Pack Ritmo y Teclado', emoji: '🎵', color: '#da77f2', desc: 'Oído, teclas y escritura' }
  ];

  const CATALOG = [
    /* ───────── ⚡ Reflejos ───────── */
    { pack: 'reflejos', id: 'clicker',   name: 'Clicker Frenzy',     emoji: '👆', color: '#ff4d6d', duration: 6000,  maxScore: 160,  hint: 'Click / tap / Espacio', desc: 'Tocá lo más rápido que puedas. Cada toque suma un punto.' },
    { pack: 'reflejos', id: 'alterna',   name: 'Alterna Dedos',      emoji: '🤹', color: '#ff8787', duration: 8000,  maxScore: 160,  hint: '← → alternando / botones', desc: 'Tocá izquierda y derecha ALTERNANDO. Si repetís el mismo lado, trastabillás y perdés tiempo.' },
    { pack: 'reflejos', id: 'reflex',    name: 'Reflejo Flash',      emoji: '⚡', color: '#ffd43b', duration: 22000, maxScore: 3000, hint: 'Click / tap / Espacio', desc: '3 intentos: tocá apenas la pantalla se ponga verde. Si te adelantás, perdés ese intento.' },
    { pack: 'reflejos', id: 'gonogo',    name: 'Semáforo',           emoji: '🚦', color: '#51cf66', duration: 12000, maxScore: 700,  hint: 'Click / tap / Espacio', desc: 'Luz VERDE: tocá rápido. Luz ROJA: ¡no toques! Cada error te frena.' },
    { pack: 'reflejos', id: 'moles',     name: 'Machaca Topos',      emoji: '🔨', color: '#c08457', duration: 10000, maxScore: 600,  hint: 'Click / tap', desc: 'Pegale a los topos que asoman. ¡No toques las bombas ni los huecos vacíos!' },
    { pack: 'reflejos', id: 'bubbles',   name: 'Burbujas Flash',     emoji: '🫧', color: '#66d9e8', duration: 12000, maxScore: 800,  hint: 'Click / tap', desc: 'Revientan solas: tocá cada burbuja antes de que se achique. Las chiquitas valen más.' },

    /* ───────── ➗ Matemáticas ───────── */
    { pack: 'mates', id: 'math',     name: 'Math Rush',          emoji: '➗', color: '#4dabf7', duration: 12000, maxScore: 900, hint: 'Click / teclas 1-4', desc: 'Resolvé cuentas relámpago. Las rachas dan puntos extra. ¡Si fallás, te frenás!' },
    { pack: 'mates', id: 'compare',  name: 'Mayor o Menor',      emoji: '⚖️', color: '#66d9e8', duration: 10000, maxScore: 600, hint: '← → / click', desc: 'Compará dos cuentas y elegí la que te piden: mayor o menor.' },
    { pack: 'mates', id: 'sequence', name: 'Secuencias',         emoji: '🔗', color: '#74c0fc', duration: 12000, maxScore: 700, hint: 'Click / teclas 1-4', desc: 'Descubrí la regla y elegí el número que sigue en la serie.' },
    { pack: 'mates', id: 'operator', name: 'Falta el Signo',     emoji: '➕', color: '#5c7cfa', duration: 12000, maxScore: 700, hint: 'Click / teclas 1-4', desc: 'La cuenta está hecha pero falta el signo. ¿Es +, −, × o ÷?' },
    { pack: 'mates', id: 'dice',     name: 'Suma de Dados',      emoji: '🎲', color: '#4c6ef5', duration: 12000, maxScore: 700, hint: 'Click / teclas 1-4', desc: 'Aparecen dados: sumá los puntos sin contar uno por uno… ¡rápido!' },
    { pack: 'mates', id: 'target',   name: 'Suma Objetivo',      emoji: '🧮', color: '#339af0', duration: 15000, maxScore: 700, hint: 'Click / tap', desc: 'Tocá los números que, sumados, den el objetivo exacto.' },

    /* ───────── 🎯 Habilidad ───────── */
    { pack: 'habilidad', id: 'balance',   name: 'Equilibrio',        emoji: '🎯', color: '#63e6be', duration: 10000, maxScore: 1100, hint: 'Mantené apretado / Espacio', desc: 'Mantené la bola dentro de la franja verde que se mueve.' },
    { pack: 'habilidad', id: 'tower',     name: 'Torre Perfecta',    emoji: '🏗️', color: '#ff8787', duration: 20000, maxScore: 700,  hint: 'Click / tap / Espacio', desc: 'Soltá los bloques justo encima del anterior. Lo que sobra se corta.' },
    { pack: 'habilidad', id: 'stopwatch', name: 'Cronómetro Ciego',  emoji: '⏱️', color: '#38d9a9', duration: 12000, maxScore: 1000, hint: 'Click / tap / Espacio', desc: 'El reloj se esconde. Frená justo en el tiempo pedido.' },
    { pack: 'habilidad', id: 'aim',       name: 'Tiro al Blanco',    emoji: '🏹', color: '#20c997', duration: 12000, maxScore: 800,  hint: 'Click / tap', desc: 'Disparale a los blancos móviles. Cuanto más al centro, más puntos. Si errás, perdés un poquito.' },
    { pack: 'habilidad', id: 'powerbar',  name: 'Medidor de Fuerza', emoji: '💪', color: '#12b886', duration: 14000, maxScore: 1000, hint: 'Click / tap / Espacio', desc: 'Frená la barra dentro de la zona dorada. Cada ronda la zona es más chica.' },
    { pack: 'habilidad', id: 'stick',     name: 'Puente Perfecto',   emoji: '🌉', color: '#0ca678', duration: 22000, maxScore: 700,  hint: 'Mantené apretado / Espacio', desc: 'Mantené para estirar el puente y soltá justo cuando llegue a la otra plataforma.' },

    /* ───────── 👀 Visión ───────── */
    { pack: 'vision', id: 'odd',       name: 'Encontrá el Intruso', emoji: '🕵️', color: '#9775fa', duration: 10000, maxScore: 700, hint: 'Click / tap', desc: 'Una casilla tiene un tono distinto. Cada acierto agranda la grilla.' },
    { pack: 'vision', id: 'count',     name: 'Cuenta Rápida',       emoji: '🍎', color: '#ff6b6b', duration: 12000, maxScore: 600, hint: 'Click / teclas 1-4', desc: 'Aparecen unos segundos. Contá cuántos había y elegí el número.' },
    { pack: 'vision', id: 'balloons',  name: 'Globos Color',        emoji: '🎈', color: '#ff8cc6', duration: 10000, maxScore: 600, hint: 'Click / tap', desc: 'Reventá solo los globos del color pedido. El color cambia seguido.' },
    { pack: 'vision', id: 'findemoji', name: 'Busca el Emoji',      emoji: '🔍', color: '#b197fc', duration: 12000, maxScore: 700, hint: 'Click / tap', desc: 'Hay un montón de emojis parecidos. Encontrá el que está solo (o el que te piden).' },
    { pack: 'vision', id: 'majority',  name: 'Más Puntos',          emoji: '🔵', color: '#845ef7', duration: 12000, maxScore: 600, hint: '← → / click', desc: 'Una nube de puntos de dos colores aparece un instante: ¿de cuál color hay MÁS?' },
    { pack: 'vision', id: 'clock',     name: 'Lee el Reloj',        emoji: '🕒', color: '#7950f2', duration: 12000, maxScore: 600, hint: 'Click / teclas 1-4', desc: 'Mirá las agujas y elegí la hora correcta.' },

    /* ───────── 🧠 Mente ───────── */
    { pack: 'mente', id: 'stroop',    name: 'Color Correcto',   emoji: '🎨', color: '#f06595', duration: 10000, maxScore: 500, hint: 'Click / teclas 1-4', desc: 'Tocá el color que te pide la consigna. ¡La tinta te engaña!' },
    { pack: 'mente', id: 'arrows',    name: 'Flechas Locas',    emoji: '↔️', color: '#e599f7', duration: 10000, maxScore: 600, hint: '← → / botones', desc: 'Verde: seguí la flecha. Rojo: ¡andá para el lado contrario! Si errás, te frenás.' },
    { pack: 'mente', id: 'rps',       name: 'Gana al Robot',    emoji: '🤖', color: '#adb5bd', duration: 10000, maxScore: 500, hint: 'Click / teclas 1-3', desc: 'Piedra, papel o tijera contra un robot: elegí la jugada correcta.' },
    { pack: 'mente', id: 'order',     name: 'Ordená los Números', emoji: '🔢', color: '#74c0fc', duration: 20000, maxScore: 1600, hint: 'Click / tap', desc: 'Tocá los números en orden ascendente, lo más rápido posible.' },
    { pack: 'mente', id: 'truefalse', name: 'Verdadero o Falso', emoji: '✅', color: '#fa5252', duration: 12000, maxScore: 700, hint: '← V · → F / botones', desc: '¿La cuenta está bien o está mal? Decidilo en un segundo.' },
    { pack: 'mente', id: 'category',  name: 'Palabra Intrusa',   emoji: '🧩', color: '#e64980', duration: 12000, maxScore: 600, hint: 'Click / teclas 1-4', desc: 'Tres cosas son del mismo grupo y una no. ¡Encontrá la intrusa!' },

    /* ───────── 🕹️ Acción ───────── */
    { pack: 'accion', id: 'ninja',   name: 'Ninja Frutas',       emoji: '🍉', color: '#51cf66', duration: 12000, maxScore: 800,  hint: 'Mantené y arrastrá', desc: 'Cortá frutas arrastrando. Los combos suman. ¡Cuidado con las bombas!' },
    { pack: 'accion', id: 'meteors', name: 'Lluvia de Meteoros', emoji: '☄️', color: '#ff6b35', duration: 12000, maxScore: 800,  hint: 'Mouse / dedo', desc: 'Volá libremente, esquivá meteoros y juntá estrellas.' },
    { pack: 'accion', id: 'coins',   name: 'Lluvia de Tesoros',  emoji: '🪙', color: '#fcc419', duration: 14000, maxScore: 1200, hint: 'Mouse / dedo / ← →', desc: 'Juntá tesoros en cadena para subir el multiplicador. Imán y doble puntaje aparecen de a ratos. ¡No toques las bombas!' },
    { pack: 'accion', id: 'snake',   name: 'Serpiente',          emoji: '🐍', color: '#40c057', duration: 20000, maxScore: 800,  hint: '← ↑ ↓ → / deslizar', desc: 'Comé manzanas sin chocarte con las paredes ni con vos misma. Cada manzana te hace más larga.' },
    { pack: 'accion', id: 'shooter', name: 'Defensa Espacial',   emoji: '👾', color: '#ff6b6b', duration: 20000, maxScore: 2500, hint: 'Mouse / dedo / ← →', desc: 'Tu nave dispara sola. Movete y destruí las naves enemigas antes de que lleguen abajo.' },

    /* ───────── 🎵 Ritmo y Teclado ───────── */
    { pack: 'ritmo', id: 'rhythm',    name: 'Ritmo',           emoji: '🎵', color: '#da77f2', duration: 15000, maxScore: 1200, hint: 'D F J K (+ Espacio en difícil) / tocar', desc: 'Tocá cada nota cuando llegue a la línea. Cuanto más justo, más puntos. En DIFÍCIL aparece un carril extra en el medio.' },
    { pack: 'ritmo', id: 'typing',    name: 'Teclea Rápido',   emoji: '⌨️', color: '#20c997', duration: 12000, maxScore: 500,  hint: 'Teclado', desc: 'Escribí las palabras tan rápido como puedas. Sin errores.' },
    { pack: 'ritmo', id: 'pulse',     name: 'Sigue el Pulso',  emoji: '💓', color: '#cc5de8', duration: 15000, maxScore: 1000, hint: 'Click / tap / Espacio', desc: 'Primero el pulso suena y se ve. Después se esconde: seguí tocando al mismo ritmo.' },
    { pack: 'ritmo', id: 'keyletter', name: 'Tecla Rápida',    emoji: '🔤', color: '#be4bdb', duration: 12000, maxScore: 700,  hint: 'Teclado / botones', desc: 'Aparece una letra: apretá esa tecla (o tocá el botón en el celular). Error = penalización.' },
    { pack: 'ritmo', id: 'anagram',   name: 'Anagrama',        emoji: '🔀', color: '#ae3ec9', duration: 15000, maxScore: 600,  hint: 'Teclado', desc: 'Las letras están mezcladas. Escribí la palabra correcta.' }
  ];
  const AVATARS = ['😀', '😎', '🤩', '🥳', '😈', '👻', '🤖', '👽', '🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🦄', '🐙', '🦖', '🐲', '🍕', '🚀', '⚡', '🔥'];
  if (typeof module === 'object' && module.exports) { module.exports = CATALOG; module.exports.PACKS = PACKS; module.exports.AVATARS = AVATARS; }
  else { root.CATALOG = CATALOG; root.PACKS = PACKS; root.AVATARS = AVATARS; }
})(typeof window !== 'undefined' ? window : globalThis);
