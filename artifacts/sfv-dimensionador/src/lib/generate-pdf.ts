import { SFVResultado } from "@workspace/api-client-react";

function row(label: string, value: string | number) {
  return `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>`;
}

function section(title: string, rows: string) {
  return `
    <div class="section">
      <h2>${title}</h2>
      <table>${rows}</table>
    </div>`;
}

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(Math.abs(n) < 10 ? 2 : 0);
}

function niceTicks(minV: number, maxV: number, count = 5): number[] {
  const range = maxV - minV || 1;
  const rawStep = range / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const niceStep = Math.ceil(rawStep / mag) * mag;
  const start = Math.floor(minV / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let i = 0; i < count + 2; i++) {
    const t = start + i * niceStep;
    if (t < minV - niceStep * 0.1) continue;
    if (t > maxV + niceStep * 0.1) break;
    ticks.push(t);
  }
  return ticks;
}

function svgBarChart(
  values: number[],
  color: string,
  unit: string,
  title: string
): string {
  const W = 680, H = 260, PL = 68, PR = 20, PT = 20, PB = 36;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const maxV = Math.max(...values, 0.001);
  const minV = 0;
  const ticks = niceTicks(minV, maxV, 6);
  const effectiveMin = ticks[0];
  const effectiveMax = ticks[ticks.length - 1];
  const range = effectiveMax - effectiveMin || 1;
  const n = values.length;
  const barW = chartW / n;

  const toY = (v: number) => PT + chartH - ((v - effectiveMin) / range) * chartH;

  const gridLines = ticks.map(t => {
    const y = toY(t).toFixed(1);
    const lbl = fmtNum(t);
    return `
      <line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="${t === 0 ? '#94a3b8' : '#e2e8f0'}" stroke-width="${t === 0 ? 1.5 : 1}"/>
      <text x="${(PL - 6).toFixed(1)}" y="${y}" dominant-baseline="middle" text-anchor="end" font-size="10" fill="#64748b">${lbl}</text>`;
  }).join("");

  const bars = values.map((v, i) => {
    const x = (PL + i * barW + 2).toFixed(1);
    const bh = Math.max(((v - effectiveMin) / range) * chartH, 0).toFixed(1);
    const y = toY(v).toFixed(1);
    return `<rect x="${x}" y="${y}" width="${Math.max(barW - 4, 1).toFixed(1)}" height="${bh}" fill="${color}" rx="2"/>`;
  }).join("");

  const xLabels = values.map((_, i) => {
    const year = i + 1;
    if (year !== 1 && year % 5 !== 0) return "";
    const x = (PL + (i + 0.5) * barW).toFixed(1);
    return `<text x="${x}" y="${(H - PB + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#64748b">${year}</text>`;
  }).join("");

  const axisLabel = `<text x="${(PL + chartW / 2).toFixed(0)}" y="${H}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">Año</text>`;
  const unitLabel = `<text x="${(PL - 48).toFixed(0)}" y="${(PT + chartH / 2).toFixed(0)}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600" transform="rotate(-90,${(PL - 48).toFixed(0)},${(PT + chartH / 2).toFixed(0)})">${unit}</text>`;

  return `
    <p class="chart-title">${title}</p>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${PL}" y="${PT}" width="${chartW}" height="${chartH}" fill="#f8fafc" rx="2"/>
      ${gridLines}
      ${bars}
      ${xLabels}
      ${axisLabel}${unitLabel}
    </svg>`;
}

