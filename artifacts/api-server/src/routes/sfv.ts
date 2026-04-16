import { Router, type IRouter } from "express";
import { CalcularSFVBody, CalcularSFVResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// ===================================================================
// MÓDULO ELÉCTRICO — fórmulas fieles al código Python (electrico.py)
// ===================================================================

const FACTOR_AC = 1.1;

function calcularDesdeCargas(
  cargas: Array<{ elemento: string; tipoCarga: string; cantidad: number; potencia: number; horas: number }>
): { energiaKwh: number; potenciaKw: number } {
  let energiaTotal = 0;
  let potenciaTotal = 0;
  for (const c of cargas) {
    const potenciaCorregida = c.tipoCarga.toUpperCase() === "AC" ? c.potencia * FACTOR_AC : c.potencia;
    const potenciaFilaKw = (c.cantidad * potenciaCorregida) / 1000;
    energiaTotal += potenciaFilaKw * c.horas;
    potenciaTotal += potenciaFilaKw;
  }
  return { energiaKwh: parseFloat(energiaTotal.toFixed(6)), potenciaKw: parseFloat(potenciaTotal.toFixed(6)) };
}

function calcularDesdeRecibo(
  registros: Array<{ consumo: number; precio: number }>,
  periodo: number
): { energiaKwh: number; potenciaKw: number; precioProm: number } {
  const promedioConsumo = registros.reduce((s, r) => s + r.consumo, 0) / registros.length;
  const energiaDiaria = promedioConsumo / periodo;
  const potenciaDiaria = energiaDiaria / 24;
  const totalConsumo = registros.reduce((s, r) => s + r.consumo, 0);
  const totalPrecio = registros.reduce((s, r) => s + r.precio, 0);
  const precioProm = totalConsumo > 0 ? totalPrecio / totalConsumo : 0;
  return {
    energiaKwh: parseFloat(energiaDiaria.toFixed(6)),
    potenciaKw: parseFloat(potenciaDiaria.toFixed(6)),
    precioProm: parseFloat(precioProm.toFixed(4)),
  };
}

// num_paneles = ceil((1.2 * energia_diaria) / (potencia_kw * hsp))
function calcularPaneles(energiaKwh: number, potenciaPanel: number, hsp: number): number {
  const potenciaKw = potenciaPanel / 1000;
  return Math.ceil((1.2 * energiaKwh) / (potenciaKw * hsp));
}

function calcularPanelesSerie(energiaKwh: number, vnom: number): { panelesSerie: number; voltajeSistema: number } {
  let voltajeSistema: number;
  if (energiaKwh < 2) voltajeSistema = 12;
  else if (energiaKwh < 4.5) voltajeSistema = 24;
  else voltajeSistema = 48;
  return { panelesSerie: Math.ceil(voltajeSistema / vnom), voltajeSistema };
}

function calcularPanelesParalelo(totalPaneles: number, panelesSerie: number): number {
  if (panelesSerie === 0) throw new Error("Paneles en serie no puede ser 0");
  return Math.ceil(totalPaneles / panelesSerie);
}

// ── Bombeo ──
// calcular_potencias_bombeo: fórmula Python fiel
// Se corrige la unidad del caudal: caudal [m³/s] = volumen_m3 / (horas * 3600)
function calcularPotenciasBombeo(
  caudalM3s: number,
  alturaM: number,
  eficienciaBomba = 0.60,
  eficienciaMotor = 0.85
): { potenciaHP: number; potenciaHidraulicaW: number; potenciaElectricaW: number } {
  const potenciaHidraulica = (1000 * 9.81 * caudalM3s * alturaM) / eficienciaBomba;
  const potenciaElectrica = potenciaHidraulica / eficienciaMotor;
  const potenciaHP = potenciaElectrica / 746;
  return {
    potenciaHP: parseFloat(potenciaHP.toFixed(4)),
    potenciaHidraulicaW: parseFloat(potenciaHidraulica.toFixed(2)),
    potenciaElectricaW: parseFloat(potenciaElectrica.toFixed(2)),
  };
}

// calcular_energia_bombeo: (potencia_electrica * hsp) / 1000 [kWh]
function calcularEnergiaBombeo(potenciaElectricaW: number, hsp: number): number {
  return parseFloat(((potenciaElectricaW * hsp) / 1000).toFixed(6));
}

// paneles_bombeo
function panelesBombeo(
  energiaDiariaNecesaria: number,
  potenciaElectricaW: number,
  hsp: number,
  vnomPanel: number
): { panelesSerie: number; voltajeSistema: number; panelesParalelo: number; panelesTotal: number } {
  const potenciaKw = potenciaElectricaW / 1000;
  const numPaneles = Math.ceil((1.2 * energiaDiariaNecesaria) / (potenciaKw * hsp));
  let voltajeSistema: number;
  if (energiaDiariaNecesaria < 2) voltajeSistema = 12;
  else if (energiaDiariaNecesaria < 4.5) voltajeSistema = 24;
  else voltajeSistema = 48;
  const panelesSerie = Math.ceil(voltajeSistema / vnomPanel);
  if (panelesSerie === 0) throw new Error("Paneles en serie no puede ser 0");
  const panelesParalelo = Math.ceil(numPaneles / panelesSerie);
  return { panelesSerie, voltajeSistema, panelesParalelo, panelesTotal: panelesSerie * panelesParalelo };
}

// seleccionar_variador: verifica compatibilidad por Voc total
function seleccionarVariador(vocPanel: number, panelesSerie: number): { vocTotal: number; tipo: string } {
  const vocTotal = vocPanel * panelesSerie;
  let tipo: string;
  if (vocTotal >= 345 && vocTotal <= 385) tipo = "230 V";
  else if (vocTotal >= 740 && vocTotal <= 780) tipo = "400 V";
  else tipo = "No compatible";
  return { vocTotal: parseFloat(vocTotal.toFixed(2)), tipo };
}

// ── Baterías ──
const DOD_POR_TIPO: Record<string, number> = { Plomo: 0.7, Litio: 0.9 };
const CATALOGO_BATERIAS: Record<string, Array<{ modelo: string; Ah: number; V: number }>> = {
  Plomo: [
    { modelo: "Plomo 100Ah 12V", Ah: 100, V: 12 },
    { modelo: "Plomo 150Ah 12V", Ah: 150, V: 12 },
    { modelo: "Plomo 200Ah 12V", Ah: 200, V: 12 },
    { modelo: "Plomo 250Ah 12V", Ah: 250, V: 12 },
  ],
  Litio: [
    { modelo: "Litio 50Ah 48V",  Ah: 50,  V: 48 },
    { modelo: "Litio 100Ah 12V", Ah: 100, V: 12 },
    { modelo: "Litio 100Ah 24V", Ah: 100, V: 24 },
    { modelo: "Litio 100Ah 48V", Ah: 100, V: 48 },
    { modelo: "Litio 150Ah 12V", Ah: 150, V: 12 },
    { modelo: "Litio 150Ah 24V", Ah: 150, V: 24 },
    { modelo: "Litio 200Ah 12V", Ah: 200, V: 12 },
  ],
};

function calcularCapacidadBaterias(
  energiaKwh: number, tipo: string, diasAutonomia: number, voltajeSistema: number
): { capacidadAh: number; dod: number } {
  const dod = DOD_POR_TIPO[tipo] ?? 0.7;
  const eficiencia = 0.8075;
  // Python: Cn_Ah = (1.2 * energia_diaria * 1000 * Daut) / (Vnom_sistema * eficiencia * DoD)
  const capacidadAh = Math.ceil((1.2 * energiaKwh * 1000 * diasAutonomia) / (voltajeSistema * eficiencia * dod));
  return { capacidadAh, dod };
}

function seleccionarBateria(
  tipo: string, capacidadRequerida: number, voltajeSistema: number
): { capacidadComercial: number; voltajeBateria: number; modelo: string } {
  const catalogo = CATALOGO_BATERIAS[tipo] ?? CATALOGO_BATERIAS["Plomo"];
  const compatibles = catalogo.filter(b => voltajeSistema % b.V === 0);
  const seleccion = compatibles.find(b => b.Ah >= capacidadRequerida) ?? compatibles[compatibles.length - 1] ?? catalogo[catalogo.length - 1];
  return { capacidadComercial: seleccion.Ah, voltajeBateria: seleccion.V, modelo: seleccion.modelo };
}

function calcularBateriasSerie(voltajeSistema: number, voltajeBateria: number): number {
  return Math.round(voltajeSistema / voltajeBateria);
}
// Python: calcular_baterias_paralelo: Np = round(Cn_Ah / C_bateria)
function calcularBateriasParalelo(capacidadNominalAh: number, capacidadComercialAh: number): number {
  return Math.round(capacidadNominalAh / capacidadComercialAh);
}

// ── Inversor / Regulador / Cableado ──
function calcularInversor(iSistema: number, potenciaPanel: number, panelesSerie: number, panelesParalelo: number, vBateria: number): number {
  const Ic = (potenciaPanel * panelesParalelo * panelesSerie) / vBateria;
  return parseFloat(Math.max(Ic, iSistema).toFixed(2));
}
function calcularRegulador(isc: number, panelesParalelo: number): number {
  return parseFloat((isc * 1.25 * panelesParalelo).toFixed(2));
}
function calcularCableado(isc: number): number {
  return parseFloat((isc * 1.25).toFixed(2));
}

// ── Protecciones ──
function calcularBreakerAislado(isc: number, panelesParalelo: number): number {
  return parseFloat((isc * panelesParalelo * 1.25).toFixed(2));
}
function calcularFusibleAislado(iRegulador: number): number {
  return parseFloat((iRegulador * 1.25).toFixed(2));
}
function calcularFusibleInterconectado(isc: number): number {
  return parseFloat((isc * 1.5).toFixed(2));
}
function calcularInterruptorSeccionador(voc: number, isc: number): { voltaje: number; corriente: number } {
  return { voltaje: parseFloat((voc * 1.15).toFixed(2)), corriente: parseFloat((isc * 1.25).toFixed(2)) };
}
function calcularSobretensiones(voc: number): number {
  return parseFloat((voc * 1.15).toFixed(2));
}
function calcularTermomagnetico(ic: number): number {
  return parseFloat((ic * 1.25).toFixed(2));
}

// ===================================================================
// MÓDULO ECONÓMICO — fórmulas fieles al código Python (economico.py)
// ===================================================================

function costoTotalAislado(
  costoPanelTotal: number, costoInversor: number, costoRegulador: number,
  costoBaterias: number, costoProtecciones: number, costoInstalacion: number, costoCableado: number
): number {
  return parseFloat((costoPanelTotal + costoInversor + costoRegulador + costoBaterias + costoProtecciones + costoInstalacion + costoCableado).toFixed(2));
}

function costoTotalInterconectado(
  costoPanelTotal: number, costoInversor: number, costoInstalacion: number,
  costoProtecciones: number, costoRegulador: number, costoCableado: number
): number {
  return parseFloat((costoPanelTotal + costoInversor + costoInstalacion + costoProtecciones + costoRegulador + costoCableado).toFixed(2));
}

function costoTotalBombeo(
  costoPanelTotal: number, costoBomba: number, costoInstalacion: number,
  costoCableado: number, costoVariador: number
): number {
  return parseFloat((costoPanelTotal + costoBomba + costoInstalacion + costoCableado + costoVariador).toFixed(2));
}

// Ahorro = energia_anual * precio_kwh
function ahorroAnual(energiaAnualKwh: number, precioKwh: number): number {
  return parseFloat((energiaAnualKwh * precioKwh).toFixed(2));
}

// flujo_caja_acumulado: año 0 = -costoTotal, luego acumula ahorros año a año
function flujoCajaAcumulado(costoTotal: number, vectorAhorros: number[]): number[] {
  const flujo: number[] = [-parseFloat(costoTotal.toFixed(2))];
  for (const ahorro of vectorAhorros) {
    flujo.push(parseFloat((flujo[flujo.length - 1] + ahorro).toFixed(2)));
  }
  return flujo;
}

// calcular_payback_real: primer año (índice del flujo) donde el valor >= 0
function calcularPaybackReal(flujoCaja: number[]): number | null {
  for (let anio = 0; anio < flujoCaja.length; anio++) {
    if (flujoCaja[anio] >= 0) return anio;
  }
  return null;
}

// Vector de ahorros anuales con degradación
function calcularVectorAhorros(
  energiaAnualInicial: number, precioKwh: number,
  tasaDegradacion = 0.005, vidaUtil = 25
): { vectorAhorros: number[]; ahorrosAcumulados: number[]; ahorroTotal: number } {
  const vectorAhorros: number[] = [];
  const ahorrosAcumulados: number[] = [];
  let acumulado = 0;
  for (let n = 0; n < vidaUtil; n++) {
    const energia = energiaAnualInicial * Math.pow(1 - tasaDegradacion, n);
    const ahorro = parseFloat((energia * precioKwh).toFixed(2));
    vectorAhorros.push(ahorro);
    acumulado = parseFloat((acumulado + ahorro).toFixed(2));
    ahorrosAcumulados.push(acumulado);
  }
  return { vectorAhorros, ahorrosAcumulados, ahorroTotal: acumulado };
}

// flujo_caja_bombeo: acumula ahorro_real = ahorro_anual * (1-tasa)^año
function flujoCajaBombeo(costoTotal: number, ahorroAnualBase: number, tasaDegradacion = 0.005, vidaUtil = 25): number[] {
  const flujo: number[] = [-parseFloat(costoTotal.toFixed(2))];
  for (let anio = 0; anio < vidaUtil; anio++) {
    const ahorroReal = ahorroAnualBase * Math.pow(1 - tasaDegradacion, anio);
    flujo.push(parseFloat((flujo[flujo.length - 1] + ahorroReal).toFixed(2)));
  }
  return flujo;
}

// ===================================================================
// MÓDULO AMBIENTAL
// ===================================================================

const FACTOR_EMISION_CO2 = 0.444;
const DEGRADACION_ANUAL = 0.005;
const VIDA_UTIL = 25;

function calcularVectoresAmbientales(energiaAnualKwh: number): { degradacion: number[]; ahorrosCo2: number[] } {
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
// RUTA PRINCIPAL
// ===================================================================

router.post("/calcular", (req, res) => {
  const parseResult = CalcularSFVBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.message });
    return;
  }

  const data = parseResult.data;

  // ─── SISTEMA BOMBEO ───────────────────────────────────────────────
  if (data.tipoSistema === "bombeo") {
    if (!data.volumenLitros || data.alturaDebajo == null || data.alturaEncima == null) {
      res.status(400).json({ error: "Se requieren volumen, alturaDebajo y alturaEncima para sistema de bombeo." });
      return;
    }
    if (data.alturaDebajo + data.alturaEncima <= 0) {
      res.status(400).json({ error: "La suma de alturaDebajo y alturaEncima debe ser mayor a 0." });
      return;
    }

    const volumenM3 = data.volumenLitros / 1000;
    const horasBombeo = data.usarHspParaBombeo ? data.hsp : (data.horasBombeoManual ?? data.hsp);
    // Caudal correcto: m³/s = volumen_m³ / (horas * 3600)
    const caudalM3s = volumenM3 / (horasBombeo * 3600);
    const alturaM = (data.alturaDebajo + data.alturaEncima) * 1.125;

    const { potenciaHP, potenciaHidraulicaW, potenciaElectricaW } = calcularPotenciasBombeo(caudalM3s, alturaM);
    const energiaDiariaNecesaria = calcularEnergiaBombeo(potenciaElectricaW, data.hsp);

    // Paneles bombeo
    const { panelesSerie, voltajeSistema, panelesParalelo, panelesTotal } = panelesBombeo(
      energiaDiariaNecesaria, potenciaElectricaW, data.hsp, data.panelVnom
    );
    const corrienteSistema = parseFloat((data.panelImp * panelesParalelo).toFixed(2));

    // Variador (solo corriente máxima, sin seleccionar tipo)
    const potenciaPostPaneles = panelesTotal * data.panelPotencia;
    const corrienteMaximaVariador = parseFloat((potenciaPostPaneles / voltajeSistema).toFixed(2));

    // Protecciones bombeo
    const seccionadorBombeo = calcularInterruptorSeccionador(data.panelVoc, data.panelIsc);
    const sobretensionBombeo = calcularSobretensiones(data.panelVoc);

    // Cableado
    const corrienteCable = calcularCableado(data.panelIsc);
    const energiaPostPaneles = (potenciaPostPaneles * data.hsp) / 1000; // kWh/día

    // Ambiental
    const energiaAnualKwh = energiaPostPaneles * 365;
    const ahorroCo2PrimerAnio = parseFloat((energiaAnualKwh * FACTOR_EMISION_CO2).toFixed(2));
    const { degradacion, ahorrosCo2 } = calcularVectoresAmbientales(energiaAnualKwh);
    const ahorroCo2TotalTon = parseFloat((ahorrosCo2.reduce((s, v) => s + v, 0) / 1000).toFixed(2));

    // Económico bombeo (opcional)
    let economicoResult: any;
    const hayDatosEconomicos = data.costoPorPanel !== undefined && data.costoBomba !== undefined;
    if (hayDatosEconomicos) {
      const costoPanelTotal = data.costoPorPanel! * panelesTotal;
      const costoTotal = costoTotalBombeo(
        costoPanelTotal,
        data.costoBomba ?? 0,
        data.costoInstalacion ?? 0,
        data.costoCableado ?? 0,
        data.costoVariador ?? 0
      );

      // costoConvencional = costo anual evitado (lo que se deja de pagar)
      let costoConvencional = 0;
      let precioKwhRef: number | undefined;
      if (data.tipoCombustible === "electrico" && data.precioKwhConvencional) {
        costoConvencional = parseFloat((energiaAnualKwh * data.precioKwhConvencional).toFixed(2));
        precioKwhRef = data.precioKwhConvencional;
      } else if (data.tipoCombustible === "diesel" && data.consumoDieselAnual && data.precioDieselLitro) {
        costoConvencional = parseFloat((data.consumoDieselAnual * data.precioDieselLitro).toFixed(2));
      }

      // El ahorro del año 1 ES el costo convencional evitado (igual que sistema aislado)
      const ahorroPrimerAnio = costoConvencional;

      // Vector de ahorros con degradación 0.5%/año (igual que calcularVectorAhorros en aislado)
      const vectorAhorros: number[] = [];
      const ahorrosAcumulados: number[] = [];
      let acc = 0;
      for (let n = 0; n < 25; n++) {
        const ahorro = parseFloat((ahorroPrimerAnio * Math.pow(1 - 0.005, n)).toFixed(2));
        vectorAhorros.push(ahorro);
        acc = parseFloat((acc + ahorro).toFixed(2));
        ahorrosAcumulados.push(acc);
      }

      // Flujo de caja: año 0 = −costoTotal, luego acumula ahorros (igual que flujoCajaAcumulado)
      const flujo = flujoCajaAcumulado(costoTotal, vectorAhorros);

      // Payback: primer año donde el flujo acumulado >= 0 (igual que calcularPaybackReal)
      const paybackReal = calcularPaybackReal(flujo);

      economicoResult = {
        costoTotal,
        ...(precioKwhRef !== undefined ? { precioKwh: precioKwhRef } : {}),
        ahorroPrimerAnio,
        ahorroTotal: ahorrosAcumulados[24],
        payback: paybackReal,
        vectorAhorros,
        ahorrosAcumulados,
        flujoCaja: flujo,
        costoConvencional,
      };
    }

    const anguloInclinacionBombeo = parseFloat((Math.abs(data.latitud) + 10).toFixed(1));
    const orientacionBombeo = data.latitud > 0 ? "sur" : "norte";

    const resultado: any = {
      energiaDiariaKwh: parseFloat(energiaDiariaNecesaria.toFixed(4)),
      potenciaDemandaKw: parseFloat((potenciaElectricaW / 1000).toFixed(4)),
      anguloInclinacion: anguloInclinacionBombeo,
      orientacion: orientacionBombeo,
      paneles: { totalPaneles: panelesTotal, panelesSerie, panelesParalelo, voltajeSistema, corrienteSistema },
      cableado: { corrienteMinima: corrienteCable },
      bomba: {
        potenciaHP: parseFloat(potenciaHP.toFixed(3)),
        potenciaKw: parseFloat((potenciaElectricaW / 1000).toFixed(3)),
        potenciaHidraulicaW: parseFloat(potenciaHidraulicaW.toFixed(2)),
        caudalM3s: parseFloat(caudalM3s.toFixed(6)),
      },
      variador: { corrienteMaxima: corrienteMaximaVariador },
      protecciones: {
        seccionadorCorriente: seccionadorBombeo.corriente,
        seccionadorVoltaje: seccionadorBombeo.voltaje,
        sobretensionesVoltaje: sobretensionBombeo,
      },
      ambiental: {
        energiaAnualKwh: parseFloat(energiaAnualKwh.toFixed(2)),
        ahorroCo2PrimerAnio,
        ahorroCo2TotalTon,
        vectorAhorrosCo2: ahorrosCo2,
        vectorDegradacion: degradacion,
      },
      ...(economicoResult ? { economico: economicoResult } : {}),
    };

    res.json(resultado);
    return;
  }

  // ─── SISTEMAS AISLADO / INTERCONECTADO ───────────────────────────

  // 1. Energía y potencia diaria
  let energiaKwh: number;
  let potenciaKw: number;
  let precioKwhRecibo: number | undefined;

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
    precioKwhRecibo = r.precioProm;
  }

  // 2. Paneles
  const totalPaneles = calcularPaneles(energiaKwh, data.panelPotencia, data.hsp);
  const { panelesSerie, voltajeSistema } = calcularPanelesSerie(energiaKwh, data.panelVnom);
  const panelesParalelo = calcularPanelesParalelo(totalPaneles, panelesSerie);
  const corrienteSistema = parseFloat((data.panelImp * panelesParalelo).toFixed(2));
  const potenciaPostPaneles = totalPaneles * data.panelPotencia; // W
  const energiaPostPanelesKwh = (potenciaPostPaneles * data.hsp) / 1000; // kWh/día

  // 3. Baterías (solo aislado)
  let bateriasResult: CalcularSFVResponse["baterias"] | undefined;
  let voltajeBateria = voltajeSistema;

  if (data.tipoSistema === "aislado") {
    if (!data.tipoBateria || !data.diasAutonomia) {
      res.status(400).json({ error: "Se requieren tipo de batería y días de autonomía para sistema aislado." });
      return;
    }
    const { capacidadAh, dod } = calcularCapacidadBaterias(energiaKwh, data.tipoBateria, data.diasAutonomia, voltajeSistema);
    let capacidadComercial: number;
    let vBat: number;
    if (data.bateriaAh && data.bateriaV) {
      capacidadComercial = data.bateriaAh;
      vBat = data.bateriaV;
      if (voltajeSistema % vBat !== 0) {
        res.status(400).json({ error: `El voltaje de la batería (${vBat}V) no es compatible con el voltaje del sistema (${voltajeSistema}V).` });
        return;
      }
    } else {
      const seleccion = seleccionarBateria(data.tipoBateria, capacidadAh, voltajeSistema);
      capacidadComercial = seleccion.capacidadComercial;
      vBat = seleccion.voltajeBateria;
    }
    voltajeBateria = vBat;
    const bateriasSerie = calcularBateriasSerie(voltajeSistema, vBat);
    const bateriasParalelo = calcularBateriasParalelo(capacidadAh, capacidadComercial);
    bateriasResult = { totalBaterias: bateriasSerie * bateriasParalelo, bateriasSerie, bateriasParalelo, capacidadNominal: capacidadAh, capacidadComercial, voltajeBateria: vBat, dod };
  }

  // 4. Inversor
  let inversorResult: CalcularSFVResponse["inversor"] | undefined;
  if (data.tipoSistema === "aislado" || data.tipoSistema === "interconectado") {
    const corrienteMinima = calcularInversor(corrienteSistema, data.panelPotencia, panelesSerie, panelesParalelo, voltajeBateria);
    inversorResult = { corrienteMinima };
  }

  // 5. Regulador (solo aislado)
  let reguladorResult: CalcularSFVResponse["regulador"] | undefined;
  if (data.tipoSistema === "aislado") {
    reguladorResult = { corrienteMinima: calcularRegulador(data.panelIsc, panelesParalelo) };
  }

  // 6. Cableado
  const corrienteCable = calcularCableado(data.panelIsc);

  // 7. Protecciones
  let proteccionesResult: CalcularSFVResponse["protecciones"] | undefined;
  if (data.tipoSistema === "aislado") {
    const iRegulador = reguladorResult!.corrienteMinima;
    const Ic = (data.panelPotencia * panelesParalelo * panelesSerie) / voltajeBateria;
    proteccionesResult = {
      corrienteFusible: calcularFusibleAislado(iRegulador),
      breakerCC: calcularBreakerAislado(data.panelIsc, panelesParalelo),
      seccionadorVoltaje: calcularInterruptorSeccionador(data.panelVoc, data.panelIsc).voltaje,
      seccionadorCorriente: calcularInterruptorSeccionador(data.panelVoc, data.panelIsc).corriente,
      sobretensionesVoltaje: calcularSobretensiones(data.panelVoc),
      termomagneticoCorriente: calcularTermomagnetico(Ic),
    } as CalcularSFVResponse["protecciones"];
  } else if (data.tipoSistema === "interconectado") {
    proteccionesResult = {
      corrienteFusible: calcularFusibleInterconectado(data.panelIsc),
      seccionadorVoltaje: calcularInterruptorSeccionador(data.panelVoc, data.panelIsc).voltaje,
      seccionadorCorriente: calcularInterruptorSeccionador(data.panelVoc, data.panelIsc).corriente,
      sobretensionesVoltaje: calcularSobretensiones(data.panelVoc),
    } as CalcularSFVResponse["protecciones"];
  }

  // 8. Ambiental (usa energía post-paneles × 365, fiel al Python: energia_post_paneles = paneles * potencia_panel * hsp)
  const energiaAnualKwh = energiaPostPanelesKwh * 365;
  const ahorroCo2PrimerAnio = parseFloat((energiaAnualKwh * FACTOR_EMISION_CO2).toFixed(2));
  const { degradacion, ahorrosCo2 } = calcularVectoresAmbientales(energiaAnualKwh);
  const ahorroCo2TotalTon = parseFloat((ahorrosCo2.reduce((s, v) => s + v, 0) / 1000).toFixed(2));

  // 9. Económico
  let economicoResult: CalcularSFVResponse["economico"] | undefined;
  if (data.costoPorPanel !== undefined) {
    const precioKwh = data.metodoPerfil === "recibo" ? (precioKwhRecibo ?? 0) : (data.precioKwh ?? 0);
    // Python: costo_panel_total = costo_panel * paneles_serie * paneles_paralelo (paneles físicamente instalados)
    const costoPanelTotal = data.costoPorPanel * (panelesSerie * panelesParalelo);
    let costoTotal: number;
    if (data.tipoSistema === "aislado") {
      costoTotal = costoTotalAislado(
        costoPanelTotal, data.costoInversor ?? 0, data.costoRegulador ?? 0,
        data.costoBaterias ?? 0, data.costoProtecciones ?? 0, data.costoInstalacion ?? 0, data.costoCableado ?? 0
      );
    } else {
      costoTotal = costoTotalInterconectado(
        costoPanelTotal, data.costoInversor ?? 0, data.costoInstalacion ?? 0,
        data.costoProtecciones ?? 0, data.costoRegulador ?? 0, data.costoCableado ?? 0
      );
    }

    const ahorroPrimerAnio = ahorroAnual(energiaAnualKwh, precioKwh);
    const { vectorAhorros, ahorrosAcumulados, ahorroTotal } = calcularVectorAhorros(energiaAnualKwh, precioKwh);
    const flujo = flujoCajaAcumulado(costoTotal, vectorAhorros);
    const payback = calcularPaybackReal(flujo);

    economicoResult = {
      costoTotal,
      precioKwh: parseFloat(precioKwh.toFixed(4)),
      ahorroPrimerAnio,
      ahorroTotal,
      payback,
      vectorAhorros,
      ahorrosAcumulados,
      flujoCaja: flujo,
    };
  }

  const anguloInclinacion = data.tipoSistema === "interconectado"
    ? parseFloat((3.7 + 0.69 * data.latitud).toFixed(1))
    : parseFloat((Math.abs(data.latitud) + 10).toFixed(1));
  const orientacion: "sur" | "norte" = data.latitud > 0 ? "sur" : "norte";

  const resultado: CalcularSFVResponse = {
    energiaDiariaKwh: energiaKwh,
    potenciaDemandaKw: potenciaKw,
    anguloInclinacion,
    orientacion,
    // Python: "total de paneles a instalar" = paneles_serie * paneles_paralelo (instalados físicamente)
    paneles: { totalPaneles: panelesSerie * panelesParalelo, panelesSerie, panelesParalelo, voltajeSistema, corrienteSistema },
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
    ...(economicoResult ? { economico: economicoResult } : {}),
  };

  res.json(resultado);
});

export default router;
