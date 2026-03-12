import { Router, type IRouter } from "express";
import { CalcularSFVBody, CalcularSFVResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// ===================================================================
// MÓDULO ELÉCTRICO — fórmulas fieles al código Python (electrico.py)
// ===================================================================

// --- Factor AC ---
const FACTOR_AC = 1.1;

// --- Cálculo de energía desde tabla de cargas ---
function calcularDesdeCargas(
  cargas: Array<{ elemento: string; tipoCarga: string; cantidad: number; potencia: number; horas: number }>
): { energiaKwh: number; potenciaKw: number } {
  let energiaTotal = 0;
  let potenciaTotal = 0;

  for (const c of cargas) {
    const potenciaCorregida = c.tipoCarga.toUpperCase() === "AC"
      ? c.potencia * FACTOR_AC
      : c.potencia;
    const potenciaFilaKw = (c.cantidad * potenciaCorregida) / 1000;
    energiaTotal += potenciaFilaKw * c.horas;
    potenciaTotal += potenciaFilaKw;
  }

  return {
    energiaKwh: parseFloat(energiaTotal.toFixed(6)),
    potenciaKw: parseFloat(potenciaTotal.toFixed(6)),
  };
}

// --- Cálculo de energía desde recibo de luz ---
// promedio_consumo / periodo, potencia = energia_diaria / 24
function calcularDesdeRecibo(
  registros: Array<{ consumo: number; precio: number }>,
  periodo: number
): { energiaKwh: number; potenciaKw: number } {
  const promedioConsumo = registros.reduce((s, r) => s + r.consumo, 0) / registros.length;
  const energiaDiaria = promedioConsumo / periodo;
  const potenciaDiaria = energiaDiaria / 24; // kW
  return {
    energiaKwh: parseFloat(energiaDiaria.toFixed(6)),
    potenciaKw: parseFloat(potenciaDiaria.toFixed(6)),
  };
}

// --- Número total de paneles ---
// num_paneles = ceil((1.2 * energia_diaria) / (potencia_kw * hsp))
function calcularPaneles(energiaKwh: number, potenciaPanel: number, hsp: number): number {
  const potenciaKw = potenciaPanel / 1000;
  return Math.ceil((1.2 * energiaKwh) / (potenciaKw * hsp));
}

// --- Paneles en serie y voltaje del sistema ---
// energia < 2 → 12V, < 4.5 → 24V, else 48V
function calcularPanelesSerie(
  energiaKwh: number,
  vnom: number
): { panelesSerie: number; voltajeSistema: number } {
  let voltajeSistema: number;
  if (energiaKwh < 2) voltajeSistema = 12;
  else if (energiaKwh < 4.5) voltajeSistema = 24;
  else voltajeSistema = 48;

  const panelesSerie = Math.ceil(voltajeSistema / vnom);
  return { panelesSerie, voltajeSistema };
}

// --- Paneles en paralelo ---
function calcularPanelesParalelo(totalPaneles: number, panelesSerie: number): number {
  if (panelesSerie === 0) throw new Error("Paneles en serie no puede ser 0");
  return Math.ceil(totalPaneles / panelesSerie);
}

// --- DoD por tipo de batería ---
const DOD_POR_TIPO: Record<string, number> = {
  Plomo: 0.7,
  Litio: 0.9,
};

// --- Catálogo de baterías ---
const CATALOGO_BATERIAS: Record<string, Array<{ modelo: string; Ah: number; V: number }>> = {
  Plomo: [
    { modelo: "Plomo 100Ah 12V", Ah: 100, V: 12 },
    { modelo: "Plomo 150Ah 12V", Ah: 150, V: 12 },
    { modelo: "Plomo 200Ah 12V", Ah: 200, V: 12 },
    { modelo: "Plomo 250Ah 12V", Ah: 250, V: 12 },
  ],
  Litio: [
    { modelo: "Litio 50Ah 48V",   Ah:  50, V: 48 },
    { modelo: "Litio 100Ah 12V",  Ah: 100, V: 12 },
    { modelo: "Litio 100Ah 24V",  Ah: 100, V: 24 },
    { modelo: "Litio 100Ah 48V",  Ah: 100, V: 48 },
    { modelo: "Litio 150Ah 12V",  Ah: 150, V: 12 },
    { modelo: "Litio 150Ah 24V",  Ah: 150, V: 24 },
    { modelo: "Litio 200Ah 12V",  Ah: 200, V: 12 },
  ],
};

// --- Capacidad nominal del banco de baterías ---
// Cn_Ah = ceil((1.2 * energia_diaria * 1000 * Daut) / (Vnom_sistema * DoD))
function calcularCapacidadBaterias(
  energiaKwh: number,
  tipo: string,
  diasAutonomia: number,
  voltajeSistema: number
): { capacidadAh: number; dod: number } {
  const dod = DOD_POR_TIPO[tipo] ?? 0.7;
  const capacidadAh = Math.ceil(
    (1.2 * energiaKwh * 1000 * diasAutonomia) / (voltajeSistema * dod)
  );
  return { capacidadAh, dod };
}

// --- Seleccionar batería del catálogo ---
// Elige la primera batería compatible (voltaje divide al Vsistema) y con Ah >= requerido
function seleccionarBateria(
  tipo: string,
  capacidadRequerida: number,
  voltajeSistema: number
): { capacidadComercial: number; voltajeBateria: number; modelo: string } {
  const catalogo = CATALOGO_BATERIAS[tipo] ?? CATALOGO_BATERIAS["Plomo"];
  const compatibles = catalogo.filter(b => voltajeSistema % b.V === 0);
  const seleccion =
    compatibles.find(b => b.Ah >= capacidadRequerida) ??
    compatibles[compatibles.length - 1] ??
    catalogo[catalogo.length - 1];
  return {
    capacidadComercial: seleccion.Ah,
    voltajeBateria: seleccion.V,
    modelo: seleccion.modelo,
  };
}

function calcularBateriasSerie(voltajeSistema: number, voltajeBateria: number): number {
  return Math.ceil(voltajeSistema / voltajeBateria);
}

function calcularBateriasParalelo(capacidadNominalAh: number, capacidadComercialAh: number): number {
  return Math.ceil(capacidadNominalAh / capacidadComercialAh);
}

// --- Inversor ---
// Ic = (potencia_panel * num_paralelo * num_serie) / Vn_bateria
// I_inversor = max(Ic, I_sistema)
function calcularInversor(
  iSistema: number,
  potenciaPanel: number,
  panelesSerie: number,
  panelesParalelo: number,
  vBateria: number
): number {
  const Ic = (potenciaPanel * panelesParalelo * panelesSerie) / vBateria;
  return parseFloat(Math.max(Ic, iSistema).toFixed(2));
}

// --- Regulador / controlador de carga ---
// I_regulador = Isc * 1.25 * num_paralelo
function calcularRegulador(isc: number, panelesParalelo: number): number {
  return parseFloat((isc * 1.25 * panelesParalelo).toFixed(2));
}

// --- Cableado ---
// I_cable = Isc * 1.25
function calcularCableado(isc: number): number {
  return parseFloat((isc * 1.25).toFixed(2));
}

// --- Protecciones aislado ---
// Breaker CC: Isc * num_paralelo * 1.25
function calcularBreakerAislado(isc: number, panelesParalelo: number): number {
  return parseFloat((isc * panelesParalelo * 1.25).toFixed(2));
}

// Fusible CC aislado: I_regulador * 1.25
function calcularFusibleAislado(iRegulador: number): number {
  return parseFloat((iRegulador * 1.25).toFixed(2));
}

// Interruptor seccionador: Voc*1.15, Isc*1.25
function calcularInterruptorSeccionador(voc: number, isc: number): { voltaje: number; corriente: number } {
  return {
    voltaje: parseFloat((voc * 1.15).toFixed(2)),
    corriente: parseFloat((isc * 1.25).toFixed(2)),
  };
}

// Protector de sobretensiones: Voc * 1.15
function calcularSobretensiones(voc: number): number {
  return parseFloat((voc * 1.15).toFixed(2));
}

// Interruptor termomagnético CA: Ic * 1.25
function calcularTermomagnetico(ic: number): number {
  return parseFloat((ic * 1.25).toFixed(2));
}

// --- Protecciones interconectado ---
// Fusible CC interconectado: Isc * 1.5
function calcularFusibleInterconectado(isc: number): number {
  return parseFloat((isc * 1.5).toFixed(2));
}

// ===================================================================
// MÓDULO AMBIENTAL
// ===================================================================

const FACTOR_EMISION_CO2 = 0.444; // kg CO2e / kWh (SEMARNAT 2024, SEN)
const DEGRADACION_ANUAL = 0.005;   // 0.5 % anual
const VIDA_UTIL = 25;

function calcularVectoresAmbientales(energiaAnualKwh: number): {
  degradacion: number[];
  ahorrosCo2: number[];
} {
  const degradacion: number[] = [];
  const ahorrosCo2: number[] = [];
  for (let anio = 1; anio <= VIDA_UTIL; anio++) {
    const energia = energiaAnualKwh * Math.pow(1 - DEGRADACION_ANUAL, anio - 1);
    degradacion.push(parseFloat(energia.toFixed(2)));
    ahorrosCo2.push(parseFloat((energia * FACTOR_EMISION_CO2).toFixed(2)));
  }
  return { degradacion, ahorrosCo2 };
}

// ===================================================================
// RUTA
// ===================================================================

router.post("/calcular", (req, res) => {
  const parseResult = CalcularSFVBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.message });
    return;
  }

  const data = parseResult.data;

  // 1. Energía y potencia diaria
  let energiaKwh: number;
  let potenciaKw: number;

  if (data.metodoPerfil === "cargas") {
    if (!data.cargas || data.cargas.length === 0) {
      res.status(400).json({ error: "Se requieren cargas para el método de cargas." });
      return;
    }
    const r = calcularDesdeCargas(
      data.cargas as Array<{ elemento: string; tipoCarga: string; cantidad: number; potencia: number; horas: number }>
    );
    energiaKwh = r.energiaKwh;
    potenciaKw = r.potenciaKw;
  } else {
    if (!data.registrosRecibo || data.registrosRecibo.length === 0) {
      res.status(400).json({ error: "Se requieren registros de recibo para el método de recibo." });
      return;
    }
    const periodo = data.diasPeriodoRecibo ?? 30;
    const r = calcularDesdeRecibo(data.registrosRecibo, periodo);
    energiaKwh = r.energiaKwh;
    potenciaKw = r.potenciaKw;
  }

  // 2. Paneles
  const totalPaneles = calcularPaneles(energiaKwh, data.panelPotencia, data.hsp);
  const { panelesSerie, voltajeSistema } = calcularPanelesSerie(energiaKwh, data.panelVnom);
  const panelesParalelo = calcularPanelesParalelo(totalPaneles, panelesSerie);
  const corrienteSistema = parseFloat((data.panelImp * panelesParalelo).toFixed(2));

  // 3. Baterías (solo aislado)
  let bateriasResult: CalcularSFVResponse["baterias"] | undefined;
  let voltajeBateria = voltajeSistema; // fallback para inversor

  if (data.tipoSistema === "aislado") {
    if (!data.tipoBateria || !data.diasAutonomia) {
      res.status(400).json({ error: "Se requieren tipo de batería y días de autonomía para sistema aislado." });
      return;
    }
    const { capacidadAh, dod } = calcularCapacidadBaterias(
      energiaKwh,
      data.tipoBateria,
      data.diasAutonomia,
      voltajeSistema
    );
    const { capacidadComercial, voltajeBateria: vBat } = seleccionarBateria(
      data.tipoBateria,
      capacidadAh,
      voltajeSistema
    );
    voltajeBateria = vBat;

    const bateriasSerie = calcularBateriasSerie(voltajeSistema, vBat);
    const bateriasParalelo = calcularBateriasParalelo(capacidadAh, capacidadComercial);

    bateriasResult = {
      totalBaterias: bateriasSerie * bateriasParalelo,
      bateriasSerie,
      bateriasParalelo,
      capacidadNominal: capacidadAh,
      capacidadComercial,
      voltajeBateria: vBat,
      dod,
    };
  }

  // 4. Inversor (aislado e interconectado)
  let inversorResult: CalcularSFVResponse["inversor"] | undefined;
  if (data.tipoSistema === "aislado" || data.tipoSistema === "interconectado") {
    const corrienteMinima = calcularInversor(
      corrienteSistema,
      data.panelPotencia,
      panelesSerie,
      panelesParalelo,
      voltajeBateria
    );
    inversorResult = { corrienteMinima };
  }

  // 5. Regulador (solo aislado)
  let reguladorResult: CalcularSFVResponse["regulador"] | undefined;
  if (data.tipoSistema === "aislado") {
    reguladorResult = { corrienteMinima: calcularRegulador(data.panelIsc, panelesParalelo) };
  }

  // 6. Cableado (todos los sistemas)
  const corrienteCable = calcularCableado(data.panelIsc);

  // 7. Protecciones
  let proteccionesResult: CalcularSFVResponse["protecciones"] | undefined;
  if (data.tipoSistema === "aislado") {
    const iRegulador = reguladorResult!.corrienteMinima;
    const breakerCC = calcularBreakerAislado(data.panelIsc, panelesParalelo);
    const fusibleCC = calcularFusibleAislado(iRegulador);
    const seccionador = calcularInterruptorSeccionador(data.panelVoc, data.panelIsc);
    const sobretensiones = calcularSobretensiones(data.panelVoc);
    // corriente CA del inversor como Ic para termomagnético
    const Ic = (data.panelPotencia * panelesParalelo * panelesSerie) / voltajeBateria;
    const termomagnetico = calcularTermomagnetico(Ic);

    proteccionesResult = {
      corrienteFusible: fusibleCC,
      breakerCC,
      seccionadorVoltaje: seccionador.voltaje,
      seccionadorCorriente: seccionador.corriente,
      sobretensionesVoltaje: sobretensiones,
      termomagneticoCorriente: termomagnetico,
    } as CalcularSFVResponse["protecciones"];
  } else if (data.tipoSistema === "interconectado") {
    const fusibleInt = calcularFusibleInterconectado(data.panelIsc);
    const seccionador = calcularInterruptorSeccionador(data.panelVoc, data.panelIsc);
    const sobretensiones = calcularSobretensiones(data.panelVoc);

    proteccionesResult = {
      corrienteFusible: fusibleInt,
      seccionadorVoltaje: seccionador.voltaje,
      seccionadorCorriente: seccionador.corriente,
      sobretensionesVoltaje: sobretensiones,
    } as CalcularSFVResponse["protecciones"];
  }

  // 8. Ambiental
  const energiaAnualKwh = energiaKwh * 365;
  const ahorroCo2PrimerAnio = parseFloat((energiaAnualKwh * FACTOR_EMISION_CO2).toFixed(2));
  const { degradacion, ahorrosCo2 } = calcularVectoresAmbientales(energiaAnualKwh);
  const ahorroCo2TotalTon = parseFloat(
    (ahorrosCo2.reduce((s, v) => s + v, 0) / 1000).toFixed(2)
  );

  const resultado: CalcularSFVResponse = {
    energiaDiariaKwh: energiaKwh,
    potenciaDemandaKw: potenciaKw,
    paneles: {
      totalPaneles,
      panelesSerie,
      panelesParalelo,
      voltajeSistema,
      corrienteSistema,
    },
    ...(bateriasResult ? { baterias: bateriasResult } : {}),
    ...(inversorResult ? { inversor: inversorResult } : {}),
    ...(reguladorResult ? { regulador: reguladorResult } : {}),
    cableado: { corrienteMinima: corrienteCable },
    ...(proteccionesResult ? { protecciones: proteccionesResult } : {}),
    ambiental: {
      energiaAnualKwh: parseFloat(energiaAnualKwh.toFixed(2)),
      ahorroCo2PrimerAnio,
      ahorroCo2TotalTon,
      vectorAhorrosCo2: ahorrosCo2,
      vectorDegradacion: degradacion,
    },
  };

  res.json(resultado);
});

export default router;