function svgLineChart(
  values: number[],
  color: string,
  unit: string,
  title: string,
  refY?: number | null,
  refLabel?: string
): string {
  const W = 680, H = 260, PL = 72, PR = 20, PT = 20, PB = 36;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const ticks = niceTicks(minRaw, maxRaw, 6);
  const effectiveMin = ticks[0];
  const effectiveMax = ticks[ticks.length - 1];
  const range = effectiveMax - effectiveMin || 1;
  const n = values.length;
  const stepX = chartW / Math.max(n - 1, 1);

  const toX = (i: number) => PL + i * stepX;
  const toY = (v: number) => PT + chartH - ((v - effectiveMin) / range) * chartH;

  const gridLines = ticks.map(t => {
    const y = toY(t).toFixed(1);
    const lbl = fmtNum(t);
    return `
      <line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="${t === 0 ? '#94a3b8' : '#e2e8f0'}" stroke-width="${t === 0 ? 1.5 : 1}"/>
      <text x="${(PL - 6).toFixed(1)}" y="${y}" dominant-baseline="middle" text-anchor="end" font-size="10" fill="#64748b">${lbl}</text>`;
  }).join("");

  const points = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaBottom = toY(Math.max(effectiveMin, 0)).toFixed(1);
  const areaPoints = [
    `${toX(0).toFixed(1)},${areaBottom}`,
    ...values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
    `${toX(n - 1).toFixed(1)},${areaBottom}`,
  ].join(" ");

  const xLabels = values.map((_, i) => {
    const year = i + 1;
    if (year !== 1 && year % 5 !== 0 && i !== n - 1) return "";
    return `<text x="${toX(i).toFixed(1)}" y="${(H - PB + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#64748b">${year}</text>`;
  }).join("");

  let refLine = "";
  if (refY !== null && refY !== undefined) {
    const ry = toY(refY).toFixed(1);
    refLine = `<line x1="${PL}" y1="${ry}" x2="${W - PR}" y2="${ry}" stroke="#7c3aed" stroke-width="2" stroke-dasharray="7,4"/>`;
    if (refLabel) {
      refLine += `<text x="${(PL + 6).toFixed(1)}" y="${(parseFloat(ry) - 5).toFixed(1)}" font-size="10" fill="#7c3aed" font-weight="700">${refLabel}</text>`;
    }
  }

  const axisLabel = `<text x="${(PL + chartW / 2).toFixed(0)}" y="${H}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">Año</text>`;
  const unitLabel = `<text x="${(PL - 52).toFixed(0)}" y="${(PT + chartH / 2).toFixed(0)}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600" transform="rotate(-90,${(PL - 52).toFixed(0)},${(PT + chartH / 2).toFixed(0)})">${unit}</text>`;

  return `
    <p class="chart-title">${title}</p>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${PL}" y="${PT}" width="${chartW}" height="${chartH}" fill="#f8fafc" rx="2"/>
      ${gridLines}
      ${refLine}
      <polygon points="${areaPoints}" fill="${color}" opacity="0.10"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${xLabels}
      ${axisLabel}${unitLabel}
    </svg>`;
}

function dataTable25(
  headers: string[],
  rows: string[][]
): string {
  const half = Math.ceil(rows.length / 2);
  const left = rows.slice(0, half);
  const right = rows.slice(half);

  const buildBlock = (block: string[][]) =>
    block.map(r =>
      `<tr>${r.map((c, ci) => `<td class="${ci === 0 ? 'dt-year' : 'dt-val'}">${c}</td>`).join("")}</tr>`
    ).join("");

  const thRow = headers.map(h => `<th>${h}</th>`).join("");

  return `
    <div class="dt-wrap">
      <table class="dt-table">
        <thead><tr>${thRow}</tr></thead>
        <tbody>${buildBlock(left)}</tbody>
      </table>
      <table class="dt-table">
        <thead><tr>${thRow}</tr></thead>
        <tbody>${buildBlock(right)}</tbody>
      </table>
    </div>`;
}

