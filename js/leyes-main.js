'use strict';

import { initReadingProgress, onVisible, onVisibleOnce, createTooltip } from './utils.js';

// ── Paleta ────────────────────────────────────────────────────
// Paleta inspirada en The Pudding (pudding.cool/2020/08/income):
// neutros carbón/grises + acentos planos teal, naranja, marino, amarillo.
const C = {
  lp:     '#FF8850', // naranja
  cbba:   '#00A08F', // teal
  sc:     '#124653', // marino
  accent: '#008577',
  muted:  '#5B5B5B',
  light:  '#828282',
  border: '#E6E6E6',
  divider:'#C9C9C9',
  track:  '#F4F4F4',
  text:   '#282828',
  card:   '#FFFFFF',
};

const CITY_COLOR = { 'La Paz': C.lp, 'Cochabamba': C.cbba, 'Santa Cruz': C.sc };

const TEMA_COLOR = {
  // Temas principales — acentos de la paleta
  'suelo y vivienda':                                        '#00A08F', // teal
  'administracion publica':                                  '#124653', // marino
  'Reconocimiento a ciudadanos u organizaciones destacadas': '#FF8850', // naranja
  'patrimonio, cultura y turismo':                           '#F2C14E', // amarillo
  'impuestos':                                               '#F29595', // rosa
  // Temas secundarios — variaciones apagadas
  'transporte':                                              '#5B8A99', // azul pizarra
  'seguridad':                                               '#3E6E8E', // azul acero
  'medio ambiente':                                          '#7FB069', // verde hoja
  'salud':                                                   '#C2577A', // frambuesa
  'gestión de riesgos':                                      '#A6472B', // terracota
  'gestión de residuos':                                     '#A89A5B', // oliva
  'comercio y mercados':                                     '#8E83C2', // lavanda
  'niñez y juventud':                                        '#E3A3C0', // rosa pálido
  'educación':                                               '#4FB3C8', // celeste
  'parques y recreación':                                    '#B3CC7A', // lima
};

const tip = createTooltip();

// ── Helpers ───────────────────────────────────────────────────
function fmtN(n) { return new Intl.NumberFormat('es').format(n); }

// Color de texto legible sobre un fondo dado
function inkOn(fill) {
  return d3.lab(fill).l > 62 ? C.text : '#FFFFFF';
}

// Versión oscurecida de un color claro para usarlo como texto sobre blanco
function inkOf(color) {
  const l = d3.lab(color).l;
  return l > 55 ? d3.lab(color).darker((l - 45) / 18).formatHex() : color;
}

function dot(color) {
  return `<i class="tt-dot" style="background:${color}"></i>`;
}

// Estilo común de ejes: sin línea de dominio, etiquetas grises
function styleAxis(gr, size = 12) {
  gr.select('.domain').remove();
  gr.selectAll('.tick line').attr('stroke', C.border);
  gr.selectAll('.tick text').style('fill', C.light).style('font-size', `${size}px`);
}

function parseMonth(dateStr) {
  if (!dateStr) return null;
  const p = dateStr.trim().split('/');
  if (p.length === 3) return `${p[2].trim()}-${p[1].trim().padStart(2, '0')}`;
  return null;
}

