/**
 * main.js — SrRiv Portfolio
 * Script principal de interactividad del portafolio.
 * Organizado en funciones puras y modulares (sin frameworks externos).
 */

'use strict';

// ============================================================
// 1. AÑO ACTUAL EN FOOTER
// ============================================================

/**
 * Actualiza el elemento #current-year con el año actual
 * para que el copyright siempre esté vigente.
 */
function initCurrentYear() {
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

// ============================================================
// 2. MENÚ HAMBURGUESA (MOBILE NAV)
// ============================================================

/**
 * Inicializa el menú de navegación móvil:
 * - Abre/cierra el menú al pulsar el botón.
 * - Cierra automáticamente al hacer click en un enlace.
 * - Actualiza aria-expanded para accesibilidad.
 */
function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!menuToggle || !navMenu) return;

  menuToggle.addEventListener('click', () => {
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isExpanded));
    navMenu.classList.toggle('active');
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('active');
    });
  });
}

// ============================================================
// 3. MODO ALTO CONTRASTE (ACCESIBILIDAD WCAG 2.1)
// ============================================================

/**
 * Inicializa el toggle de alto contraste:
 * - Persiste la preferencia en localStorage.
 * - Restaura la preferencia guardada al cargar la página.
 * - Actualiza aria-label dinámicamente para lectores de pantalla.
 */
function initHighContrast() {
  const contrastToggle = document.getElementById('contrast-toggle');
  if (!contrastToggle) return;

  const STORAGE_KEY = 'high-contrast';
  const LABEL_ON = 'Desactivar alto contraste';
  const LABEL_OFF = 'Alternar alto contraste';

  const applyContrast = (active) => {
    document.body.classList.toggle('high-contrast', active);
    contrastToggle.setAttribute('aria-label', active ? LABEL_ON : LABEL_OFF);
  };

  // Restaurar preferencia guardada
  const saved = localStorage.getItem(STORAGE_KEY) === 'true';
  if (saved) applyContrast(true);

  contrastToggle.addEventListener('click', () => {
    const isActive = document.body.classList.contains('high-contrast');
    applyContrast(!isActive);
    localStorage.setItem(STORAGE_KEY, String(!isActive));
  });
}

// ============================================================
// 4. ANIMACIÓN DE CONSTELACIONES (CANVAS INTERACTIVO)
// ============================================================

/**
 * Inicializa el fondo animado de estrellas y constelaciones
 * sobre un canvas con soporte para DPR (pantallas de alta densidad).
 *
 * Comportamiento:
 * - Las estrellas flotan autónomamente con wrapping de pantalla.
 * - El cursor actúa como nodo extra que conecta estrellas cercanas.
 * - Las estrellas se conectan entre sí si están suficientemente cerca.
 * - El alto contraste cambia los colores al modo accesible.
 */
