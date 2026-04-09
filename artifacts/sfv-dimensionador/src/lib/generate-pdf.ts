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

function svgBarChart(
  values: number[],
  color: string,
  unit: string,
  title: string
): string {
  const W = 520, H = 155, PL = 54, PR = 12, PT = 14, PB = 26;
  const max = Math.max(...values, 0.001);
  const n = values.length;
  const barW = (W - PL - PR) / n;
  const scaleY = (H - PT - PB) / max;

  const bars = values.map((v, i) => {
    const x = (PL + i * barW + 1.5).toFixed(1);
    const bh = Math.max(v * scaleY, 0).toFixed(1);
    const y = (H - PB - parseFloat(bh)).toFixed(1);
    return `<rect x="${x}" y="${y}" width="${Math.max(barW - 3, 1).toFixed(1)}" height="${bh}" fill="${color}" rx="2"/>`;
  }).join("");

  const yLabels = [0, 0.5, 1].map(f => {
    const val = max * f;
    const lbl = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0);
    const y = (H - PB - f * (H - PT - PB)).toFixed(1);
    return `<text x="${(PL - 4).toFixed(1)}" y="${y}" dominant-baseline="middle" text-anchor="end" font-size="9" fill="#64748b">${lbl}</text>`;
  }).join("");

  const xLabels = values.map((_, i) => {
    if ((i + 1) % 5 !== 0) return "";
    const x = (PL + (i + 0.5) * barW).toFixed(1);
    return `<text x="${x}" y="${(H - PB + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b">${i + 1}</text>`;
  }).join("");

  return `
    <div style="margin-top:20px">
      <p style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${title} — ${unit}</p>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="#e2e8f0" stroke-width="1"/>
        <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#e2e8f0" stroke-width="1"/>
        ${yLabels}${bars}${xLabels}
        <text x="${(W / 2).toFixed(0)}" y="${H}" text-anchor="middle" font-size="8" fill="#94a3b8">Año</text>
      </svg>
    </div>`;
}

