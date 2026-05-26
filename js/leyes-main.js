'use strict';

import { initReadingProgress, onVisible, onVisibleOnce, animateCounter, createTooltip } from './utils.js';

// ── Paleta ────────────────────────────────────────────────────
const C = {
  lp:     '#B54B68',
  cbba:   '#3C6BAA',
  sc:     '#20A47A',
  gold:   '#F1B62A',
  purple: '#7368C4',
  muted:  '#5A5A6A',
  light:  '#8A8A9A',
  border: '#D8D8E0',
  text:   '#30303D',
  card:   '#FFFFFF',
};

const CITY_COLOR = { 'La Paz': C.lp, 'Cochabamba': C.cbba, 'Santa Cruz': C.sc };

const TEMA_COLOR = {
  // Colores base de la paleta del artículo
  'suelo y vivienda':                                        '#F1B62A', // ámbar
  'administracion publica':                                  '#7368C4', // púrpura
  'Reconocimiento a ciudadanos u organizaciones destacadas': '#B54B68', // rosa
  'patrimonio, cultura y turismo':                           '#20A47A', // verde esmeralda
  'impuestos':                                               '#3C6BAA', // azul
  // Variaciones tonales — hue distinto o valor claramente diferente
  'transporte':                                              '#D4762A', // naranja
  'seguridad':                                               '#5E91C4', // azul claro
  'medio ambiente':                                          '#2D8A5E', // verde oscuro
  'salud':                                                   '#C45E7E', // rosa suave
  'gestión de riesgos':                                      '#7A3A78', // violeta oscuro
  'gestión de residuos':                                     '#8A7A3A', // ocre
  'comercio y mercados':                                     '#9A8FD8', // lavanda
  'niñez y juventud':                                        '#D86080', // coral
  'educación':                                               '#46B09A', // teal
  'parques y recreación':                                    '#6AB08A', // sage
};

const tip = createTooltip();

// ── Helpers ───────────────────────────────────────────────────
function fmtN(n) { return new Intl.NumberFormat('es').format(n); }

function parseMonth(dateStr) {
  if (!dateStr) return null;
  const p = dateStr.trim().split('/');
  if (p.length === 3) return `${p[2].trim()}-${p[1].trim().padStart(2, '0')}`;
  return null;
}

function computeSubtemas(csv, city, limit, mergeBlank = false) {
  const cityRows = csv.filter(r => r.ciudad === city);
  const total    = cityRows.length;
  const counts   = new Map();
  cityRows.forEach(r => {
    let key = (r.subtemas || '').trim();
    if (!key && mergeBlank) key = 'Reconocimiento a ciudadanos u org. destacadas';
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value, pct: value / total * 100 }));
}

function initCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target   = parseFloat(el.dataset.counter);
    const duration = parseInt(el.dataset.counterDuration || '1500', 10);
    const decimals = parseInt(el.dataset.counterDecimals || '0', 10);
    const suffix   = el.dataset.counterSuffix || '';
    const fmt = v => (decimals > 0 ? v.toFixed(decimals) : Math.floor(v).toLocaleString('es')) + suffix;
    onVisibleOnce(el, () => animateCounter(el, target, duration, fmt), { threshold: 0.5 });
  });
}


