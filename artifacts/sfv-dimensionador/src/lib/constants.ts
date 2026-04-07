// ── Catálogo de Paneles Solares ─────────────────────────────
export type TipoPanel = "Monocristalino" | "Policristalino";

export interface PanelModelo {
  modelo: string;
  fabricante: string;
  tipo: TipoPanel;
  Vnom: number;
  Pmax: number;
  Vmp: number;
  Imp: number;
  Voc: number;
  Isc: number;
}

export const CATALOGO_PANELES: PanelModelo[] = [
  { modelo: "Himalaya G10 Series HUASUN",          fabricante: "HUASUN",     tipo: "Monocristalino", Vnom: 24, Pmax: 555, Vmp: 43.91, Imp: 12.64, Voc: 53.04, Isc: 13.06 },
  { modelo: "5BB PERC DV BIFACIAL-IUSASOL-PV-04 290", fabricante: "IUSASOL", tipo: "Monocristalino", Vnom: 12, Pmax: 290, Vmp: 32.2,  Imp:  9.03, Voc: 39.4,  Isc:  9.51 },
  { modelo: "5BB PERC DV BIFACIAL-IUSASOL-PV-04 300", fabricante: "IUSASOL", tipo: "Monocristalino", Vnom: 12, Pmax: 300, Vmp: 33.0,  Imp:  9.12, Voc: 39.8,  Isc:  9.61 },
  { modelo: "JA-M66D46-710/LB",                   fabricante: "JA Solar",   tipo: "Monocristalino", Vnom: 24, Pmax: 720, Vmp: 41.19, Imp: 17.48, Voc: 49.0,  Isc: 18.59 },
  { modelo: "Half-Cut Solar Module ERASOLAR",      fabricante: "ERASOLAR",   tipo: "Monocristalino", Vnom: 24, Pmax: 450, Vmp: 41.5,  Imp: 10.85, Voc: 49.3,  Isc: 11.60 },
  { modelo: "Blue Solar SPP041151202",             fabricante: "Blue Solar", tipo: "Policristalino",  Vnom: 12, Pmax: 115, Vmp: 18.9,  Imp:  6.08, Voc: 22.73, Isc:  6.56 },
  { modelo: "Blue Solar SPP043302402",             fabricante: "Blue Solar", tipo: "Policristalino",  Vnom: 24, Pmax: 330, Vmp: 37.3,  Imp:  8.86, Voc: 44.72, Isc:  9.57 },
  { modelo: "POWEST Policristalino",               fabricante: "POWEST",     tipo: "Policristalino",  Vnom: 12, Pmax:  50, Vmp: 18.7,  Imp:  2.68, Voc: 22.5,  Isc:  2.86 },
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