function buildSubtemasHierarchy(csv, city, excludeTemas = [], maxTemas = 8, maxSubPer = 6) {
  const rows  = csv.filter(r => r.ciudad === city);
  const total = rows.length;
  const tMap  = new Map();

  rows.forEach(r => {
    const tema = (r.tema || '').trim();
    let   sub  = (r.subtemas || '').trim();
    if (!tema || excludeTemas.includes(tema)) return;
    if (!sub) sub = tema;
    if (!tMap.has(tema)) tMap.set(tema, new Map());
    const m = tMap.get(tema);
    m.set(sub, (m.get(sub) || 0) + 1);
  });

  const children = [...tMap.entries()]
    .map(([name, m]) => {
      const tTotal = [...m.values()].reduce((a, b) => a + b, 0);
      return {
        name,
        tTotal,
        pct: tTotal / total * 100,
        children: [...m.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, maxSubPer)
          .map(([sname, val]) => ({ name: sname, value: val, pct: val / total * 100 })),
      };
    })
    .sort((a, b) => b.tTotal - a.tTotal)
    .slice(0, maxTemas);

  return { name: 'root', children };
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
  // En mobile el SVG renderiza ~118px de alto; las posiciones con y > 155
  // desbordan visualmente sobre el título. Se usa una distribución
  // concentrada en la banda superior y los bordes extremos.
  const isMobile  = window.innerWidth < 540;
  const positions = isMobile ? [
    // ── Banda superior (y < 45) — ancho completo ────────────
    [14, 5, -7],   [82, 20, 4],   [155, 4, -3],  [228, 22, 6],
    [312, 7, -5],  [395, 21, 3],  [470, 5, -4],  [548, 20, 5],
    [620, 4, -4],  [696, 18, 5],
    // ── Segunda fila (y 26–42) ───────────────────────────────
    [44, 34, 3],   [118, 26, -4], [200, 38, 5],
    [498, 32, 4],  [572, 26, -5], [648, 36, 3],  [716, 28, -4],
    // ── Lado izquierdo — escalonado (x 6–115, y 58–152) ─────
    [6,  62, -3],  [82,  78,  5],
    [18, 108,  4], [96, 124, -4],
    [32, 148, -5],
    // ── Lado derecho — escalonado (x 612–724, y 64–150) ─────
    [718, 66,  4], [638, 84, -3],
    [708, 116, -5],[614, 132,  4],
    [694, 150,  3],
  ] : [
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
    doc.style.setProperty('--appear-delay', `${docDelay}s`);
    doc.style.setProperty('--float-delay',  `${(docDelay + 0.55).toFixed(2)}s`);
    doc.style.setProperty('--float-dur',    `${(2.5 + (i % 7) * 0.28).toFixed(2)}s`);
    const sealColor = [C.cbba, C.lp, C.sc][i % 3];
    doc.innerHTML = `
      <rect width="28" height="36" rx="1" fill="#FFFFFF" stroke="#C9C9C9" stroke-width="0.6"/>
      <line x1="3.5" y1="7"    x2="24.5" y2="7"    stroke="rgba(40,40,40,0.5)"  stroke-width="0.6"  stroke-linecap="round"/>
      <line x1="3.5" y1="11.5" x2="22"   y2="11.5" stroke="rgba(40,40,40,0.3)"  stroke-width="0.55" stroke-linecap="round"/>
      <line x1="3.5" y1="16"   x2="24"   y2="16"   stroke="rgba(40,40,40,0.22)" stroke-width="0.55" stroke-linecap="round"/>
      <line x1="3.5" y1="20.5" x2="20"   y2="20.5" stroke="rgba(40,40,40,0.18)" stroke-width="0.55" stroke-linecap="round"/>
      <g transform="translate(17,27)">
        <g class="stamp-seal" style="animation-delay:${sealDelay}s;">
          <circle r="7"   fill="none" stroke="${sealColor}" stroke-width="0.85"/>
          <circle r="5.4" fill="none" stroke="${sealColor}" stroke-width="0.35" stroke-dasharray="0.55 0.8"/>
          <text x="0" y="1.4" text-anchor="middle"
                font-family="'Libre Franklin', sans-serif"
                font-size="3.8" font-weight="800"
                fill="${sealColor}" letter-spacing="0.1em">LEY</text>
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

  const [csv, geo, distLp, distCbba, distSc] = await Promise.all([
    d3.csv('data/leyes_limpias.csv'),
    d3.json('data/leyes_limpias.geojson'),
    d3.json('data/distritos-lapaz.geojson'),
    d3.json('data/distritos-cochabamba.geojson'),
    d3.json('data/distritos-santacruz.geojson'),
  ]);

  initBarCiudad(csv);
  initTimeline(csv);
  initTemasGeneral(csv);
  initTemasBarCity('chart-temas-lp',   csv, 'La Paz',     C.lp);
  initTemasBarCity('chart-temas-cbba', csv, 'Cochabamba', C.cbba);
  initTemasBarCity('chart-temas-sc',   csv, 'Santa Cruz',  C.sc);
  initSubtemasHierarchy('chart-subtemas-lp',   csv, 'La Paz',     ['administracion publica', 'impuestos']);
  initSubtemasHierarchy('chart-subtemas-cbba', csv, 'Cochabamba', []);
  initSubtemasHierarchy('chart-subtemas-sc',   csv, 'Santa Cruz', []);
  initMap(geo, 'La Paz',     'map-lp');
  initMap(geo, 'Cochabamba', 'map-cbba');
  initMap(geo, 'Santa Cruz', 'map-sc');
  const distLpUrbano = { ...distLp, features: distLp.features.filter(f => f.properties.tipo !== 'RU') };
  initChoropleth('choropleth-lp',   distLpUrbano, geo, 'La Paz',  C.lp,   d => `Distrito ${d.distrito}`,         d => d.macro_vige || '');
  initChoropleth('choropleth-cbba', distCbba, geo, 'Cochabamba', C.cbba, d => `Distrito ${d.Num_dist}`,         d => '');
  initChoropleth('choropleth-sc',   distSc,   geo, 'Santa Cruz', C.sc,   d => `Distrito ${d.distrito}`,         d => '');
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

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(d => fmtN(d)).tickPadding(10))
      .call(gr => {
        styleAxis(gr, 12);
        gr.selectAll('.tick line').attr('stroke', C.border);
      });

    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(12))
      .call(gr => {
        styleAxis(gr);
        gr.selectAll('.tick text').style('fill', C.text).style('font-size', isMobile ? '12px' : '14px').style('font-weight', '700');
      });

    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', h).attr('y2', h)
      .attr('stroke', C.text).attr('stroke-width', 1);

    const bars = g.selectAll('.bar')
      .data(data).enter().append('rect')
      .attr('x', d => x(d.label)).attr('width', x.bandwidth()).attr('rx', 1)
      .attr('y',      isFirst ? h : d => y(d.value))
      .attr('height', isFirst ? 0 : d => h - y(d.value))
      .attr('fill', d => d.color)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        bars.attr('opacity', b => b === d ? 1 : 0.35);
        tip.show(`<span class="tt-title">${dot(d.color)}${d.label}</span><strong>${fmtN(d.value)}</strong> leyes aprobadas`, event.clientX, event.clientY);
      })
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', () => { bars.attr('opacity', 1); tip.hide(); });

    const labels = g.selectAll('.bar-lbl')
      .data(data).enter().append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', isFirst ? h : d => y(d.value))
      .attr('text-anchor', 'middle').attr('dy', '-0.5em')
      .style('font-size', isMobile ? '18px' : '20px').style('font-weight', '700')
      .style('fill', C.text).style('opacity', isFirst ? 0 : 1)
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
    const lgdStep = isMobile ? iW / 3 : Math.min(iW / 3, 160);
    cities.forEach((city, i) => {
      const lx = i * lgdStep;
      lgd.append('line').attr('x1', lx).attr('y1', 8).attr('x2', lx + 14).attr('y2', 8)
        .attr('stroke', CITY_COLOR[city]).attr('stroke-width', 2);
      lgd.append('circle').attr('cx', lx + 7).attr('cy', 8).attr('r', 3)
        .attr('fill', CITY_COLOR[city]);
      lgd.append('text').attr('x', lx + 19).attr('y', 8).attr('dy', '0.35em')
        .style('fill', C.text).style('font-size', isMobile ? '12px' : '13px').style('font-weight', '600').text(city);
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
        .attr('stroke', C.border);

      g.append('text')
        .attr('x', -M.left + 2).attr('y', 6).attr('dy', '0.35em')
        .style('font-size', isMobile ? '13px' : '13px').style('font-weight', '700').style('fill', C.text)
        .text(facet.year);

      yTicks.forEach(tick => {
        g.append('line')
          .attr('x1', 0).attr('y1', yScale(tick)).attr('x2', iW).attr('y2', yScale(tick))
          .attr('stroke', tick === 0 ? C.divider : C.border);
        if (tick === 0 || yScale(tick) < 12) return;
        g.append('text')
          .attr('x', -5).attr('y', yScale(tick)).attr('dy', '0.35em').attr('text-anchor', 'end')
          .style('font-size', isMobile ? '10px' : '10px').style('fill', C.light).text(tick);
      });

      MONTHS.forEach((name, mi) => {
        const active = mi < facet.series[0].values.length;
        g.append('text')
          .attr('x', xScale(mi)).attr('y', iH + (isMobile ? 18 : 14)).attr('text-anchor', 'middle')
          .style('font-size', isMobile ? '11px' : '10px')
          .style('fill', active ? C.light : C.border)
          .text(name);
      });

      if (facet.partial) {
        g.append('text')
          .attr('x', xScale(1)).attr('y', iH / 2 - 6).attr('text-anchor', 'middle')
          .style('font-size', isMobile ? '11px' : '10px').style('fill', C.light).style('font-style', 'italic')
          .text('Ene – Mar');
      }

      facet.series.forEach(s => {
        const path = g.append('path').datum(s.values)
          .attr('fill', 'none').attr('stroke', s.color)
          .attr('stroke-width', isMobile ? 2.2 : 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
          .attr('d', lineGen);

        if (isFirst) {
          const len = path.node().getTotalLength();
          path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len);
          allPaths.push({ path, len });
        }

        g.selectAll(null).data(s.values).enter().append('circle')
          .attr('cx', d => xScale(d.mi)).attr('cy', d => yScale(d.count))
          .attr('r', isMobile ? 3 : 2.5).attr('fill', s.color).attr('stroke', '#fff').attr('stroke-width', 0.8)
          .attr('opacity', isFirst ? 0 : 1);
      });

      const hoverLine = g.append('line').attr('y1', 0).attr('y2', iH)
        .attr('stroke', C.text).attr('stroke-width', 1).attr('opacity', 0).attr('pointer-events', 'none');

      g.append('rect').attr('x', 0).attr('y', 0).attr('width', iW).attr('height', iH)
        .attr('fill', 'transparent')
        .on('mousemove', function(event) {
          const [mx] = d3.pointer(event);
          const mi = Math.max(0, Math.min(
            Math.round(xScale.invert(mx)),
            facet.series[0].values.length - 1
          ));
          hoverLine.attr('x1', xScale(mi)).attr('x2', xScale(mi)).attr('opacity', 0.35);
          const rows = facet.series.map(s =>
            `${dot(s.color)}<span>${s.name}:</span> <strong>${fmtN(s.values[mi].count)}</strong>`
          ).join('<br>');
          tip.show(`<span class="tt-title">${MONTHS[mi]} ${facet.year}</span>${rows}`, event.clientX, event.clientY);
        })
        .on('mouseleave', () => { hoverLine.attr('opacity', 0); tip.hide(); });
    });

    const bottomY = legendH + YEARS.length * fH;
    svg.append('line')
      .attr('x1', M.left).attr('y1', bottomY).attr('x2', M.left + iW).attr('y2', bottomY)
      .attr('stroke', C.border);

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
      `<span class="tt-title">${dot(colorOf(d))}${d.label}</span><strong>${fmtN(d.value)}</strong> leyes · ${d.pct}%`,
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
        .text(d => {
          const maxCh = Math.floor((totalW - padX * 2 - pctW) / 7.8);
          return d.label.length > maxCh ? d.label.slice(0, maxCh - 1) + '…' : d.label;
        });

      rows.append('rect')
        .attr('x', 0).attr('y', labelH + 6).attr('height', barH).attr('width', w)
        .attr('fill', C.track);

      const bars = rows.append('rect')
        .attr('x', 0).attr('y', labelH + 6).attr('height', barH).attr('rx', 1)
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
        .style('fill', C.text).style('opacity', isFirst ? 0 : 1)
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
    const rowH   = 36;
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
    const barH = 18;

    const rows = g.selectAll('.tema-row').data(data).enter().append('g')
      .attr('class', 'tema-row').attr('transform', (_, i) => `translate(0,${y(i)})`);

    rows.append('text')
      .attr('x', -8).attr('y', bh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .style('font-size', '13px').style('fill', C.text)
      .text(d => d.label.length > 44 ? d.label.slice(0, 44) + '…' : d.label);

    rows.append('rect')
      .attr('x', 0).attr('y', (bh - barH) / 2).attr('height', barH).attr('width', w)
      .attr('fill', C.track);

    const bars = rows.append('rect')
      .attr('x', 0).attr('y', (bh - barH) / 2).attr('height', barH).attr('rx', 1)
      .attr('width', isFirst ? 0 : d => x(d.value))
      .attr('fill', colorOf)
      .style('cursor', 'pointer')
      .on('mouseover', onHover)
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', () => tip.hide());

    const pcts = rows.append('text')
      .attr('x', isFirst ? 0 : d => x(d.value)).attr('y', bh / 2)
      .attr('dy', '0.35em').attr('dx', 8)
      .style('font-size', '12px').style('font-weight', '700')
      .style('fill', C.text).style('opacity', isFirst ? 0 : 1)
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
// TEMAS POR CIUDAD — Horizontal bar chart
// ═══════════════════════════════════════════════════════════════

function initTemasBarCity(containerId, csv, city, cityColor) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const cityRows = csv.filter(r => r.ciudad === city);
  const total    = cityRows.length;
  const counts   = new Map();
  cityRows.forEach(r => {
    const t = (r.tema || '').trim();
    if (t) counts.set(t, (counts.get(t) || 0) + 1);
  });

  const data   = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, pct: value / total * 100 }));
  const maxPct = d3.max(data, d => d.pct);

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const onHover = (event, d) => tip.show(
      `<span class="tt-title">${d.label}</span><strong>${fmtN(d.value)}</strong> leyes · ${d.pct.toFixed(1)}%`,
      event.clientX, event.clientY
    );

    // ── MOBILE ───────────────────────────────────────────────
    if (isMobile) {
      const rowH   = 52;
      const padX   = 4;
      const barH   = 15;
      const labelH = 18;
      const pctW   = 56;
      const w      = totalW - padX * 2 - pctW;
      const axisH  = 22;
      const totalH = data.length * rowH + 6 + axisH;

      const x = d3.scaleLinear().domain([0, maxPct * 1.2]).range([0, w]);

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', totalH)
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const rows = svg.selectAll('.tema-row').data(data).enter().append('g')
        .attr('class', 'tema-row')
        .attr('transform', (_, i) => `translate(${padX},${6 + i * rowH})`);

      rows.append('text')
        .attr('x', 0).attr('y', labelH / 2).attr('dy', '0.35em')
        .style('font-size', '12px').style('font-weight', '500').style('fill', C.text)
        .text(d => {
          const maxCh = Math.floor(w / 6.8);
          return d.label.length > maxCh ? d.label.slice(0, maxCh - 1) + '…' : d.label;
        });

      const bars = rows.append('rect')
        .attr('x', 0).attr('y', labelH + 4).attr('height', barH).attr('rx', 1)
        .attr('width', isFirst ? 0 : d => x(d.pct))
        .attr('fill', cityColor)
        .style('cursor', 'pointer')
        .on('mouseover', onHover)
        .on('mousemove', e => tip.move(e.clientX, e.clientY))
        .on('mouseout', () => tip.hide());

      const pcts = rows.append('text')
        .attr('x', isFirst ? 2 : d => x(d.pct) + 5)
        .attr('y', labelH + 4 + barH / 2).attr('dy', '0.35em')
        .style('font-size', '12px').style('font-weight', '700')
        .style('fill', C.text).style('opacity', isFirst ? 0 : 1)
        .text(d => `${d.pct.toFixed(1)}%`);

      if (isFirst) {
        onVisibleOnce(el, () => {
          bars.transition().duration(900).delay((_, i) => i * 45).ease(d3.easeCubicOut)
            .attr('width', d => x(d.pct));
          pcts.transition().duration(400).delay((_, i) => i * 45 + 720)
            .attr('x', d => x(d.pct) + 5).style('opacity', 1);
        }, { threshold: 0.2 });
      }
      return;
    }

    // ── DESKTOP ───────────────────────────────────────────────
    const labelW = Math.min(Math.max(totalW * 0.38, 200), 320);
    const margin = { top: 16, right: 68, bottom: 28, left: labelW };
    const rowH   = 34;
    const barH   = 16;
    const chartH = data.length * rowH;
    const totalH = chartH + margin.top + margin.bottom;
    const w      = totalW - margin.left - margin.right;

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', totalH)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, maxPct * 1.18]).range([0, w]);
    const y = d3.scaleBand().domain(data.map((_, i) => i))
      .range([0, chartH]).padding(0.26);
    const bh = y.bandwidth();

    // Grid lines
    x.ticks(5).forEach(tick => {
      g.append('line')
        .attr('x1', x(tick)).attr('y1', 0).attr('x2', x(tick)).attr('y2', chartH)
        .attr('stroke', tick === 0 ? C.text : C.border);
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d % 1 === 0 ? d : d.toFixed(1)}%`).tickSize(0).tickPadding(8))
      .call(gr => styleAxis(gr, 11));

    const rows = g.selectAll('.tema-row').data(data).enter().append('g')
      .attr('class', 'tema-row').attr('transform', (_, i) => `translate(0,${y(i)})`);

    rows.append('text')
      .attr('x', -8).attr('y', bh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .style('font-size', '13px').style('fill', C.text)
      .text(d => d.label.length > 42 ? d.label.slice(0, 42) + '…' : d.label);

    const bars = rows.append('rect')
      .attr('x', 0).attr('y', (bh - barH) / 2).attr('height', barH).attr('rx', 1)
      .attr('width', isFirst ? 0 : d => x(d.pct))
      .attr('fill', cityColor)
      .style('cursor', 'pointer')
      .on('mouseover', onHover)
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', () => tip.hide());

    const pcts = rows.append('text')
      .attr('x', isFirst ? 0 : d => x(d.pct))
      .attr('y', bh / 2).attr('dy', '0.35em').attr('dx', 7)
      .style('font-size', '12px').style('font-weight', '700')
      .style('fill', C.text).style('opacity', isFirst ? 0 : 1)
      .text(d => `${d.pct.toFixed(1)}%`);

    if (isFirst) {
      onVisibleOnce(el, () => {
        bars.transition().duration(900).delay((_, i) => i * 48).ease(d3.easeCubicOut)
          .attr('width', d => x(d.pct));
        pcts.transition().duration(400).delay((_, i) => i * 48 + 720)
          .attr('x', d => x(d.pct)).style('opacity', 1);
      }, { threshold: 0.2 });
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// SUBTEMAS — Bubble pack jerárquico por ciudad
// ═══════════════════════════════════════════════════════════════

function wrapCircleText(textEl, text, r, fontSize) {
  const words  = text.split(/\s+/);
  const cw     = fontSize * 0.54;
  const maxW   = r * 1.7;
  const lineH  = fontSize * 1.28;
  const maxLn  = Math.max(1, Math.floor(r * 1.6 / lineH));

  const lines = [];
  let cur = [];
  words.forEach(w => {
    const test = [...cur, w].join(' ');
    if (test.length * cw > maxW && cur.length) {
      lines.push(cur.join(' '));
      cur = [w];
    } else {
      cur.push(w);
    }
  });
  if (cur.length) lines.push(cur.join(' '));

  const shown  = lines.slice(0, maxLn);
  const startY = -((shown.length - 1) * lineH) / 2;
  shown.forEach((line, i) => {
    textEl.append('tspan')
      .attr('x', textEl.attr('x'))
      .attr('dy', i === 0 ? startY : lineH)
      .text(line);
  });
}

function initSubtemasHierarchy(containerId, csv, city, excludeTemas = []) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const data = buildSubtemasHierarchy(csv, city, excludeTemas);

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const S   = Math.min(totalW, isMobile ? 400 : 580);
    const pad = 6;

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', S)
      .attr('viewBox', `0 0 ${S} ${S}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    d3.pack()
      .size([S - pad * 2, S - pad * 2])
      .padding(d => d.depth === 0 ? 10 : 4)
      (root);

    const g = svg.append('g').attr('transform', `translate(${pad},${pad})`);
    const tColor = node => TEMA_COLOR[(node.depth === 1 ? node : node.parent).data.name] || C.muted;

    const temaNodes = root.descendants().filter(d => d.depth === 1);
    const subNodes  = root.descendants().filter(d => d.depth === 2);

    // ── Tema wrapper rings ────────────────────────────────────
    g.selectAll('.t-ring').data(temaNodes).enter().append('circle')
      .attr('class', 't-ring')
      .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)
      .attr('fill', d => tColor(d) + '14')
      .attr('stroke', d => tColor(d))
      .attr('stroke-width', 1.2).attr('stroke-opacity', 0.9);

    // ── Tema name labels (top inside ring) ────────────────────
    g.selectAll('.t-lbl').data(temaNodes.filter(d => d.r > 28)).enter().append('text')
      .attr('class', 't-lbl')
      .attr('x', d => d.x)
      .attr('y', d => d.y - d.r + Math.min(13, d.r * 0.2))
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .style('font-size', d => `${Math.min(10, Math.max(7, d.r * 0.17))}px`)
      .style('font-weight', '800').style('letter-spacing', '0.07em')
      .style('text-transform', 'uppercase')
      .style('fill', d => inkOf(tColor(d))).style('pointer-events', 'none')
      .text(d => {
        const n = d.data.name;
        const maxCh = Math.floor(d.r * 0.38);
        return n.length > maxCh ? n.slice(0, maxCh - 1) + '…' : n;
      });

    // ── Subtema filled circles ────────────────────────────────
    const subCircles = g.selectAll('.s-circle').data(subNodes).enter().append('circle')
      .attr('class', 's-circle')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r', isFirst ? 0 : d => d.r)
      .attr('fill', d => tColor(d))
      .attr('stroke', '#fff').attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('stroke', C.text).attr('stroke-width', 1.5);
        tip.show(
          `<span class="tt-title">${d.data.name}</span>${dot(tColor(d))}<span>${d.parent.data.name}</span><br><strong>${fmtN(d.data.value)}</strong> leyes · ${d.data.pct.toFixed(1)}%`,
          event.clientX, event.clientY
        );
      })
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', event => { d3.select(event.currentTarget).attr('stroke', '#fff').attr('stroke-width', 1); tip.hide(); });

    // ── Text labels inside subtema circles ────────────────────
    const MIN_R = isMobile ? 22 : 18;
    subNodes.filter(d => d.r >= MIN_R).forEach(d => {
      const fs = Math.min(11, Math.max(7.5, d.r * 0.25));
      const t  = g.append('text')
        .attr('x', d.x).attr('y', d.y)
        .attr('text-anchor', 'middle')
        .style('font-size', `${fs}px`).style('font-weight', '600')
        .style('fill', inkOn(tColor(d))).style('pointer-events', 'none');
      wrapCircleText(t, d.data.name, d.r, fs);
    });

    if (isFirst) {
      onVisibleOnce(el, () => {
        subCircles.transition().duration(650)
          .delay((_, i) => i * 40)
          .ease(d3.easeCubicOut)
          .attr('r', d => d.r);
      }, { threshold: 0.2 });
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// CHOROPLETH — Leyes por distrito urbano (D3 SVG)
// ═══════════════════════════════════════════════════════════════

function initChoropleth(containerId, districtGeo, lawGeo, city, cityColor, labelFn, subLabelFn) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Puntos georreferenciados de esta ciudad
  const pts = lawGeo.features.filter(f => f.geometry && f.properties.ciudad === city);

  // Conteo punto-en-polígono
  districtGeo.features.forEach(feat => {
    feat.properties._count = pts.filter(f =>
      d3.geoContains(feat, f.geometry.coordinates)
    ).length;
  });

  const maxCount = d3.max(districtGeo.features, f => f.properties._count) || 1;
  const lightColor = d3.interpolate('#F4F4F4', cityColor)(0.12);

  responsiveChart(el, (totalW, isMobile, isFirst) => {
    const legendH = 36;
    const pad     = isMobile ? 12 : 20;
    const mapH    = isMobile ? 300 : 420;
    const totalH  = mapH + legendH;

    const projection = d3.geoIdentity()
      .reflectY(true)
      .fitExtent([[pad, pad], [totalW - pad, mapH - pad]], districtGeo);
    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleSequentialSqrt()
      .domain([0, maxCount])
      .interpolator(d3.interpolate(lightColor, cityColor));

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', totalH)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const mapG = svg.append('g');
    if (isFirst) mapG.attr('opacity', 0);

    // ── Distritos ────────────────────────────────────────────
    mapG.selectAll('path')
      .data(districtGeo.features)
      .enter().append('path')
      .attr('d', path)
      .attr('fill', d => d.properties._count > 0 ? colorScale(d.properties._count) : '#EDEDED')
      .attr('stroke', 'white')
      .attr('stroke-width', isMobile ? 0.6 : 0.9)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('stroke', C.text).attr('stroke-width', 1.8).raise();
        const sub = subLabelFn(d.properties);
        tip.show(
          `<span class="tt-title">${labelFn(d.properties)}</span>${sub ? `<span>${sub}</span><br>` : ''}<strong>${fmtN(d.properties._count)}</strong> leyes`,
          event.clientX, event.clientY
        );
      })
      .on('mousemove', e => tip.move(e.clientX, e.clientY))
      .on('mouseout', event => {
        d3.select(event.currentTarget)
          .attr('stroke', 'white')
          .attr('stroke-width', isMobile ? 0.6 : 0.9);
        tip.hide();
      });

    // ── Etiquetas de número de distrito ──────────────────────
    districtGeo.features.forEach(feat => {
      const [cx, cy] = path.centroid(feat);
      if (isNaN(cx) || isNaN(cy)) return;
      const area = path.area(feat);
      if (area < (isMobile ? 300 : 500)) return;
      const fillC = feat.properties._count > 0 ? colorScale(feat.properties._count) : '#EDEDED';
      mapG.append('text')
        .attr('x', cx).attr('y', cy)
        .attr('text-anchor', 'middle').attr('dy', '0.35em')
        .style('font-size', isMobile ? '8px' : '10px')
        .style('font-weight', '700')
        .style('fill', inkOn(fillC) === C.text ? C.muted : 'rgba(255,255,255,0.92)')
        .style('pointer-events', 'none')
        .text(labelFn(feat.properties).replace('Distrito ', ''));
    });

    // ── Leyenda (gradiente) ───────────────────────────────────
    const lW   = isMobile ? 130 : 180;
    const lH   = 8;
    const lX   = totalW - lW - pad;
    const lY   = mapH + 14;
    const gId  = `cgrad-${containerId}`;

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', gId);
    grad.append('stop').attr('offset', '0%').attr('stop-color', lightColor);
    grad.append('stop').attr('offset', '100%').attr('stop-color', cityColor);

    svg.append('rect')
      .attr('x', lX).attr('y', lY)
      .attr('width', lW).attr('height', lH)
      .attr('fill', `url(#${gId})`);

    const lblStyle = sel => sel
      .style('font-size', '11px').style('fill', C.light);

    svg.append('text').attr('x', lX).attr('y', lY - 4)
      .call(lblStyle).text('0 leyes');
    svg.append('text').attr('x', lX + lW).attr('y', lY - 4)
      .attr('text-anchor', 'end')
      .call(lblStyle).text(`${fmtN(maxCount)} leyes`);

    // ── Animación de entrada ──────────────────────────────────
    if (isFirst) {
      onVisibleOnce(el, () => {
        mapG.transition().duration(700).ease(d3.easeCubicOut).attr('opacity', 1);
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
  const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
  const map = L.map(el, {
    scrollWheelZoom: false,
    touchZoom:       false,   // evita que el pellizco quede atrapado en el mapa en mobile
    dragging:        !isTouchPrimary, // deshabilita drag solo en dispositivos táctiles reales
    zoomControl: true,
    attributionControl: true,
  });

  // Tiles Esri World Light Gray — fondo gris claro y mínimo, sin API key
  // (CARTO basemaps ahora responde "API KEY REQUIRED" a peticiones anónimas)
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
  L.tileLayer(`${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
    attribution: 'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxNativeZoom: 16,
    maxZoom: 19,
  }).addTo(map);
  L.tileLayer(`${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
    maxNativeZoom: 16,
    maxZoom: 19,
    opacity: 0.8,
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
      color: '#FFFFFF',
      weight: 1,
      fillOpacity: 0.9,
    }).addTo(map);

    marker
      .on('mouseover', function(e) {
        this.setStyle({ fillOpacity: 1, weight: 2, color: C.text });
        this.bringToFront();
        tip.show(
          `<span class="tt-title">Ley ${p.ley}</span>${dot(color)}<span>${p.tema}</span>
           <span class="tt-note">${(p.resumen || '').slice(0, 110)}…</span>`,
          e.originalEvent.clientX, e.originalEvent.clientY
        );
      })
      .on('mousemove', e => tip.move(e.originalEvent.clientX, e.originalEvent.clientY))
      .on('mouseout', function() {
        this.setStyle({ fillOpacity: 0.9, weight: 1, color: '#FFFFFF' });
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
      background: 'rgba(255,255,255,0.95)',
      padding: '8px 12px',
      borderRadius: '2px',
      border: '1px solid #E6E6E6',
      fontFamily: "'Libre Franklin', Helvetica, Arial, sans-serif",
      fontSize: '11.5px',
      lineHeight: '1.85',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      maxWidth: '220px',
    });
    presentTemas.forEach(tema => {
      const col   = TEMA_COLOR[tema] || C.muted;
      const label = tema.length > 32 ? tema.slice(0, 32) + '…' : tema;
      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;display:inline-block;"></span>
          <span style="color:#282828;">${label}</span>
        </div>`;
    });
    return div;
  };
  Legend.addTo(map);
}