function initStarsBackground() {
  const starsBg = document.querySelector('.stars-background');
  if (!starsBg) return;

  const canvas = document.createElement('canvas');
  starsBg.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const NUM_STARS = 200;
  const MOUSE_CONNECT_DIST = 120;
  const STAR_CONNECT_DIST = 100;

  let width;
  let stars = [];
  const mouse = { x: null, y: null, active: false };

  /**
   * Genera un color base aleatorio para cada estrella.
   * ~62% blancas, ~22% cian, ~16% púrpura.
   * @returns {string} Prefijo de color rgba listo para concatenar alpha.
   */
  function getRandomStarColor() {
    const rand = Math.random();
    if (rand < 0.22) return 'rgba(6, 182, 212, ';   // cian
    if (rand < 0.38) return 'rgba(168, 85, 247, ';  // púrpura
    return 'rgba(255, 255, 255, ';                   // blanco
  }

  /**
   * Crea una estrella con posición, velocidad y color aleatorios.
   * @returns {object} Objeto estrella.
   */
  function createStar() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.7 + 0.5,
      vx: Math.random() * 0.8 - 0.4,
      vy: Math.random() * 0.8 - 0.4,
      baseAlpha: Math.random() * 0.55 + 0.35,
      colorPrefix: getRandomStarColor(),
    };
  }

  /**
   * Ajusta el canvas al tamaño de la ventana con soporte DPR.
   * Usa setTransform para evitar acumulación de escala en cada resize.
   * Solo inicializa las estrellas en la primera llamada.
   */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    // Reset total de la matriz antes de escalar para evitar drift acumulado
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (stars.length === 0) {
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push(createStar());
      }
    }
  }

  /**
   * Versión con debounce del handler de resize para evitar
   * thrashing de layout en redimensionados rápidos.
   */
  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      stars.forEach((star) => {
        if (star.x > window.innerWidth) star.x = Math.random() * window.innerWidth;
        if (star.y > window.innerHeight) star.y = Math.random() * window.innerHeight;
      });
    }, 150);
  }

  /**
   * Dibuja una línea de conexión entre dos puntos con alpha calculado.
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} dist - Distancia actual entre los dos puntos.
   * @param {number} maxDist - Distancia máxima para la conexión.
   * @param {number} maxAlpha - Alpha máximo de la línea.
   * @param {string} color - Color base rgba en alto contraste.
   * @param {boolean} isHighContrast
   * @param {string} hcColor - Color en modo alto contraste.
   */
  function drawConnection(x1, y1, x2, y2, dist, maxDist, maxAlpha, color, isHighContrast, hcColor) {
    const alpha = (1 - dist / maxDist) * maxAlpha;
    ctx.lineWidth = isHighContrast ? 1 : 0.5;
    ctx.strokeStyle = isHighContrast ? hcColor : `${color}${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * Loop principal de animación. Actualiza posiciones y dibuja cada frame.
   */
  function animate() {
    const isHighContrast = document.body.classList.contains('high-contrast');

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Actualizar y dibujar estrellas
    stars.forEach((star) => {
      star.x += star.vx;
      star.y += star.vy;

      // Wrapping de pantalla para densidad uniforme
      if (star.x < 0) star.x = window.innerWidth;
      if (star.x > window.innerWidth) star.x = 0;
      if (star.y < 0) star.y = window.innerHeight;
      if (star.y > window.innerHeight) star.y = 0;

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = isHighContrast
        ? '#ffffff'
        : `${star.colorPrefix}${star.baseAlpha})`;
      ctx.fill();
    });

    // Dibujar conexiones estrella → cursor y estrella → estrella
    for (let i = 0; i < stars.length; i++) {
      const s1 = stars[i];

      // Conexión al cursor (el cursor actúa como nodo extra)
      if (mouse.active) {
        const dx = mouse.x - s1.x;
        const dy = mouse.y - s1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_CONNECT_DIST) {
          drawConnection(
            s1.x, s1.y, mouse.x, mouse.y,
            dist, MOUSE_CONNECT_DIST, 0.35,
            'rgba(0, 191, 255, ', isHighContrast, '#00ffff'
          );
        }
      }

      // Conexiones entre estrellas — O(N²/2) indexado
      for (let j = i + 1; j < stars.length; j++) {
        const s2 = stars[j];
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < STAR_CONNECT_DIST) {
          drawConnection(
            s1.x, s1.y, s2.x, s2.y,
            dist, STAR_CONNECT_DIST, 0.25,
            'rgba(0, 191, 255, ', isHighContrast, '#ffff00'
          );
        }
      }
    }

    requestAnimationFrame(animate);
  }

  // Eventos de ventana y cursor
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  // Inicialización
  resize();
  animate();
}

// ============================================================
// 5. BARRAS DE HABILIDADES (DATA-DRIVEN WIDTH)
// ============================================================

/**
 * Lee el atributo `data-level` de cada `.skill-progress` y aplica
 * el ancho correspondiente vía JS, eliminando la necesidad de
 * estilos inline en el HTML. Valida que el valor sea numérico y
 * esté dentro del rango permitido (0–100).
 */
function initSkillBars() {
  document.querySelectorAll('.skill-progress[data-level]').forEach((bar) => {
    const raw = bar.getAttribute('data-level');
    const level = parseFloat(raw);

    if (!Number.isFinite(level) || level < 0 || level > 100) {
      console.warn(`[initSkillBars] data-level inválido: "${raw}" en`, bar);
      return;
    }

    bar.style.width = `${level}%`;
  });
}

// ============================================================
// 6. PUNTO DE ENTRADA PRINCIPAL
// ============================================================

/**
 * Ejecuta todas las funcionalidades cuando el DOM está listo.
 * Respeta `prefers-reduced-motion`: si el usuario ha indicado preferencia
 * por menor movimiento, el canvas animado no se inicializa.
 */
document.addEventListener('DOMContentLoaded', () => {
  initCurrentYear();
  initMobileMenu();
  initHighContrast();
  initSkillBars();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    initStarsBackground();
  }
});