// ─────────────────────────────────────────────────────────────
// HERO — Contador + sellos
// Construye ~25 "documentos" SVG en posiciones predefinidas (no
// aleatorias — se diseñaron para evitar el área del contador) y
// les estampa un sello en cascada mientras un contador sube de 0
// a 1.527. La idea editorial es transmitir el acto de legislar:
// cada papel queda sellado, oficializado, registrado.
// ─────────────────────────────────────────────────────────────
function initHeroStamp() {
  const root = document.querySelector('.hero-stamp');
  if (!root) return;

  const docsGroup = root.querySelector('.stamp-docs');
  const counterEl = root.querySelector('.stamp-counter');
  if (!docsGroup || !counterEl) return;

  // [x, y, rot]  — coordenadas en el viewBox 760×240
  const positions = [
    // banda superior
    [25, 6, -7],   [88, 24, 4],   [148, 4, -3],  [212, 26, 6],
    [490, 26, -5], [556, 4, 3],   [625, 22, -4], [702, 8, 5],
    // costado izquierdo
    [8, 76, -3],   [80, 92, 5],   [10, 138, 4],  [86, 152, -4], [170, 168, 6],
    // costado derecho
    [555, 70, 4],  [628, 92, -3], [704, 74, 6],
    [560, 146, -5],[638, 166, 3], [710, 140, -4],
    // banda inferior
    [28, 192, 5],  [108, 202, -3],[196, 184, 4],
    [500, 196, 4], [592, 206, -5],[668, 188, 5],
  ];

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const baseDelay  = 0.18;
  const docStep    = 0.07;
  const sealOffset = 0.18;

  positions.forEach((pos, i) => {
    const [x, y, rot] = pos;
    const docDelay  = baseDelay + i * docStep;
    const sealDelay = docDelay + sealOffset;

    const outer = document.createElementNS(SVG_NS, 'g');
    outer.setAttribute('transform', `translate(${x},${y}) rotate(${rot})`);

    const doc = document.createElementNS(SVG_NS, 'g');
    doc.setAttribute('class', 'stamp-doc');
    doc.style.animationDelay = `${docDelay}s`;
    doc.innerHTML = `
      <rect width="28" height="36" rx="1.5" fill="rgba(244,238,224,0.94)" stroke="rgba(0,0,0,0.08)" stroke-width="0.4"/>
      <line x1="3.5" y1="7"    x2="24.5" y2="7"    stroke="rgba(40,40,55,0.46)" stroke-width="0.6"  stroke-linecap="round"/>
      <line x1="3.5" y1="11.5" x2="22"   y2="11.5" stroke="rgba(40,40,55,0.32)" stroke-width="0.55" stroke-linecap="round"/>
      <line x1="3.5" y1="16"   x2="24"   y2="16"   stroke="rgba(40,40,55,0.24)" stroke-width="0.55" stroke-linecap="round"/>
      <line x1="3.5" y1="20.5" x2="20"   y2="20.5" stroke="rgba(40,40,55,0.2)"  stroke-width="0.55" stroke-linecap="round"/>
      <g transform="translate(17,27)">
        <g class="stamp-seal" style="animation-delay:${sealDelay}s;">
          <circle r="7"   fill="none" stroke="#B54B68" stroke-width="0.85"/>
          <circle r="5.4" fill="none" stroke="#B54B68" stroke-width="0.35" stroke-dasharray="0.55 0.8"/>
          <text x="0" y="1.4" text-anchor="middle"
                font-family="'Inter Tight', sans-serif"
                font-size="3.8" font-weight="800"
                fill="#B54B68" letter-spacing="0.1em">LEY</text>
        </g>
      </g>
    `;

    outer.appendChild(doc);
    docsGroup.appendChild(outer);
  });

  // Contador 0 → 1.527
  const target  = 1527;
  const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    counterEl.textContent = fmtN(target);
    counterEl.classList.add('is-done');
    return;
  }

  const duration = 2400;
  const start    = performance.now() + 200;  // pequeña anticipación con los primeros sellos
  function step(now) {
    if (now < start) { requestAnimationFrame(step); return; }
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    counterEl.textContent = fmtN(Math.floor(eased * target));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      counterEl.textContent = fmtN(target);
      counterEl.classList.add('is-done');
    }
  }
  requestAnimationFrame(step);
}


// ─────────────────────────────────────────────────────────────
// Wrapper responsivo
// ─────────────────────────────────────────────────────────────
// Resuelve dos problemas:
//  1. `el.clientWidth` puede ser 0 durante DOMContentLoaded antes
//     de que el layout esté completo — el viewBox se llenaba con
//     un fallback grande y todo el SVG terminaba escalado al 50%.
//  2. Cambios de viewport (rotación, redimensionado de ventana)
//     no re-dibujaban el gráfico.
// `render(width, isFirstRender)` recibe el ancho real y un flag
// para activar la animación de entrada solo en el primer render.
// ─────────────────────────────────────────────────────────────
const MOBILE_BREAKPOINT = 520;