function svgLineChart(
  values: number[],
  color: string,
  unit: string,
  title: string,
  refY?: number | null,
  refLabel?: string
): string {
  const W = 520, H = 155, PL = 58, PR = 16, PT = 14, PB = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  const stepX = (W - PL - PR) / Math.max(n - 1, 1);

  const toX = (i: number) => PL + i * stepX;
  const toY = (v: number) => H - PB - ((v - min) / range) * (H - PT - PB);

  const points = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPoints = [
    `${toX(0).toFixed(1)},${(H - PB).toFixed(1)}`,
    ...values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
    `${toX(n - 1).toFixed(1)},${(H - PB).toFixed(1)}`,
  ].join(" ");

  const yLabels = [0, 0.5, 1].map(f => {
    const val = min + range * f;
    const lbl = Math.abs(val) >= 10000 ? `${(val / 1000).toFixed(0)}k` :
                Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0);
    return `<text x="${(PL - 4).toFixed(1)}" y="${toY(val).toFixed(1)}" dominant-baseline="middle" text-anchor="end" font-size="9" fill="#64748b">${lbl}</text>`;
  }).join("");

  const xLabels = values.map((_, i) => {
    if ((i + 1) % 5 !== 0 && i !== n - 1) return "";
    return `<text x="${toX(i).toFixed(1)}" y="${(H - PB + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b">${i + 1}</text>`;
  }).join("");

  let refLine = "";
  if (refY !== null && refY !== undefined && min <= refY && refY <= max) {
    const ry = toY(refY).toFixed(1);
    refLine = `<line x1="${PL}" y1="${ry}" x2="${W - PR}" y2="${ry}" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="5,3"/>`;
    if (refLabel) {
      refLine += `<text x="${(PL + 4).toFixed(1)}" y="${(parseFloat(ry) - 3).toFixed(1)}" font-size="8" fill="#7c3aed">${refLabel}</text>`;
    }
  }

  return `
    <div style="margin-top:20px">
      <p style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${title} — ${unit}</p>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="#e2e8f0" stroke-width="1"/>
        <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#e2e8f0" stroke-width="1"/>
        ${refLine}
        ${yLabels}
        <polygon points="${areaPoints}" fill="${color}" opacity="0.08"/>
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${xLabels}
        <text x="${(W / 2).toFixed(0)}" y="${H}" text-anchor="middle" font-size="8" fill="#94a3b8">Año</text>
      </svg>
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
    data.protecciones ? row("Corriente fusible CC", `${data.protecciones.corrienteFusible.toFixed(2)} A`) : "",
    data.protecciones?.breakerCC !== undefined ? row("Breaker CC", `${data.protecciones.breakerCC.toFixed(2)} A`) : "",
    data.protecciones?.seccionadorVoltaje !== undefined ? row("Interruptor seccionador", `${data.protecciones.seccionadorVoltaje.toFixed(2)} V / ${data.protecciones.seccionadorCorriente?.toFixed(2)} A`) : "",
    data.protecciones?.sobretensionesVoltaje !== undefined ? row("Protector sobretensiones", `${data.protecciones.sobretensionesVoltaje.toFixed(2)} V`) : "",
    data.protecciones?.termomagneticoCorriente !== undefined ? row("Termomagnético CA", `${data.protecciones.termomagneticoCorriente.toFixed(2)} A`) : "",
  ].join("");

  const ambientalRows = [
    row("Energía anual (1er año)", `${ambiental.energiaAnualKwh.toFixed(2)} kWh`),
    row("Ahorro CO₂ (1er año)", `${ambiental.ahorroCo2PrimerAnio.toFixed(2)} kg CO₂`),
    row("Ahorro CO₂ total (25 años)", `${ambiental.ahorroCo2TotalTon.toFixed(3)} Ton CO₂`),
  ].join("");

  const economicoRows = eco ? [
    row("Inversión total del sistema", `$${eco.costoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`),
    row("Precio electricidad", `$${eco.precioKwh.toFixed(4)} / kWh`),
    row("Ahorro estimado (1er año)", `$${eco.ahorroPrimerAnio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`),
    row("Ahorro total (25 años)", `$${eco.ahorroTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`),
    row("Período de recuperación (payback)", eco.payback !== null ? `${eco.payback} años` : "No se recupera en la vida útil"),
  ].join("") : "";

  const co2Table = ambiental.vectorAhorrosCo2.slice(0, 10).map((val, i) =>
    `<tr><td class="label">Año ${i + 1}</td><td class="value">${val.toFixed(2)} kg CO₂</td><td class="value">${ambiental.vectorDegradacion[i].toFixed(2)} kWh</td></tr>`
  ).join("");

  const chartCo2 = svgBarChart(
    ambiental.vectorAhorrosCo2,
    "#16a34a",
    "kg CO₂",
    "Ahorro CO₂ por año"
  );

  const chartEnergia = svgLineChart(
    ambiental.vectorDegradacion,
    "#0ea5e9",
    "kWh",
    "Energía generada con degradación"
  );

  const chartFlujo = eco ? svgLineChart(
    eco.flujoCaja,
    "#f97316",
    "MXN",
    "Flujo de caja acumulado",
    0,
    "Punto de equilibrio"
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
      padding: 0;
    }
    .cover {
      padding: 60px 60px 40px;
      border-bottom: 4px solid #f97316;
    }
    .cover-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
    }
    .cover-logo .dot {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #f97316, #f59e0b);
      border-radius: 8px;
    }
    .cover-logo span {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: -0.5px;
    }
    .cover-logo span em { font-style: normal; color: #f97316; }
    h1 {
      font-size: 28px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 32px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 24px;
    }
    .summary-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .summary-card .card-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .summary-card .card-value {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
    }
    .summary-card .card-unit {
      font-size: 11px;
      color: #64748b;
      margin-left: 2px;
      font-weight: 600;
    }
    .content { padding: 32px 60px 60px; }
    .section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .chart-section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    h2 {
      font-size: 14px;
      font-weight: 800;
      color: #f97316;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #fed7aa;
    }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) td { background: #f8fafc; }
    td { padding: 7px 12px; border: 1px solid #e2e8f0; }
    td.label { color: #475569; font-weight: 600; width: 55%; }
    td.value { color: #0f172a; font-weight: 700; text-align: right; }
    th {
      padding: 7px 12px;
      background: #fff7ed;
      color: #9a3412;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      text-align: left;
      border: 1px solid #fed7aa;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1.5px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cover { padding: 40px 48px 32px; }
      .content { padding: 24px 48px 48px; }
      .chart-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-logo">
      <div class="dot"></div>
      <span>Dimensionador<em>SFV</em></span>
    </div>
    <h1>Reporte de Dimensionamiento<br>Fotovoltaico</h1>
    <p class="subtitle">Generado el ${now} — Resultados técnicos del sistema calculado</p>
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

  <div class="content">
    ${section("Arreglo Fotovoltaico (Paneles)", panelesRows)}
    ${baterias ? section("Banco de Baterías", bateriasRows) : ""}
    ${section("Componentes Eléctricos", electricosRows)}
    ${section("Análisis Ambiental", ambientalRows)}
    ${eco ? section("Análisis Económico", economicoRows) : ""}

    <div class="chart-section">
      <h2>Gráficas — Análisis Ambiental</h2>
      ${chartCo2}
      ${chartEnergia}
    </div>

    ${eco ? `
    <div class="chart-section">
      <h2>Gráfica — Flujo de Caja Acumulado</h2>
      ${chartFlujo}
    </div>` : ""}

    <div class="section">
      <h2>Proyección CO₂ y Energía — Primeros 10 Años</h2>
      <table>
        <thead>
          <tr>
            <th>Año</th>
            <th style="text-align:right">Ahorro CO₂ (kg)</th>
            <th style="text-align:right">Energía generada (kWh)</th>
          </tr>
        </thead>
        <tbody>${co2Table}</tbody>
      </table>
    </div>

    <div class="footer">
      <span>DimensionadorSFV — Herramienta de dimensionamiento de sistemas fotovoltaicos</span>
      <span>Reporte generado: ${now}</span>
    </div>
  </div>

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
