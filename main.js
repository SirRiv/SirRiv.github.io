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
  initLanguageSwitch();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    initStarsBackground();
  }
});

// ============================================================
// 7. SWITCH DE IDIOMA (ES/EN)
// ============================================================

const translations = {
  en: {
    ".skip-link": "Skip to main content",
    ".nav-menu li:nth-child(1) a": "About Me",
    ".nav-menu li:nth-child(2) a": "Experience",
    ".nav-menu li:nth-child(3) a": "Projects",
    ".nav-menu li:nth-child(4) a": "Skills",
    ".nav-menu li:nth-child(5) a": "Contact",
    ".hero-badge": "DevOps, Infrastructure & Backend Architecture",
    ".hero-title": "Designing <span class=\"gradient-text\">Resilient Architectures</span>, Optimal Automation and <span class=\"gradient-text\">High Availability</span> Systems.",
    ".hero-subtitle": "Hi, I'm <strong>SrRiv</strong>. Software Engineer focused on building robust infrastructure, cloud automation, and relational database optimization. Specialized in Linux environments, containers, and efficient deployments.",
    ".hero-actions a.btn-primary": "View Projects",
    ".hero-actions a.btn-secondary": "Let's Chat",
    "#about-heading": "About Me",
    ".about-info .section-lead": "Engineering and automation driven by performance and security.",
    ".about-info p:nth-of-type(2)": "I am a <strong>Software Engineering</strong> student at the <strong>Universidad Autónoma de Zacatecas (UAZ)</strong>. My development approach is highly self-taught, driven by a constant curiosity to learn new technologies and engineering methodologies.",
    ".about-info p:nth-of-type(3)": "I have a special interest in basic cybersecurity, network administration, and optimizing software lifecycle workflows through clean and secure code. <strong>I firmly believe</strong> that a system's robustness lies in the simplicity of its architecture, good practices, and secure deployments.",
    ".stat-card:nth-child(1) .stat-label": "Software Engineering",
    ".stat-card:nth-child(2) .stat-label": "Self-Taught",
    "#experience-heading": "Professional Trajectory",
    "#exp-title-1 + p": "Tribunal de Justicia Administrativa del Estado de Zacatecas",
    "#exp-title-1 ~ ul": "<li>Backend development using Django's MVT pattern.</li><li>Implementation of unit tests, acceptance tests with Behave/Selenium, and code coverage analysis.</li><li>Docker containers to guarantee deployment consistency.</li>",
    "#exp-title-2": "Deployment & Systems Engineer",
    "#exp-title-2 + p": "Infuzac",
    "#exp-title-2 ~ ul": "<li>Email host configuration and user management.</li><li>Design and development of the official Infuzac website (infuzac.com).</li>",
    "#exp-title-3": "Software & Backend Architect",
    "#exp-title-3 + p": "Protección Civil del Estado de Zacatecas",
    "#exp-title-3 ~ ul": "<li>Architectural design of an emergency-oriented Geographic Information System (GIS) using Docker on Linux servers.</li><li>Relational database modeling and backend service optimization to ensure system resilience under the MVT pattern.</li>",
    "#exp-title-4": "Independent Developer (Mobile & Cloud)",
    "#exp-title-4 ~ ul": "<li>Design and development of high-performance mobile applications using Flutter, Firebase, and Google Cloud services with clean architectures.</li>",
    ".timeline article:nth-child(5) h3": "Systems Developer",
    ".timeline article:nth-child(5) p": "Local Water Treatment Plant",
    ".timeline article:nth-child(5) ul": "<li>Development of web-based inventory management systems, relational database optimization, and report generation with SQL and React.</li>",
    "#projects-heading": "Featured Projects",
    "#proj-title-1": "Geographic Information System",
    "#proj-title-1 + p": "Design and deployment of the GIS for Civil Protection of the State of Zacatecas, orchestrated with Docker on Linux infrastructures and with a backend optimized under the MVT pattern.",
    "#proj-title-1 ~ div .project-link-disabled": "Government Project",
    "#proj-title-2": "Inventory Management System",
    "#proj-title-2 + p": "Administrative platform developed under Django's MVT pattern, designed for efficient asset control. Implemented using a containerized architecture with Docker and Docker Compose to ensure consistent environments. The project includes a rigorous automated testing suite (unit and acceptance with Behave/Selenium) to ensure software integrity and quality.",
    "#proj-title-2 ~ div .project-link": "View on GitHub",
    "#proj-title-3": "Mobile Development (Play Store)",
    "#proj-title-3 + p": "Creation and publication of independent mobile applications, implementing Flutter, Firebase, and GCP to guarantee high availability and clean architectures.",
    "#proj-title-3 ~ div .project-link": "View on GitHub",
    "#skills-heading": "Technical Arsenal",
    ".skills-category:nth-child(1) h3": "Infrastructure & Cloud",
    ".skills-category:nth-child(1) li:nth-child(1) .skill-name": "Linux (System Administration)",
    ".skills-category:nth-child(1) li:nth-child(2) .skill-name": "Docker (Containers)",
    ".skills-category:nth-child(1) li:nth-child(4) .skill-name": "Networking (TCP/IP)",
    ".skills-category:nth-child(2) h3": "Automation & Backend",
    ".skills-category:nth-child(3) h3": "Databases & Tools",
    ".skills-category:nth-child(3) li:nth-child(3) .skill-name": "Git (Version Control)",
    ".skills-category:nth-child(4) h3": "Cybersecurity",
    ".skills-category:nth-child(4) li:nth-child(1) .skill-name": "Log Management",
    ".skills-category:nth-child(4) li:nth-child(2) .skill-name": "Basic Network Security",
    ".skills-category:nth-child(4) li:nth-child(3) .skill-name": "Automated Backups",
    "#contact-heading": "Let's Start a Project",
    ".contact-subtitle": "Have a project in mind or want to talk about infrastructure, DevOps, or software development? Connect with me.",
    ".contact-buttons-container a:nth-child(1)": `<svg class="icon btn-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>\n            Fill Contact Form`,
    ".contact-buttons-container a:nth-child(2)": `<svg class="icon btn-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>\n            Send Email`,
    ".contact-buttons-container a:nth-child(3)": `<svg class="icon btn-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>\n            Explore my GitHub`,
    ".copyright": "&copy; <span id=\"current-year\"></span> SrRiv. All rights reserved. Designed with universal accessibility principles in mind."
  },
  es: {} // Se llena en runtime
};

