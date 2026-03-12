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

export function generatePDF(data: SFVResultado) {
  const now = new Date().toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  const paneles = data.paneles;
  const baterias = data.baterias;
  const ambiental = data.ambiental;

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
    row("Capacidad nominal (Cn)", `${baterias.capacidadNominal.toFixed(2)} Ah`),
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

  const co2Table = ambiental.vectorAhorrosCo2.slice(0, 10).map((val, i) =>
    `<tr><td class="label">Año ${i + 1}</td><td class="value">${val.toFixed(2)} kg CO₂</td><td class="value">${ambiental.vectorDegradacion[i].toFixed(2)} kWh</td></tr>`
  ).join("");

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
      border-bottom: 4px solid #10b981;
    }
    .cover-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
    }
    .cover-logo .dot {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #10b981, #14b8a6);
      border-radius: 8px;
    }
    .cover-logo span {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: -0.5px;
    }
    .cover-logo span em { font-style: normal; color: #10b981; }
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
    h2 {
      font-size: 14px;
      font-weight: 800;
      color: #10b981;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #d1fae5;
    }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) td { background: #f8fafc; }
    td { padding: 7px 12px; border: 1px solid #e2e8f0; }
    td.label { color: #475569; font-weight: 600; width: 55%; }
    td.value { color: #0f172a; font-weight: 700; text-align: right; }
    th {
      padding: 7px 12px;
      background: #f0fdf4;
      color: #065f46;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      text-align: left;
      border: 1px solid #d1fae5;
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
      <div class="summary-card">
        <div class="card-label">Ahorro CO₂ (Año 1)</div>
        <div class="card-value">${ambiental.ahorroCo2PrimerAnio.toFixed(1)}<span class="card-unit">kg CO₂</span></div>
      </div>
      <div class="summary-card">
        <div class="card-label">Ahorro CO₂ (25 Años)</div>
        <div class="card-value">${ambiental.ahorroCo2TotalTon.toFixed(2)}<span class="card-unit">Ton</span></div>
      </div>
    </div>
  </div>

  <div class="content">
    ${section("Arreglo Fotovoltaico (Paneles)", panelesRows)}
    ${baterias ? section("Banco de Baterías", bateriasRows) : ""}
    ${section("Componentes Eléctricos", electricosRows)}
    ${section("Análisis Ambiental (Resumen)", ambientalRows)}

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
