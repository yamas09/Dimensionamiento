import { useState } from "react";
import { MapPin, Zap, Battery, Sun, ArrowRight, ArrowLeft, Check } from "lucide-react";

const STEPS = [
  {
    id: 1, icon: MapPin, label: "Datos Geográficos",
    sub: "Ubicación e insolación (HSP)",
    accentColor: "from-sky-400 to-blue-500",
    bgAccent: "from-sky-50 to-blue-50",
    borderAccent: "border-sky-200",
  },
  {
    id: 2, icon: Zap, label: "Perfil de Consumo",
    sub: "Demanda y tipo de sistema",
    accentColor: "from-violet-400 to-purple-500",
    bgAccent: "from-violet-50 to-purple-50",
    borderAccent: "border-violet-200",
  },
  {
    id: 3, icon: Battery, label: "Banco de Baterías",
    sub: "Almacenamiento para sistema aislado",
    accentColor: "from-amber-400 to-orange-500",
    bgAccent: "from-amber-50 to-orange-50",
    borderAccent: "border-amber-200",
    onlyAislado: true,
  },
  {
    id: 4, icon: Sun, label: "Panel Fotovoltaico",
    sub: "Ficha técnica del módulo solar",
    accentColor: "from-emerald-400 to-teal-500",
    bgAccent: "from-emerald-50 to-teal-50",
    borderAccent: "border-emerald-200",
  },
];

export function FullscreenStep() {
  const [active, setActive] = useState(1);
  const visible = STEPS;
  const currentIdx = visible.findIndex(s => s.id === active);
  const step = visible[currentIdx];
  const Icon = step.icon;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${step.bgAccent} flex flex-col transition-all duration-500`}>
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${step.accentColor} flex items-center justify-center shadow-md`}>
            <Sun className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-700 text-sm">DimensionadorSFV</span>
        </div>

        {/* Inline dot progress */}
        <div className="flex items-center gap-2">
          {visible.map((s, i) => {
            const isPast = active > s.id;
            const isCurrent = active === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => setActive(s.id)}
                  className={`transition-all duration-300 rounded-full flex items-center justify-center
                    ${isCurrent ? `w-8 h-8 bg-gradient-to-br ${step.accentColor} shadow-lg` : "w-5 h-5"}
                    ${isPast ? "bg-slate-300" : !isCurrent ? "bg-slate-200" : ""}
                  `}
                >
                  {isPast
                    ? <Check className="w-3 h-3 text-slate-500" />
                    : isCurrent
                      ? <span className="text-white text-xs font-bold">{s.id}</span>
                      : <span className="text-slate-400 text-[10px] font-bold">{s.id}</span>
                  }
                </button>
                {i < visible.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full ${active > s.id ? "bg-slate-300" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Central step card */}
      <div className="flex-1 flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Big step number + title header */}
          <div className={`rounded-3xl border-2 ${step.borderAccent} bg-white/80 backdrop-blur-sm shadow-2xl overflow-hidden`}>
            {/* Accent header strip */}
            <div className={`bg-gradient-to-r ${step.accentColor} px-8 py-6`}>
              <div className="flex items-end gap-4">
                <div className="text-white/30 text-8xl font-black leading-none select-none">
                  0{currentIdx + 1}
                </div>
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5 text-white" />
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                      Paso {currentIdx + 1} de {visible.length}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white leading-tight">{step.label}</h2>
                  <p className="text-white/70 text-sm mt-0.5">{step.sub}</p>
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="p-8">
              {active === 1 && <Content1 />}
              {active === 2 && <Content2 />}
              {active === 3 && <Content3 />}
              {active === 4 && <Content4 />}

              {/* Navigation */}
              <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setActive(v => visible[Math.max(0, currentIdx - 1)].id)}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-0 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => setActive(v => visible[Math.min(visible.length - 1, currentIdx + 1)].id)}
                  className={`flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${step.accentColor} shadow-lg hover:-translate-y-0.5 transition-all`}
                >
                  {currentIdx === visible.length - 1 ? "Calcular" : "Siguiente"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, placeholder, span2 }: { label: string; placeholder: string; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
      <input readOnly placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none" />
    </div>
  );
}

function Content1() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <F label="Latitud" placeholder="Ej. 19.43" />
      <F label="Longitud" placeholder="Ej. −99.13" />
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Estado</label>
        <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-400">
          <option>Seleccione un estado…</option>
          <option>Ciudad de México — 6.02 HSP</option>
          <option>Sonora — 6.70 HSP</option>
        </select>
      </div>
      <F label="Horas Sol Pico (HSP)" placeholder="Ej. 5.2" />
    </div>
  );
}

function Content2() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tipo de Sistema</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["aislado","interconectado","bombeo"].map((t,i) => (
              <button key={t} className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize ${i===0?"bg-white text-violet-600 shadow-sm":"text-slate-400"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Método de Perfil</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["cargas","recibo"].map((t,i) => (
              <button key={t} className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize ${i===0?"bg-white text-violet-600 shadow-sm":"text-slate-400"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-400 uppercase">
            <tr>{["Elemento","Tipo","Cant.","Pot.W","Hrs/día",""].map(h=><th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[["Focos LED","AC","5","15","4"],["Refrigerador","AC","1","150","8"],["TV","AC","1","80","4"]].map((r,i)=>(
              <tr key={i} className="bg-white">{r.map((c,j)=><td key={j} className="px-3 py-2.5 text-slate-700">{c}</td>)}<td className="px-3 py-2 text-slate-300 text-center">×</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Content3() {
  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="flex-1 bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Voltaje del sistema</p>
          <p className="text-3xl font-black text-amber-700 mt-1">24 V</p>
          <p className="text-xs text-amber-500 mt-1">Energía: 1.82 kWh/día</p>
        </div>
        <div className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Capacidad requerida</p>
          <p className="text-3xl font-black text-orange-700 mt-1">185 Ah</p>
          <p className="text-xs text-orange-500 mt-1">DoD 70% · 2 días autonomía</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tipo de Batería</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["Plomo (70%)","Litio (90%)"].map((t,i)=>(
              <button key={t} className={`flex-1 py-2 text-xs font-medium rounded-lg ${i===0?"bg-white text-amber-600 shadow-sm":"text-slate-400"}`}>{t}</button>
            ))}
          </div>
        </div>
        <F label="Días de Autonomía" placeholder="2 (recomendado 1–3)" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Catálogo — modelos compatibles con 24V</p>
        <div className="grid grid-cols-2 gap-2">
          {[["Plomo 200Ah 12V","✓ Cumple 185Ah req.",true],["Plomo 250Ah 12V","✓ Cumple 185Ah req.",false]].map(([m,s,sel])=>(
            <div key={m as string} className={`border-2 rounded-xl px-3 py-2.5 ${sel?"border-amber-400 bg-amber-50":"border-slate-200"}`}>
              <p className={`text-xs font-semibold ${sel?"text-amber-700":"text-slate-700"}`}>{m as string}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">{s as string}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Content4() {
  return (
    <div className="grid grid-cols-2 gap-5">
      {[["Voltaje Nominal (Vnom)","24 V"],["Potencia Máxima (Pmax)","450 W"],["Voltaje Máx. Pot. (Vmp)","41.5 V"],["Corriente Máx. Pot. (Imp)","10.8 A"],["Voltaje Circ. Abierto (Voc)","49.8 V"],["Corriente Cortocirc. (Isc)","11.4 A"]].map(([l,p])=>(
        <F key={l} label={l} placeholder={p} />
      ))}
    </div>
  );
}
