// ── Catálogo de Paneles Solares ─────────────────────────────
export interface PanelModelo {
  modelo: string;
  fabricante: string;
  Vnom: number;
  Pmax: number;
  Vmp: number;
  Imp: number;
  Voc: number;
  Isc: number;
}

export const CATALOGO_PANELES: PanelModelo[] = [
  { modelo: "CS6K-300MS",          fabricante: "Canadian Solar", Vnom: 24, Pmax: 300, Vmp: 32.8, Imp:  9.14, Voc: 40.4, Isc:  9.70 },
  { modelo: "CS6L-330M",           fabricante: "Canadian Solar", Vnom: 24, Pmax: 330, Vmp: 35.8, Imp:  9.22, Voc: 44.2, Isc:  9.87 },
  { modelo: "HiKu CS3W-415MS",     fabricante: "Canadian Solar", Vnom: 24, Pmax: 415, Vmp: 39.1, Imp: 10.62, Voc: 47.4, Isc: 11.22 },
  { modelo: "JAM60S20-340/MR",     fabricante: "JA Solar",       Vnom: 24, Pmax: 340, Vmp: 34.7, Imp:  9.80, Voc: 42.0, Isc: 10.36 },
  { modelo: "JAM72S30-545/MR",     fabricante: "JA Solar",       Vnom: 24, Pmax: 545, Vmp: 41.4, Imp: 13.16, Voc: 49.6, Isc: 13.98 },
  { modelo: "JKM400M-54HL4",       fabricante: "Jinko Solar",    Vnom: 24, Pmax: 400, Vmp: 37.3, Imp: 10.72, Voc: 45.5, Isc: 11.32 },
  { modelo: "JKM450M-60H",         fabricante: "Jinko Solar",    Vnom: 24, Pmax: 450, Vmp: 42.0, Imp: 10.71, Voc: 50.2, Isc: 11.27 },
  { modelo: "LR4-60HPH-360M",      fabricante: "LONGi",          Vnom: 24, Pmax: 360, Vmp: 34.9, Imp: 10.32, Voc: 41.9, Isc: 10.93 },
  { modelo: "LR5-72HPH-540M",      fabricante: "LONGi",          Vnom: 24, Pmax: 540, Vmp: 41.9, Imp: 12.89, Voc: 50.4, Isc: 13.64 },
  { modelo: "RSM156-6-400M",       fabricante: "Risen Energy",   Vnom: 24, Pmax: 400, Vmp: 35.1, Imp: 11.38, Voc: 42.8, Isc: 12.17 },
  { modelo: "TSM-375DD14M(II)",    fabricante: "Trina Solar",    Vnom: 24, Pmax: 375, Vmp: 37.1, Imp: 10.11, Voc: 45.6, Isc: 10.75 },
  { modelo: "TSM-DE09.08-445W",    fabricante: "Trina Solar",    Vnom: 24, Pmax: 445, Vmp: 40.4, Imp: 11.01, Voc: 48.6, Isc: 11.63 },
  { modelo: "SRP-430-BMA",         fabricante: "Silfab Solar",   Vnom: 24, Pmax: 430, Vmp: 40.6, Imp: 10.59, Voc: 48.8, Isc: 11.20 },
  { modelo: "PM060MB4-300",        fabricante: "Astronergy",     Vnom: 24, Pmax: 300, Vmp: 32.5, Imp:  9.24, Voc: 39.8, Isc:  9.81 },
];

// ── Catálogo de Baterías ─────────────────────────────────────
export interface BateriaModelo {
  modelo: string;
  Ah: number;
  V: number;
}

export const CATALOGO_BATERIAS: Record<string, BateriaModelo[]> = {
  Plomo: [
    { modelo: "Plomo 100Ah 12V", Ah: 100, V: 12 },
    { modelo: "Plomo 150Ah 12V", Ah: 150, V: 12 },
    { modelo: "Plomo 200Ah 12V", Ah: 200, V: 12 },
    { modelo: "Plomo 250Ah 12V", Ah: 250, V: 12 },
  ],
  Litio: [
    { modelo: "Litio 50Ah 48V",  Ah:  50, V: 48 },
    { modelo: "Litio 100Ah 12V", Ah: 100, V: 12 },
    { modelo: "Litio 100Ah 24V", Ah: 100, V: 24 },
    { modelo: "Litio 100Ah 48V", Ah: 100, V: 48 },
    { modelo: "Litio 150Ah 12V", Ah: 150, V: 12 },
    { modelo: "Litio 150Ah 24V", Ah: 150, V: 24 },
    { modelo: "Litio 200Ah 12V", Ah: 200, V: 12 },
  ],
};

export const DOD_POR_TIPO: Record<string, number> = {
  Plomo: 0.7,
  Litio: 0.9,
};

export const MEXICAN_STATES_HSP: Record<string, number> = {
  "Aguascalientes": 6.67,
  "Baja California": 6.93,
  "Baja California Sur": 6.53,
  "Campeche": 5.96,
  "Chiapas": 5.81,
  "Chihuahua": 6.66,
  "Ciudad de México": 6.02,
  "Coahuila": 6.26,
  "Colima": 6.12,
  "Durango": 6.77,
  "Estado de México": 6.03,
  "Guanajuato": 6.61,
  "Guerrero": 6.24,
  "Hidalgo": 6.38,
  "Jalisco": 5.89,
  "Michoacán": 6.19,
  "Morelos": 6.22,
  "Nayarit": 6.27,
  "Nuevo León": 5.79,
  "Oaxaca": 6.24,
  "Puebla": 6.37,
  "Querétaro": 6.56,
  "Quintana Roo": 5.81,
  "San Luis Potosí": 6.45,
  "Sinaloa": 6.26,
  "Sonora": 6.70,
  "Tabasco": 5.52,
  "Tamaulipas": 5.87,
  "Tlaxcala": 6.19,
  "Veracruz": 4.93,
  "Yucatán": 5.62,
  "Zacatecas": 6.70,
};
