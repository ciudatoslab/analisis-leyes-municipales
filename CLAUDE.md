# Trufi App — Artículo de movilidad Cochabamba 2025

## Proyecto
Artículo de periodismo de datos sobre 2.7M búsquedas de ruta en Trufi App, Cochabamba 2025.
Visualizaciones con D3.js v7 (cargado como global desde CDN), tema oscuro.

## Estructura
- `index.html` — artículo principal
- `js/trufi-main.js` — todas las visualizaciones (módulo ES)
- `js/charts/` — componentes reutilizables de gráficas
- `css/styles.css` — estilos base
- `data/` — todos los datos (CSV, GeoJSON)

## Datos GeoJSON
- `data/distritos_merged.geojson` — 14 distritos de Cochabamba ciudad
  - bounds lon: -66.249562 a -66.085638, lat: -17.503806 a -17.325910
  - propiedades: `distrito`, `viajes_origen`, `viajes_destino`, `balance`
- `data/municipios_merged.geojson` — 6 municipios del área metropolitana
  - bounds lon: -66.460660 a -65.792930, lat: -17.525785 a -17.045002
  - propiedades: `Municipality`, `viajes_origen`, `viajes_destino`, `balance`, `total`
- `data/od_flows.geojson` — flujos origen-destino entre distritos
- `data/od_municipios.geojson` — flujos origen-destino entre municipios

## LECCIÓN CRÍTICA: Cómo renderizar GeoJSON con D3

### ✅ LO QUE FUNCIONA — usar siempre esto:
```js
const projection = d3.geoIdentity()
  .reflectY(true)
  .fitExtent([[pad, pad], [width - pad, height - pad]], geojsonData);
const path = d3.geoPath().projection(projection);
```

### ❌ LO QUE NO FUNCIONA — nunca usar esto con fitSize/fitExtent:
```js
// ROTO: geoMercator genera un rectángulo de clip que interfiere con fitSize/fitExtent
const projection = d3.geoMercator().fitSize([width, height], data);     // ❌
const projection = d3.geoMercator().fitExtent([[p,p],[w,h]], data);     // ❌
```

