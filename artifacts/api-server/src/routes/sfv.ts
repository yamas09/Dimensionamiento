import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { CalcularSFVBody, CalcularSFVResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// ===== CÁLCULOS ELÉCTRICOS =====

function calcularPaneles(energiaKwh: number, potenciaPanel: number, hsp: number): number {
  const eficiencia = 0.85;
  const energiaCorregida = energiaKwh / eficiencia;
  const potenciaTotal = energiaCorregida / hsp;
  return Math.ceil(potenciaTotal * 1000 / potenciaPanel);
}

function calcularPanelesSerie(energiaKwh: number, vnom: number): { panelesSerie: number; voltajeSistema: number } {
  let voltajeSistema: number;
  if (energiaKwh <= 1) voltajeSistema = 12;
  else if (energiaKwh <= 3) voltajeSistema = 24;
  else voltajeSistema = 48;

  const panelesSerie = Math.round(voltajeSistema / vnom) || 1;
  return { panelesSerie, voltajeSistema };
}

function calcularPanelesParalelo(totalPaneles: number, panelesSerie: number): number {
  return Math.ceil(totalPaneles / panelesSerie);
}

function calcularCapacidadBaterias(
  energiaKwh: number,
  tipoBateria: string,
  diasAutonomia: number,
  voltajeSistema: number
): { capacidadAh: number; dod: number } {
  const dod = tipoBateria === "Litio" ? 0.8 : 0.5;
  const eficiencia = tipoBateria === "Litio" ? 0.95 : 0.85;
  const capacidadAh = (energiaKwh * 1000 * diasAutonomia) / (dod * eficiencia * voltajeSistema);
  return { capacidadAh, dod };
}

const BATERIAS_COMERCIALES: Record<string, { capacidad: number; voltaje: number }[]> = {
  Plomo: [
    { capacidad: 100, voltaje: 12 },
    { capacidad: 150, voltaje: 12 },
    { capacidad: 200, voltaje: 12 },
    { capacidad: 250, voltaje: 12 },
  ],
  Litio: [
    { capacidad: 100, voltaje: 12 },
    { capacidad: 150, voltaje: 24 },
    { capacidad: 200, voltaje: 48 },
  ],
};

function seleccionarBateria(tipoBateria: string, capacidadRequerida: number, voltajeSistema: number): { capacidadComercial: number; voltajeBateria: number } {
  const opciones = BATERIAS_COMERCIALES[tipoBateria] || BATERIAS_COMERCIALES["Plomo"];
  const compatibles = opciones.filter(b => voltajeSistema % b.voltaje === 0);
  const seleccion = compatibles.find(b => b.capacidad >= capacidadRequerida) || compatibles[compatibles.length - 1];
  if (!seleccion) {
    return { capacidadComercial: opciones[opciones.length - 1].capacidad, voltajeBateria: opciones[opciones.length - 1].voltaje };
  }
  return { capacidadComercial: seleccion.capacidad, voltajeBateria: seleccion.voltaje };
}

function calcularBateriasSerie(voltajeSistema: number, voltajeBateria: number): number {
  return Math.round(voltajeSistema / voltajeBateria);
}

function calcularBateriasParalelo(capacidadNominal: number, capacidadComercial: number): number {
  return Math.ceil(capacidadNominal / capacidadComercial);
}

function calcularInversor(iSistema: number, potenciaPanel: number, panelesSerie: number, panelesParalelo: number): number {
  const potenciaTotalW = potenciaPanel * panelesSerie * panelesParalelo;
  const voltajeNominal = 120;
  return Math.ceil((potenciaTotalW / voltajeNominal) * 1.25);
}

function calcularRegulador(isc: number, panelesParalelo: number): number {
  return Math.ceil(isc * panelesParalelo * 1.25);
}

function calcularCableado(isc: number): number {
  return Math.ceil(isc * 1.25);
}

function calcularFusible(isc: number): number {
  return Math.ceil(isc * 1.56);
}

// ===== CÁLCULOS AMBIENTALES =====

const FACTOR_EMISION_CO2 = 0.454; // kg CO2 / kWh (CFE Mexico)
const DEGRADACION_ANUAL = 0.005; // 0.5% per year
const VIDA_UTIL = 25;

function emisionAnual(energiaAnualKwh: number): number {
  return energiaAnualKwh * FACTOR_EMISION_CO2;
}

function calcularVectores(energiaAnualKwh: number): { degradacion: number[]; ahorrosCo2: number[] } {
  const degradacion: number[] = [];
  const ahorrosCo2: number[] = [];
  for (let anio = 1; anio <= VIDA_UTIL; anio++) {
    const energia = energiaAnualKwh * Math.pow(1 - DEGRADACION_ANUAL, anio - 1);
    degradacion.push(parseFloat(energia.toFixed(2)));
    ahorrosCo2.push(parseFloat((energia * FACTOR_EMISION_CO2).toFixed(2)));
  }
  return { degradacion, ahorrosCo2 };
}

// ===== CALCULO CONSUMO DESDE CARGAS =====

function calcularDesdeCargas(cargas: Array<{elemento: string; tipoCarga: string; cantidad: number; potencia: number; horas: number}>): { energiaKwh: number; potenciaKw: number } {
  let energiaTotal = 0;
  let potenciaTotal = 0;
  for (const c of cargas) {
    energiaTotal += c.cantidad * c.potencia * c.horas;
    potenciaTotal += c.cantidad * c.potencia;
  }
  return {
    energiaKwh: parseFloat((energiaTotal / 1000).toFixed(4)),
    potenciaKw: parseFloat((potenciaTotal / 1000).toFixed(4)),
  };
}

function calcularDesdeRecibo(registros: Array<{consumo: number; precio: number}>, dias: number): { energiaKwh: number; potenciaKw: number } {
  const consumoTotal = registros.reduce((s, r) => s + r.consumo, 0);
  const energiaDiaria = consumoTotal / dias;
  const potenciaDiaria = (energiaDiaria * 1000) / 24;
  return {
    energiaKwh: parseFloat(energiaDiaria.toFixed(4)),
    potenciaKw: parseFloat((potenciaDiaria / 1000).toFixed(4)),
  };
}

// ===== ROUTE =====

router.post("/calcular", (req, res) => {
  const parseResult = CalcularSFVBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.message });
    return;
  }

  const data = parseResult.data;

  // 1. Energía diaria
  let energiaKwh: number;
  let potenciaKw: number;

  if (data.metodoPerfil === "cargas" && data.cargas && data.cargas.length > 0) {
    const r = calcularDesdeCargas(data.cargas as Array<{elemento: string; tipoCarga: string; cantidad: number; potencia: number; horas: number}>);
    energiaKwh = r.energiaKwh;
    potenciaKw = r.potenciaKw;
  } else if (data.metodoPerfil === "recibo" && data.registrosRecibo && data.registrosRecibo.length > 0) {
    const dias = data.diasPeriodoRecibo || 30;
    const r = calcularDesdeRecibo(data.registrosRecibo, dias);
    energiaKwh = r.energiaKwh;
    potenciaKw = r.potenciaKw;
  } else {
    res.status(400).json({ error: "Datos de consumo incompletos." });
    return;
  }

  // 2. Paneles
  const totalPaneles = calcularPaneles(energiaKwh, data.panelPotencia, data.hsp);
  const { panelesSerie, voltajeSistema } = calcularPanelesSerie(energiaKwh, data.panelVnom);
  const panelesParalelo = calcularPanelesParalelo(totalPaneles, panelesSerie);
  const corrienteSistema = data.panelImp * panelesParalelo;

  // 3. Baterías (solo aislado)
  let bateriasResult: CalcularSFVResponse["baterias"] | undefined;
  let vBat = voltajeSistema;

  if (data.tipoSistema === "aislado" && data.tipoBateria && data.diasAutonomia) {
    const { capacidadAh, dod } = calcularCapacidadBaterias(
      energiaKwh,
      data.tipoBateria,
      data.diasAutonomia,
      voltajeSistema
    );
    const { capacidadComercial, voltajeBateria } = seleccionarBateria(data.tipoBateria, capacidadAh, voltajeSistema);
    vBat = voltajeBateria;
    const bateriasSerie = calcularBateriasSerie(voltajeSistema, voltajeBateria);
    const bateriasParalelo = calcularBateriasParalelo(capacidadAh, capacidadComercial);

    bateriasResult = {
      totalBaterias: bateriasSerie * bateriasParalelo,
      bateriasSerie,
      bateriasParalelo,
      capacidadNominal: parseFloat(capacidadAh.toFixed(2)),
      capacidadComercial,
      voltajeBateria,
      dod,
    };
  }

  // 4. Inversor
  const corrienteInversor = calcularInversor(corrienteSistema, data.panelPotencia, panelesSerie, panelesParalelo);

  // 5. Regulador (solo aislado)
  const corrienteRegulador = calcularRegulador(data.panelIsc, panelesParalelo);

  // 6. Cableado
  const corrienteCable = calcularCableado(data.panelIsc);

  // 7. Protecciones (interconectado)
  const corrienteFusible = calcularFusible(data.panelIsc);

  // 8. Ambiental
  const energiaAnualKwh = energiaKwh * 365;
  const ahorroCo2PrimerAnio = emisionAnual(energiaAnualKwh);
  const { degradacion, ahorrosCo2 } = calcularVectores(energiaAnualKwh);
  const ahorroCo2TotalTon = ahorrosCo2.reduce((s, v) => s + v, 0) / 1000;

  const resultado: CalcularSFVResponse = {
    energiaDiariaKwh: energiaKwh,
    potenciaDemandaKw: potenciaKw,
    paneles: {
      totalPaneles,
      panelesSerie,
      panelesParalelo,
      voltajeSistema,
      corrienteSistema: parseFloat(corrienteSistema.toFixed(2)),
    },
    ...(bateriasResult ? { baterias: bateriasResult } : {}),
    ...(data.tipoSistema === "aislado" || data.tipoSistema === "interconectado" ? {
      inversor: { corrienteMinima: corrienteInversor },
    } : {}),
    ...(data.tipoSistema === "aislado" ? {
      regulador: { corrienteMinima: corrienteRegulador },
    } : {}),
    cableado: { corrienteMinima: corrienteCable },
    ...(data.tipoSistema === "interconectado" ? {
      protecciones: { corrienteFusible },
    } : {}),
    ambiental: {
      energiaAnualKwh: parseFloat(energiaAnualKwh.toFixed(2)),
      ahorroCo2PrimerAnio: parseFloat(ahorroCo2PrimerAnio.toFixed(2)),
      ahorroCo2TotalTon: parseFloat(ahorroCo2TotalTon.toFixed(2)),
      vectorAhorrosCo2: ahorrosCo2,
      vectorDegradacion: degradacion,
    },
  };

  res.json(resultado);
});

export default router;