function responsiveChart(el, render) {
  if (!el) return;
  let lastW       = 0;
  let lastMobile  = null;
  let firstRender = true;

  const run = () => {
    const w = el.clientWidth;
    if (w <= 0) return;
    const nowMobile = w < MOBILE_BREAKPOINT;
    // Redibujar solo cuando hay cambio significativo de ancho
    // o cruce de breakpoint (mobile <-> desktop)
    if (Math.abs(w - lastW) < 8 && nowMobile === lastMobile) return;
    lastW      = w;
    lastMobile = nowMobile;
    d3.select(el).selectAll('*').remove();
    render(w, nowMobile, firstRender);
    firstRender = false;
  };

  if (typeof ResizeObserver !== 'undefined') {
    let raf;
    new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(run);
    }).observe(el);
  } else {
    run();
  }
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initReadingProgress();
  onVisible('.reveal', null, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  initHeroStamp();
  initCounters();

  const [csv, geo] = await Promise.all([
    d3.csv('data/leyes_limpias.csv'),
    d3.json('data/leyes_limpias.geojson'),
  ]);

  const lpSubtemas   = computeSubtemas(csv, 'La Paz',     8);
  const cbbaSubtemas = computeSubtemas(csv, 'Cochabamba', 8);
  const scSubtemas   = computeSubtemas(csv, 'Santa Cruz', 10, true);

  initBarCiudad(csv);
  initTimeline(csv);
  initTemasGeneral(csv);
  initSubtemas('chart-subtemas-lp',   lpSubtemas,   C.lp);
  initSubtemas('chart-subtemas-cbba', cbbaSubtemas, C.cbba);
  initSubtemas('chart-subtemas-sc',   scSubtemas,   C.sc);
  initMap(geo, 'La Paz',     'map-lp');
  initMap(geo, 'Cochabamba', 'map-cbba');
  initMap(geo, 'Santa Cruz', 'map-sc');
});


// ═══════════════════════════════════════════════════════════════
// BAR CHART — Leyes por ciudad
// ═══════════════════════════════════════════════════════════════