function translatePage(lang) {
  const dict = translations[lang];
  if (!dict) return;
  for (const [selector, text] of Object.entries(dict)) {
    const el = document.querySelector(selector);
    if (el) {
      el.innerHTML = text;
    }
  }
  document.documentElement.lang = lang;
  initCurrentYear(); // Restaurar el año actual en el nuevo footer
}

/**
 * Inicializa el switch de idioma, auto-captura los textos originales (ES)
 * y restaura la preferencia desde localStorage.
 */
function initLanguageSwitch() {
  const langSwitch = document.getElementById('lang-switch');
  const langTrack = document.getElementById('lang-track');
  const labelEs = document.getElementById('label-es');
  const labelEn = document.getElementById('label-en');

  if (!langSwitch || !langTrack) return;

  // 1. Llenar diccionario de español con el HTML original
  for (const selector of Object.keys(translations.en)) {
    const el = document.querySelector(selector);
    if (el) {
      translations.es[selector] = el.innerHTML;
    }
  }

  // 2. Aplicar estado visual en base a idioma 'en' o 'es'
  const applyLanguage = (isEnglish) => {
    langTrack.classList.toggle('en-active', isEnglish);
    labelEs.classList.toggle('active', !isEnglish);
    labelEn.classList.toggle('active', isEnglish);
    translatePage(isEnglish ? 'en' : 'es');
  };

  // 3. Restaurar preferencia guardada
  const savedLang = localStorage.getItem('language');
  if (savedLang === 'en') {
    applyLanguage(true);
  }

  // 4. Manejar click
  langSwitch.addEventListener('click', () => {
    const isCurrentlyEnglish = langTrack.classList.contains('en-active');
    const newStateEnglish = !isCurrentlyEnglish;

    applyLanguage(newStateEnglish);
    localStorage.setItem('language', newStateEnglish ? 'en' : 'es');
  });
}