export function generatePDF(data: SFVResultado) {
  const now = new Date().toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  const paneles = data.paneles;
  const baterias = data.baterias;
  const ambiental = data.ambiental;
  const eco = data.economico;
  const isBombeo = !!data.bomba;

  const panelesRows = [
    row("Total de paneles", paneles.totalPaneles),
    row("Paneles en serie", paneles.panelesSerie),
    row("Paneles en paralelo", paneles.panelesParalelo),
    row("Voltaje del sistema", `${paneles.voltajeSistema.toFixed(2)} V`),
    row("Corriente del sistema", `${paneles.corrienteSistema.toFixed(2)} A`),
  ].join("");

  const bateriasRows = baterias ? [
    row("Total de baterías", baterias.totalBaterias),
    row("Baterías en serie", baterias.bateriasSerie),
    row("Baterías en paralelo", baterias.bateriasParalelo),
    row("Voltaje de batería", `${baterias.voltajeBateria} V`),
    row("Capacidad del banco (Cn)", `${baterias.capacidadNominal.toFixed(2)} Ah`),
    row("Profundidad de descarga (DoD)", `${(baterias.dod * 100).toFixed(0)}%`),
  ].join("") : "";

  const electricosRows = [
    data.inversor ? row("Corriente mínima inversor", `${data.inversor.corrienteMinima.toFixed(2)} A`) : "",
    data.regulador ? row("Corriente mínima regulador", `${data.regulador.corrienteMinima.toFixed(2)} A`) : "",
    row("Corriente mínima cableado", `${data.cableado.corrienteMinima.toFixed(2)} A`),
    data.protecciones?.corrienteFusible !== undefined ? row("Corriente fusible CC", `${data.protecciones.corrienteFusible.toFixed(2)} A`) : "",
    data.protecciones?.breakerCC !== undefined ? row("Breaker CC", `${data.protecciones.breakerCC.toFixed(2)} A`) : "",
    data.protecciones?.seccionadorVoltaje !== undefined ? row("Interruptor seccionador", `${data.protecciones.seccionadorVoltaje.toFixed(2)} V / ${data.protecciones.seccionadorCorriente?.toFixed(2)} A`) : "",
    data.protecciones?.sobretensionesVoltaje !== undefined ? row("Protector sobretensiones", `${data.protecciones.sobretensionesVoltaje.toFixed(2)} V`) : "",
    data.protecciones?.termomagneticoCorriente !== undefined ? row("Termomagnético CA", `${data.protecciones.termomagneticoCorriente.toFixed(2)} A`) : "",
  ].join("");

  const bombaRows = data.bomba ? [
    row("Potencia hidráulica (P_h)", `${data.bomba.potenciaHidraulicaW.toFixed(2)} W`),
    row("Potencia eléctrica (P_e)", `${data.bomba.potenciaKw.toFixed(3)} kW`),
    row("Potencia nominal requerida", `${data.bomba.potenciaHP.toFixed(3)} HP`),
    row("Caudal (Q)", `${(data.bomba.caudalM3s * 1000).toFixed(4)} L/s  |  ${(data.bomba.caudalM3s * 3600).toFixed(3)} m³/h`),
    ...(data.variador ? [
      row("I_max controlador/variador", `${data.variador.corrienteMaxima.toFixed(2)} A`),
      ...((data.variador as any).tipo ? [row("Variador requerido", (data.variador as any).tipo)] : []),
      ...((data.variador as any).compatible === false ? [row("⚠ Compatibilidad variador", "Voc fuera del rango — revisar configuración de paneles")] : []),
    ] : []),
  ].join("") : "";

  const ambientalRows = [
    row("Energía anual (1er año)", `${ambiental.energiaAnualKwh.toFixed(2)} kWh`),
    row("Ahorro CO₂ (1er año)", `${ambiental.ahorroCo2PrimerAnio.toFixed(2)} kg CO₂`),
    row("Ahorro CO₂ total (25 años)", `${ambiental.ahorroCo2TotalTon.toFixed(3)} Ton CO₂`),
  ].join("");

  const economicoRows = eco ? [
    row("Inversión total del sistema", `$${eco.costoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`),
    eco.precioKwh !== undefined ? row("Precio electricidad", `$${eco.precioKwh.toFixed(4)} / kWh`) : "",
    row("Ahorro estimado (1er año)", `$${eco.ahorroPrimerAnio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`),
    row("Ahorro total (25 años)", `$${eco.ahorroTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`),
    row("Período de recuperación (payback)", eco.payback !== null ? `Año ${eco.payback}` : "No se recupera en la vida útil"),
  ].join("") : "";

  // ─── Chart: CO2 ───────────────────────────────────────────
  const chartCo2 = svgBarChart(
    ambiental.vectorAhorrosCo2,
    "#16a34a",
    "kg CO₂",
    "Ahorro de CO₂ por Año"
  );
  const tableCo2 = dataTable25(
    ["Año", "Ahorro CO₂ (kg)"],
    ambiental.vectorAhorrosCo2.map((v, i) => [`${i + 1}`, v.toFixed(2)])
  );

  // ─── Chart: Energy degradation ────────────────────────────
  const chartEnergia = svgLineChart(
    ambiental.vectorDegradacion,
    "#0ea5e9",
    "kWh/año",
    "Energía Generada con Degradación"
  );
  const tableEnergia = dataTable25(
    ["Año", "Energía (kWh)"],
    ambiental.vectorDegradacion.map((v, i) => [`${i + 1}`, v.toFixed(2)])
  );

  // ─── Chart: Cash flow (if economic analysis) ───────────────
  const chartFlujo = eco ? svgLineChart(
    eco.flujoCaja,
    "#f97316",
    "MXN",
    "Flujo de Caja Acumulado",
    0,
    "Punto de equilibrio"
  ) : "";
  const tableFlujo = eco ? dataTable25(
    ["Año", "Flujo acum. ($MXN)", "Ahorro ($MXN)"],
    eco.flujoCaja.map((v, i) => [
      `${i + 1}`,
      v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (eco.vectorAhorros?.[i] ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ])
  ) : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Dimensionamiento SFV</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #fff;
    }
    /* ── Cover ── */
    .cover {
      padding: 56px 60px 40px;
      border-bottom: 4px solid #f97316;
    }
    .cover-logo {
      display: flex; align-items: center; gap: 10px; margin-bottom: 40px;
    }
    .cover-logo .dot {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #f97316, #f59e0b);
      border-radius: 8px;
    }
    .cover-logo span {
      font-size: 18px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;
    }
    .cover-logo span em { font-style: normal; color: #f97316; }
    h1 {
      font-size: 28px; font-weight: 900; color: #0f172a;
      line-height: 1.2; margin-bottom: 8px;
    }
    .subtitle { font-size: 13px; color: #64748b; margin-bottom: 32px; }
    .summary-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px;
    }
    .summary-card {
      border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px;
    }
    .summary-card .card-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 6px;
    }
    .summary-card .card-value {
      font-size: 22px; font-weight: 900; color: #0f172a;
    }
    .summary-card .card-unit {
      font-size: 11px; color: #64748b; margin-left: 2px; font-weight: 600;
    }
    /* ── Content ── */
    .content { padding: 32px 60px 60px; }
    .section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    h2 {
      font-size: 13px; font-weight: 800; color: #f97316;
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 10px; padding-bottom: 6px;
      border-bottom: 2px solid #fed7aa;
    }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) td { background: #f8fafc; }
    td { padding: 7px 12px; border: 1px solid #e2e8f0; }
    td.label { color: #475569; font-weight: 600; width: 55%; }
    td.value { color: #0f172a; font-weight: 700; text-align: right; }
    th {
      padding: 7px 12px; background: #fff7ed; color: #9a3412;
      font-weight: 700; font-size: 11px; text-transform: uppercase;
      text-align: left; border: 1px solid #fed7aa;
    }
    /* ── Chart pages ── */
    .chart-page {
      page-break-before: always;
      padding: 40px 60px;
    }
    .chart-page:first-of-type {
      page-break-before: auto;
    }
    .chart-page h2 {
      font-size: 14px; margin-bottom: 18px;
    }
    .chart-title {
      font-size: 11px; font-weight: 700; color: #475569;
      text-transform: uppercase; letter-spacing: 0.6px;
      margin-bottom: 8px; margin-top: 0;
    }
    /* ── Data tables (side-by-side columns) ── */
    .dt-section-title {
      font-size: 11px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-top: 28px; margin-bottom: 10px;
      padding-top: 16px;
      border-top: 1.5px solid #e2e8f0;
    }
    .dt-wrap {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .dt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .dt-table thead th {
      padding: 6px 10px;
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-size: 10px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .dt-table td {
      padding: 5px 10px;
      border: 1px solid #e2e8f0;
    }
    .dt-table tr:nth-child(even) td { background: #f8fafc; }
    .dt-table td.dt-year {
      color: #64748b; font-weight: 600; width: 30%;
    }
    .dt-table td.dt-val {
      color: #0f172a; font-weight: 700; text-align: right;
    }
    /* ── Footer ── */
    .footer {
      margin-top: 40px; padding-top: 16px;
      border-top: 1.5px solid #e2e8f0;
      font-size: 10px; color: #94a3b8;
      display: flex; justify-content: space-between;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cover { padding: 40px 48px 32px; }
      .content { padding: 24px 48px 40px; }
      .chart-page { padding: 32px 48px; }
    }
  </style>
</head>
<body>
  <!-- ─── PORTADA ─── -->
  <div class="cover">
    <div class="cover-logo">
      <div class="dot"></div>
      <span>Dimensionador<em>SFV</em></span>
    </div>
    <h1>Reporte de Dimensionamiento<br>Fotovoltaico</h1>
    <p class="subtitle">Generado el ${now} — Sistema ${isBombeo ? "Bombeo Solar" : data.baterias ? "Aislado" : "Interconectado a Red"}</p>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="card-label">Energía diaria</div>
        <div class="card-value">${data.energiaDiariaKwh.toFixed(2)}<span class="card-unit">kWh/día</span></div>
      </div>
      <div class="summary-card">
        <div class="card-label">Potencia demandada</div>
        <div class="card-value">${data.potenciaDemandaKw.toFixed(2)}<span class="card-unit">kW</span></div>
      </div>
      <div class="summary-card">
        <div class="card-label">Total paneles</div>
        <div class="card-value">${paneles.totalPaneles}<span class="card-unit">módulos</span></div>
      </div>
      ${baterias ? `
      <div class="summary-card">
        <div class="card-label">Total baterías</div>
        <div class="card-value">${baterias.totalBaterias}<span class="card-unit">unidades</span></div>
      </div>` : ""}
      ${eco ? `
      <div class="summary-card">
        <div class="card-label">Inversión total</div>
        <div class="card-value" style="font-size:17px">$${eco.costoTotal.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</div>
      </div>
      <div class="summary-card">
        <div class="card-label">Payback</div>
        <div class="card-value">${eco.payback !== null ? eco.payback : "—"}<span class="card-unit">${eco.payback !== null ? "años" : "N/A"}</span></div>
      </div>` : `
      <div class="summary-card">
        <div class="card-label">Ahorro CO₂ (Año 1)</div>
        <div class="card-value">${ambiental.ahorroCo2PrimerAnio.toFixed(1)}<span class="card-unit">kg CO₂</span></div>
      </div>
      <div class="summary-card">
        <div class="card-label">Ahorro CO₂ (25 Años)</div>
        <div class="card-value">${ambiental.ahorroCo2TotalTon.toFixed(2)}<span class="card-unit">Ton</span></div>
      </div>`}
    </div>
  </div>

  <!-- ─── DATOS TÉCNICOS ─── -->
  <div class="content">
    ${section("Arreglo Fotovoltaico (Paneles)", panelesRows)}
    ${baterias ? section("Banco de Baterías", bateriasRows) : ""}
    ${bombaRows ? section("Bomba y Variador de Frecuencia", bombaRows) : ""}
    ${section("Componentes Eléctricos", electricosRows)}
    ${section("Análisis Ambiental — Resumen", ambientalRows)}
    ${eco ? section("Análisis Económico — Resumen", economicoRows) : ""}

    <div class="footer">
      <span>DimensionadorSFV — Herramienta de dimensionamiento de sistemas fotovoltaicos</span>
      <span>Reporte generado: ${now}</span>
    </div>
  </div>

  <!-- ─── PÁGINA: GRÁFICA CO₂ ─── -->
  <div class="chart-page">
    <h2>Gráfica 1 — Ahorro de CO₂ por Año</h2>
    ${chartCo2}
    <p class="dt-section-title">Datos de la Gráfica — Ahorro CO₂ (25 Años)</p>
    ${tableCo2}
  </div>

  <!-- ─── PÁGINA: GRÁFICA ENERGÍA ─── -->
  <div class="chart-page">
    <h2>Gráfica 2 — Energía Generada con Degradación</h2>
    ${chartEnergia}
    <p class="dt-section-title">Datos de la Gráfica — Energía Generada (25 Años)</p>
    ${tableEnergia}
  </div>

  ${eco ? `
  <!-- ─── PÁGINA: GRÁFICA FLUJO DE CAJA ─── -->
  <div class="chart-page">
    <h2>Gráfica 3 — Flujo de Caja Acumulado</h2>
    ${chartFlujo}
    <p class="dt-section-title">Datos de la Gráfica — Flujo de Caja Acumulado (25 Años)</p>
    ${tableFlujo}
  </div>` : ""}

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Permite las ventanas emergentes para generar el PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
