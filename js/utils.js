/**
 * utils.js — Funciones de utilidad compartidas
 */

'use strict';


/* ──────────────────────────────────────────────────────────────
   ANIMACIÓN DE CONTADORES
   ────────────────────────────────────────────────────────────── */

export function animateCounter(el, target, duration = 1500, formatter = Math.floor) {
  if (!el) return;
  const start = performance.now();

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatter(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}


/* ──────────────────────────────────────────────────────────────
   INTERSECTION OBSERVER — HELPERS
   ────────────────────────────────────────────────────────────── */

export function onVisible(selector, onEnter, options = {}) {
  const defaults = {
    threshold:  0.15,
    rootMargin: '0px 0px -60px 0px',
  };
  const opts = { ...defaults, ...options };

  const elements =
    typeof selector === 'string'
      ? document.querySelectorAll(selector)
      : selector;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        if (typeof onEnter === 'function') onEnter(entry.target);
      }
    });
  }, opts);

  elements.forEach((el) => observer.observe(el));
  return observer;
}

export function onVisibleOnce(el, callback, options = {}) {
  const defaults = { threshold: 0.3 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { ...defaults, ...options });
  observer.observe(el);
  return observer;
}


/* ──────────────────────────────────────────────────────────────
   TOOLTIP
   ────────────────────────────────────────────────────────────── */

export function createTooltip() {
  let el = document.querySelector('.chart-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.className = 'chart-tooltip';
    document.body.appendChild(el);
  }

  const hide = () => { el.style.opacity = '0'; };
  window.addEventListener('scroll', hide, { passive: true });

  return {
    el,
    show(html, x, y) {
      el.innerHTML = html;
      el.style.opacity = '1';
      this.move(x, y);
    },
    hide,
    move(x, y) {
      // x/y son clientX/clientY (viewport); con position:fixed no se suma scroll
      const rect   = el.getBoundingClientRect();
      const margin = 12;
      let left = x + margin;
      let top  = y - rect.height / 2;
      if (left + rect.width  > window.innerWidth  - margin) left = x - rect.width - margin;
      if (top < margin) top = margin;
      if (top + rect.height  > window.innerHeight - margin) top  = window.innerHeight - rect.height - margin;
      el.style.left = `${left}px`;
      el.style.top  = `${top}px`;
    },
  };
}


/* ──────────────────────────────────────────────────────────────
   PROGRESS BAR DE LECTURA
   ────────────────────────────────────────────────────────────── */

export function initReadingProgress() {
  const bar = document.querySelector('.reading-progress__bar');
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress  = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${Math.min(progress, 100)}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}