function initBarCiudad(csv) {
  const el = document.getElementById('chart-leyes-ciudad');
  if (!el) return;

  const count = city => csv.filter(r => r.ciudad === city).length;
  const data = [
    { label: 'Cochabamba', value: count('Cochabamba'), color: C.cbba },
    { label: 'Santa Cruz', value: count('Santa Cruz'),  color: C.sc  },
    { label: 'La Paz',     value: count('La Paz'),      color: C.lp  },
  ];

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const margin = {
      top:    32,
      right:  isMobile ? 12 : 24,
      bottom: isMobile ? 44 : 56,
      left:   isMobile ? 44 : 64,
    };
    const height = isMobile ? 320 : 360;
    const w = totalW - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const svg = d3.select(el)
      .append('svg')
      .attr('width', '100%').attr('height', height)
      .attr('viewBox', `0 0 ${totalW} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.38);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) * 1.18]).range([h, 0]);

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
      .call(gr => {
        gr.select('.domain').remove();
        gr.selectAll('.tick line').attr('stroke', C.border).attr('stroke-dasharray', '4,3').attr('opacity', 0.6);
      });

    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => fmtN(d)))
      .call(gr => {
        gr.select('.domain').remove();
        gr.selectAll('.tick text').style('fill', C.muted).style('font-size', isMobile ? '12px' : '12px');
      });

    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(gr => {
        gr.select('.domain').remove();
        gr.selectAll('.tick text').style('fill', C.text).style('font-size', isMobile ? '14px' : '15px').style('font-weight', '700');
      });

    const bars = g.selectAll('.bar')
      .data(data).enter().append('rect')
      .attr('x', d => x(d.label)).attr('width', x.bandwidth()).attr('rx', 5)
      .attr('y',      isFirst ? h : d => y(d.value))
      .attr('height', isFirst ? 0 : d => h - y(d.value))
      .attr('fill', d => d.color).attr('fill-opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('fill-opacity', 1);
        tip.show(`<strong>${d.label}</strong><br>${fmtN(d.value)} leyes`, event.clientX, event.clientY);
      })
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', event => { d3.select(event.currentTarget).attr('fill-opacity', 0.85); tip.hide(); });

    const labels = g.selectAll('.bar-lbl')
      .data(data).enter().append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', isFirst ? h : d => y(d.value))
      .attr('text-anchor', 'middle').attr('dy', '-0.4em')
      .style('font-size', isMobile ? '18px' : '16px').style('font-weight', '800')
      .style('fill', d => d.color).style('opacity', isFirst ? 0 : 1)
      .text(d => fmtN(d.value));

    if (isFirst) {
      onVisibleOnce(el, () => {
        bars.transition().duration(900).delay((_, i) => i * 130).ease(d3.easeCubicOut)
          .attr('y', d => y(d.value)).attr('height', d => h - y(d.value));
        labels.transition().duration(500).delay((_, i) => i * 130 + 650)
          .attr('y', d => y(d.value)).style('opacity', 1);
      }, { threshold: 0.3 });
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// LINE CHART FACETADO — Un panel por año
// ═══════════════════════════════════════════════════════════════

function initTimeline(csv) {
  const el = document.getElementById('chart-timeline');
  if (!el) return;

  const cities   = ['Cochabamba', 'Santa Cruz', 'La Paz'];
  const MONTHS   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const LAST_KEY = '2026-03';
  const YEARS    = [2021, 2022, 2023, 2024, 2025, 2026];

  // ── Datos: conteo por ciudad × mes ──────────────────────────
  const counts = {};
  cities.forEach(c => { counts[c] = {}; });
  csv.forEach(r => {
    const m = parseMonth(r.fecha_aprobacion);
    if (!m || m < '2021-01' || m > LAST_KEY || !counts[r.ciudad]) return;
    counts[r.ciudad][m] = (counts[r.ciudad][m] || 0) + 1;
  });

  const facets = YEARS.map(yr => {
    const nMonths = yr < 2026 ? 12 : 3;
    return {
      year:    yr,
      partial: yr === 2026,
      series:  cities.map(city => ({
        name:   city,
        color:  CITY_COLOR[city],
        values: Array.from({ length: nMonths }, (_, mi) => ({
          mi,
          count: counts[city][`${yr}-${String(mi + 1).padStart(2, '0')}`] || 0,
        })),
      })),
    };
  });

  let rawMax = 0;
  facets.forEach(f => f.series.forEach(s => s.values.forEach(v => {
    if (v.count > rawMax) rawMax = v.count;
  })));
  const yMax = Math.ceil(rawMax / 10) * 10 || 10;

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const M       = {
      top:    10,
      right:  isMobile ? 10 : 14,
      bottom: isMobile ? 32 : 26,
      left:   isMobile ? 40 : 56,
    };
    const fH      = isMobile ? 150 : 100;
    const legendH = isMobile ? 40 : 32;
    const iW      = totalW - M.left - M.right;
    const iH      = fH - M.top - M.bottom;
    const totalH  = legendH + YEARS.length * fH + 1;

    const svg = d3.select(el)
      .append('svg')
      .attr('width', '100%').attr('height', totalH)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // ── Leyenda ───────────────────────────────────────────────
    const lgd = svg.append('g').attr('transform', `translate(${M.left},12)`);
    const lgdStep = isMobile ? Math.min(iW / 3, 120) : Math.min(iW / 3, 160);
    cities.forEach((city, i) => {
      const lx = i * lgdStep;
      lgd.append('line').attr('x1', lx).attr('y1', 8).attr('x2', lx + 16).attr('y2', 8)
        .attr('stroke', CITY_COLOR[city]).attr('stroke-width', 2);
      lgd.append('circle').attr('cx', lx + 8).attr('cy', 8).attr('r', 3)
        .attr('fill', CITY_COLOR[city]);
      lgd.append('text').attr('x', lx + 22).attr('y', 8).attr('dy', '0.35em')
        .style('fill', C.text).style('font-size', isMobile ? '13px' : '12px').text(city);
    });

    const xPad   = iW * 0.015;
    const xScale = d3.scaleLinear().domain([0, 11]).range([xPad, iW - xPad]);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([iH, 0]);
    const yTicks = yScale.ticks(3);

    const lineGen = d3.line()
      .x(d => xScale(d.mi))
      .y(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const allPaths = [];

    facets.forEach((facet, fi) => {
      const fy = legendH + fi * fH;
      const g  = svg.append('g').attr('transform', `translate(${M.left},${fy + M.top})`);

      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', iW).attr('y2', 0)
        .attr('stroke', C.border).attr('opacity', 0.45);

      g.append('text')
        .attr('x', -M.left + 2).attr('y', 6).attr('dy', '0.35em')
        .style('font-size', isMobile ? '13px' : '12px').style('font-weight', '700').style('fill', C.muted)
        .text(facet.year);

      yTicks.forEach(tick => {
        g.append('line')
          .attr('x1', 0).attr('y1', yScale(tick)).attr('x2', iW).attr('y2', yScale(tick))
          .attr('stroke', C.border).attr('stroke-dasharray', '4,3').attr('opacity', 0.5);
        g.append('text')
          .attr('x', -5).attr('y', yScale(tick)).attr('dy', '0.35em').attr('text-anchor', 'end')
          .style('font-size', isMobile ? '10px' : '9px').style('fill', C.light).text(tick);
      });

      MONTHS.forEach((name, mi) => {
        const active = mi < facet.series[0].values.length;
        g.append('text')
          .attr('x', xScale(mi)).attr('y', iH + (isMobile ? 18 : 14)).attr('text-anchor', 'middle')
          .style('font-size', isMobile ? '11px' : '9.5px')
          .style('fill', active ? C.muted : C.border)
          .text(name);
      });

      if (facet.partial) {
        g.append('text')
          .attr('x', xScale(1)).attr('y', iH / 2 - 6).attr('text-anchor', 'middle')
          .style('font-size', isMobile ? '11px' : '9px').style('fill', C.light).style('font-style', 'italic')
          .text('Ene – Mar');
      }

      facet.series.forEach(s => {
        const path = g.append('path').datum(s.values)
          .attr('fill', 'none').attr('stroke', s.color)
          .attr('stroke-width', isMobile ? 2.2 : 2).attr('stroke-linecap', 'round')
          .attr('d', lineGen);

        if (isFirst) {
          const len = path.node().getTotalLength();
          path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len);
          allPaths.push({ path, len });
        }

        g.selectAll(null).data(s.values).enter().append('circle')
          .attr('cx', d => xScale(d.mi)).attr('cy', d => yScale(d.count))
          .attr('r', isMobile ? 3 : 2.5).attr('fill', s.color)
          .attr('opacity', isFirst ? 0 : 1);
      });

      const hoverLine = g.append('line').attr('y1', 0).attr('y2', iH)
        .attr('stroke', C.muted).attr('stroke-dasharray', '3,2')
        .attr('stroke-width', 1).attr('opacity', 0).attr('pointer-events', 'none');

      g.append('rect').attr('x', 0).attr('y', 0).attr('width', iW).attr('height', iH)
        .attr('fill', 'transparent')
        .on('mousemove', function(event) {
          const [mx] = d3.pointer(event);
          const mi = Math.max(0, Math.min(
            Math.round(xScale.invert(mx)),
            facet.series[0].values.length - 1
          ));
          hoverLine.attr('x1', xScale(mi)).attr('x2', xScale(mi)).attr('opacity', 0.5);
          const rows = facet.series.map(s =>
            `<span style="color:${s.color}">${s.name}: <strong>${fmtN(s.values[mi].count)}</strong></span>`
          ).join('<br>');
          tip.show(`<strong>${MONTHS[mi]} ${facet.year}</strong><br>${rows}`, event.clientX, event.clientY);
        })
        .on('mouseleave', () => { hoverLine.attr('opacity', 0); tip.hide(); });
    });

    const bottomY = legendH + YEARS.length * fH;
    svg.append('line')
      .attr('x1', M.left).attr('y1', bottomY).attr('x2', M.left + iW).attr('y2', bottomY)
      .attr('stroke', C.border).attr('opacity', 0.45);

    if (isFirst) {
      onVisibleOnce(el, () => {
        allPaths.forEach(({ path, len }, i) => {
          path.transition().duration(1100).delay(i * 55)
            .ease(d3.easeLinear).attr('stroke-dashoffset', 0);
        });
        svg.selectAll('circle').transition().duration(180)
          .delay((_, i) => i * 12 + 450).attr('opacity', 1);
      }, { threshold: 0.1 });
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// TEMAS GENERAL — Horizontal bar
// ═══════════════════════════════════════════════════════════════

function initTemasGeneral(csv) {
  const el = document.getElementById('chart-temas-general');
  if (!el) return;

  const total  = csv.length;
  const counts = new Map();
  csv.forEach(r => { const t = (r.tema || '').trim(); if (t) counts.set(t, (counts.get(t) || 0) + 1); });

  const data = [...counts.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([label, value]) => ({ label, value, pct: (value / total * 100).toFixed(1) }));

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const colorOf = d => TEMA_COLOR[d.label] || C.muted;
    const onHover = (event, d) => tip.show(
      `<strong>${d.label}</strong><br>${fmtN(d.value)} leyes · ${d.pct}%`,
      event.clientX, event.clientY
    );

    // ── MOBILE: etiqueta encima de la barra ───────────────────
    if (isMobile) {
      const rowH     = 58;
      const padX     = 4;
      const barH     = 18;
      const labelH   = 18;
      const pctW     = 52;                         // espacio reservado para "17.5%"
      const w        = totalW - padX * 2 - pctW;
      const totalH   = data.length * rowH + 12;

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', totalH)
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const x = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([0, w]);
      const rows = svg.selectAll('.tema-row').data(data).enter().append('g')
        .attr('class', 'tema-row')
        .attr('transform', (_, i) => `translate(${padX},${6 + i * rowH})`);

      rows.append('text')
        .attr('x', 0).attr('y', labelH / 2).attr('dy', '0.35em')
        .style('font-size', '14px').style('font-weight', '500').style('fill', C.text)
        .text(d => d.label);

      rows.append('rect')
        .attr('x', 0).attr('y', labelH + 6).attr('width', w).attr('height', barH).attr('rx', barH / 2)
        .attr('fill', C.border);

      const bars = rows.append('rect')
        .attr('x', 0).attr('y', labelH + 6).attr('height', barH).attr('rx', barH / 2)
        .attr('width', isFirst ? 0 : d => x(d.value))
        .attr('fill', colorOf)
        .style('cursor', 'pointer')
        .on('mouseover', onHover)
        .on('mousemove', e => tip.move(e.clientX, e.clientY))
        .on('mouseout', () => tip.hide());

      const pcts = rows.append('text')
        .attr('x', isFirst ? 6 : d => x(d.value) + 8)
        .attr('y', labelH + 6 + barH / 2).attr('dy', '0.35em')
        .style('font-size', '13px').style('font-weight', '700')
        .style('fill', colorOf).style('opacity', isFirst ? 0 : 1)
        .text(d => `${d.pct}%`);

      if (isFirst) {
        onVisibleOnce(el, () => {
          bars.transition().duration(900).delay((_, i) => i * 48).ease(d3.easeCubicOut)
            .attr('width', d => x(d.value));
          pcts.transition().duration(400).delay((_, i) => i * 48 + 720)
            .attr('x', d => x(d.value) + 8).style('opacity', 1);
        }, { threshold: 0.2 });
      }
      return;
    }

    // ── DESKTOP: etiqueta a la izquierda de la barra ──────────
    const labelW = Math.min(Math.max(totalW * 0.42, 260), 380);
    const margin = { top: 12, right: 72, bottom: 16, left: labelW };
    const rowH   = 38;
    const totalH = data.length * rowH + margin.top + margin.bottom;
    const w      = totalW - margin.left - margin.right;

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', totalH)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([0, w]);
    const y = d3.scaleBand().domain(data.map((_, i) => i))
      .range([0, totalH - margin.top - margin.bottom]).padding(0.22);
    const bh   = y.bandwidth();
    const barH = 16;

    const rows = g.selectAll('.tema-row').data(data).enter().append('g')
      .attr('class', 'tema-row').attr('transform', (_, i) => `translate(0,${y(i)})`);

    rows.append('text')
      .attr('x', -8).attr('y', bh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .style('font-size', '12px').style('fill', C.text)
      .text(d => d.label.length > 44 ? d.label.slice(0, 44) + '…' : d.label);

    rows.append('rect').attr('x', 0).attr('y', (bh - barH) / 2).attr('width', w).attr('height', barH).attr('rx', barH / 2)
      .attr('fill', C.border);

    const bars = rows.append('rect')
      .attr('x', 0).attr('y', (bh - barH) / 2).attr('height', barH).attr('rx', barH / 2)
      .attr('width', isFirst ? 0 : d => x(d.value))
      .attr('fill', colorOf)
      .style('cursor', 'pointer')
      .on('mouseover', onHover)
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', () => tip.hide());

    const pcts = rows.append('text')
      .attr('x', isFirst ? 0 : d => x(d.value)).attr('y', bh / 2)
      .attr('dy', '0.35em').attr('dx', 8)
      .style('font-size', '11px').style('font-weight', '700')
      .style('fill', colorOf).style('opacity', isFirst ? 0 : 1)
      .text(d => `${d.pct}%`);

    if (isFirst) {
      onVisibleOnce(el, () => {
        bars.transition().duration(900).delay((_, i) => i * 48).ease(d3.easeCubicOut)
          .attr('width', d => x(d.value));
        pcts.transition().duration(400).delay((_, i) => i * 48 + 720)
          .attr('x', d => x(d.value)).style('opacity', 1);
      }, { threshold: 0.2 });
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// SUBTEMAS — Horizontal bar por ciudad
// ═══════════════════════════════════════════════════════════════

function initSubtemas(containerId, data, color) {
  const el = document.getElementById(containerId);
  if (!el || !data.length) return;

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const onHover = (event, d) => tip.show(
      `<strong>${d.label}</strong><br>${d.pct.toFixed(1)}% · ${fmtN(d.value)} leyes`,
      event.clientX, event.clientY
    );

    // ── MOBILE: etiqueta encima de la barra ───────────────────
    if (isMobile) {
      const rowH   = 62;
      const padX   = 4;
      const barH   = 18;
      const labelH = 20;
      const pctW   = 52;
      const w      = totalW - padX * 2 - pctW;
      const totalH = data.length * rowH + 12;

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', totalH)
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const x = d3.scaleLinear().domain([0, d3.max(data, d => d.pct)]).range([0, w]);
      const rows = svg.selectAll('.sub-row').data(data).enter().append('g')
        .attr('class', 'sub-row')
        .attr('transform', (_, i) => `translate(${padX},${6 + i * rowH})`);

      rows.append('text')
        .attr('x', 0).attr('y', labelH / 2).attr('dy', '0.35em')
        .style('font-size', '14px').style('font-weight', '500').style('fill', C.text)
        .text(d => d.label);

      rows.append('rect')
        .attr('x', 0).attr('y', labelH + 6).attr('width', w).attr('height', barH).attr('rx', barH / 2)
        .attr('fill', C.border);

      const bars = rows.append('rect')
        .attr('x', 0).attr('y', labelH + 6).attr('height', barH).attr('rx', barH / 2)
        .attr('width', isFirst ? 0 : d => x(d.pct))
        .attr('fill', color).attr('fill-opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', onHover)
        .on('mousemove', e => tip.move(e.clientX, e.clientY))
        .on('mouseout', () => tip.hide());

      const nums = rows.append('text')
        .attr('x', isFirst ? 6 : d => x(d.pct) + 8)
        .attr('y', labelH + 6 + barH / 2).attr('dy', '0.35em')
        .style('font-size', '13px').style('font-weight', '700')
        .style('fill', color).style('opacity', isFirst ? 0 : 1)
        .text(d => d.pct.toFixed(1) + '%');

      if (isFirst) {
        onVisibleOnce(el, () => {
          bars.transition().duration(900).delay((_, i) => i * 60).ease(d3.easeCubicOut)
            .attr('width', d => x(d.pct));
          nums.transition().duration(400).delay((_, i) => i * 60 + 720)
            .attr('x', d => x(d.pct) + 8).style('opacity', 1);
        }, { threshold: 0.2 });
      }
      return;
    }

    // ── DESKTOP: etiqueta a la izquierda ──────────────────────
    const labelW = Math.min(Math.max(totalW * 0.44, 240), 340);
    const margin = { top: 12, right: 72, bottom: 12, left: labelW };
    const rowH   = 46;
    const totalH = data.length * rowH + margin.top + margin.bottom;
    const w      = totalW - margin.left - margin.right;

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', totalH)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.pct)]).range([0, w]);
    const y = d3.scaleBand().domain(data.map((_, i) => i))
      .range([0, totalH - margin.top - margin.bottom]).padding(0.2);
    const bh   = y.bandwidth();
    const barH = 14;

    const rows = g.selectAll('.sub-row').data(data).enter().append('g')
      .attr('class', 'sub-row').attr('transform', (_, i) => `translate(0,${y(i)})`);

    rows.append('text')
      .attr('x', -8).attr('y', bh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .style('font-size', '12px').style('fill', C.text)
      .text(d => d.label.length > 42 ? d.label.slice(0, 42) + '…' : d.label);

    rows.append('rect').attr('x', 0).attr('y', (bh - barH) / 2).attr('width', w).attr('height', barH).attr('rx', barH / 2)
      .attr('fill', C.border);

    const bars = rows.append('rect')
      .attr('x', 0).attr('y', (bh - barH) / 2).attr('height', barH).attr('rx', barH / 2)
      .attr('width', isFirst ? 0 : d => x(d.pct))
      .attr('fill', color).attr('fill-opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseover', onHover)
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', () => tip.hide());

    const nums = rows.append('text')
      .attr('x', isFirst ? 0 : d => x(d.pct)).attr('y', bh / 2)
      .attr('dy', '0.35em').attr('dx', 8)
      .style('font-size', '11px').style('font-weight', '700')
      .style('fill', color).style('opacity', isFirst ? 0 : 1)
      .text(d => d.pct.toFixed(1) + '%');

    if (isFirst) {
      onVisibleOnce(el, () => {
        bars.transition().duration(900).delay((_, i) => i * 60).ease(d3.easeCubicOut)
          .attr('width', d => x(d.pct));
        nums.transition().duration(400).delay((_, i) => i * 60 + 720)
          .attr('x', d => x(d.pct)).style('opacity', 1);
      }, { threshold: 0.2 });
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// MAP — Leaflet con tiles CartoDB + puntos por tema
// ═══════════════════════════════════════════════════════════════

function initMap(geo, city, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  let pts = geo.features
    .filter(f => f.geometry && f.properties.ciudad === city)
    .map(f => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], ...f.properties }));

  if (!pts.length) return;

  // Filtro IQR para outliers geográficos
  const sortLon = [...pts.map(p => p.lon)].sort((a, b) => a - b);
  const sortLat = [...pts.map(p => p.lat)].sort((a, b) => a - b);
  const n = sortLon.length;
  const q1Lon = sortLon[Math.floor(n * 0.25)], q3Lon = sortLon[Math.floor(n * 0.75)];
  const q1Lat = sortLat[Math.floor(n * 0.25)], q3Lat = sortLat[Math.floor(n * 0.75)];
  const iqrF = 3;
  pts = pts.filter(p =>
    p.lon >= q1Lon - iqrF * (q3Lon - q1Lon) && p.lon <= q3Lon + iqrF * (q3Lon - q1Lon) &&
    p.lat >= q1Lat - iqrF * (q3Lat - q1Lat) && p.lat <= q3Lat + iqrF * (q3Lat - q1Lat)
  );
  if (!pts.length) return;

  // Altura del contenedor
  el.style.height = '460px';

  // Mapa Leaflet
  const map = L.map(el, {
    scrollWheelZoom: false,   // evita zoom accidental al desplazarse por el artículo
    zoomControl: true,
    attributionControl: true,
  });

  // Tiles CartoDB Positron — fondo claro y mínimo
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // Ajustar vista a los puntos con margen
  const bounds = L.latLngBounds(pts.map(p => [p.lat, p.lon]));
  map.fitBounds(bounds, { padding: [36, 36] });

  // Marcadores por ley
  const radius = pts.length > 150 ? 5 : 7;
  pts.forEach(p => {
    const color = TEMA_COLOR[p.tema] || C.muted;
    const marker = L.circleMarker([p.lat, p.lon], {
      radius,
      fillColor: color,
      color: 'rgba(255,255,255,0.7)',
      weight: 0.8,
      fillOpacity: 0.80,
    }).addTo(map);

    marker
      .on('mouseover', function(e) {
        this.setStyle({ fillOpacity: 1, weight: 1.5 });
        tip.show(
          `<strong>Ley ${p.ley}</strong><br>
           <span style="color:${color};font-size:11px">${p.tema}</span><br>
           <span style="font-size:11px">${(p.resumen || '').slice(0, 110)}…</span>`,
          e.originalEvent.clientX, e.originalEvent.clientY
        );
      })
      .on('mousemove', e => tip.move(e.originalEvent.clientX, e.originalEvent.clientY))
      .on('mouseout', function() {
        this.setStyle({ fillOpacity: 0.80, weight: 0.8 });
        tip.hide();
      });
  });

  // Leyenda: temas presentes en este mapa ordenados por frecuencia
  const presentTemas = [...new Set(pts.map(p => p.tema))].filter(Boolean)
    .sort((a, b) => pts.filter(p => p.tema === b).length - pts.filter(p => p.tema === a).length)
    .slice(0, 8);

  const Legend = L.control({ position: 'bottomleft' });
  Legend.onAdd = () => {
    const div = L.DomUtil.create('div');
    Object.assign(div.style, {
      background: 'rgba(255,255,255,0.93)',
      padding: '8px 12px',
      borderRadius: '6px',
      fontFamily: "'Inter Tight', 'Inter', sans-serif",
      fontSize: '11px',
      lineHeight: '1.85',
      boxShadow: '0 1px 6px rgba(48,48,61,0.14)',
      maxWidth: '220px',
    });
    presentTemas.forEach(tema => {
      const col   = TEMA_COLOR[tema] || C.muted;
      const label = tema.length > 32 ? tema.slice(0, 32) + '…' : tema;
      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;display:inline-block;opacity:0.88;"></span>
          <span style="color:#30303D;">${label}</span>
        </div>`;
    });
    return div;
  };
  Legend.addTo(map);
}
