import { useState } from "react";
import { MapPin, Zap, Battery, Sun, Check, ChevronRight } from "lucide-react";

const STEPS = [
  { id: 1, label: "Ubicación", icon: MapPin, sub: "Estado · HSP" },
  { id: 2, label: "Perfil",    icon: Zap,    sub: "Consumo · Sistema" },
  { id: 3, label: "Baterías",  icon: Battery, sub: "Tipo · Capacidad", onlyAislado: true },
  { id: 4, label: "Panel",     icon: Sun,    sub: "Ficha técnica" },
];

export function HorizontalRail() {
  const [active, setActive] = useState(1);
  const tipoSistema = "aislado";
  const visible = STEPS.filter(s => !(s.onlyAislado && tipoSistema !== "aislado"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Sun className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm tracking-tight">DimensionadorSFV</span>
        </div>
        <div className="text-xs text-slate-400 font-medium">Sistema Aislado</div>
      </nav>

      {/* Page Title */}
      <div className="text-center pt-8 pb-4 px-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Dimensionador <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">SFV</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">Completa los 4 pasos para obtener el dimensionamiento técnico.</p>
      </div>

      {/* Horizontal Step Rail */}
      <div className="mx-auto w-full max-w-3xl px-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
          <div className="flex items-center">
            {visible.map((step, idx) => {
              const Icon = step.icon;
              const isPast = active > step.id;
              const isActive = active === step.id;
              const isLast = idx === visible.length - 1;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setActive(step.id)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isActive ? "bg-emerald-500 shadow-lg shadow-emerald-200 scale-110" : ""}
                      ${isPast ? "bg-emerald-100 text-emerald-600" : ""}
                      ${!isActive && !isPast ? "bg-slate-100 text-slate-400" : ""}
                    `}>
                      {isPast
                        ? <Check className="w-5 h-5 text-emerald-600" />
                        : <Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
                      }
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-semibold leading-none ${isActive ? "text-emerald-600" : isPast ? "text-slate-600" : "text-slate-400"}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{step.sub}</p>
                    </div>
                  </button>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all ${active > step.id ? "bg-emerald-300" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full-width Form Card */}
      <div className="mx-auto w-full max-w-3xl px-6 flex-1 pb-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-8">
          {active === 1 && <Step1 />}
          {active === 2 && <Step2 />}
          {active === 3 && <Step3 />}
          {active === 4 && <Step4 />}

          {/* Nav Buttons */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
            <button
              onClick={() => setActive(v => Math.max(1, v - 1))}
              disabled={active === 1}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-0 transition-all"
            >
              ← Anterior
            </button>
            <div className="text-xs text-slate-400 font-medium">
              Paso {active} de {visible.length}
            </div>
            <button
              onClick={() => setActive(v => Math.min(visible.length, v + 1))}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {active === visible.length ? "Calcular →" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, wide }: { label: string; placeholder: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input
        readOnly defaultValue=""
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

function StepHeader({ title, sub, icon: Icon }: { title: string; sub: string; icon: any }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      <p className="text-sm text-slate-500 ml-7">{sub}</p>
    </div>
  );
}

function Step1() {
  return (
    <div>
      <StepHeader icon={MapPin} title="Datos Geográficos" sub="Ubicación e insolación del sitio de instalación." />
      <div className="grid grid-cols-2 gap-5">
        <Field label="Latitud" placeholder="Ej. 19.43" />
        <Field label="Longitud" placeholder="Ej. −99.13" />
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado (autocompletar HSP)</label>
          <select className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-400">
            <option>Seleccione un estado…</option>
            <option>Ciudad de México</option>
            <option>Sonora</option>
            <option>Jalisco</option>
          </select>
        </div>
        <Field label="Horas Sol Pico (HSP)" placeholder="Ej. 5.2" />
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div>
      <StepHeader icon={Zap} title="Perfil de Consumo" sub="Define la demanda energética del sistema." />
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de Sistema</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["aislado", "interconectado", "bombeo"].map(t => (
              <button key={t} className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize ${t === "aislado" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Método de Perfil</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["cargas", "recibo"].map(t => (
              <button key={t} className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize ${t === "cargas" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase">
            <tr>
              {["Elemento","Tipo","Cant.","Potencia (W)","Horas/día",""].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[["Focos LED","AC","5","15","4"],["Refrigerador","AC","1","150","8"],["TV","AC","1","80","4"]].map((r,i) => (
              <tr key={i} className="bg-white">
                {r.map((c,j) => <td key={j} className="px-3 py-2 text-slate-700">{c}</td>)}
                <td className="px-3 py-2 text-slate-400 text-center">×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <StepHeader icon={Battery} title="Configuración de Baterías" sub="Banco de baterías para el sistema aislado." />
      <div className="flex gap-3 mb-6">
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-600 uppercase">Voltaje del sistema</p>
          <p className="text-2xl font-bold text-blue-800 mt-0.5">24 V</p>
          <p className="text-xs text-blue-500 mt-0.5">Energía estimada: 1.82 kWh/día</p>
        </div>
        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Capacidad requerida</p>
          <p className="text-2xl font-bold text-emerald-800 mt-0.5">185 Ah</p>
          <p className="text-xs text-emerald-500 mt-0.5">DoD 70% · 2 días autonomía</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de Batería</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["Plomo (70%)","Litio (90%)"].map((t,i) => (
              <button key={t} className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${i===0?"bg-white text-emerald-600 shadow-sm":"text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
        <Field label="Días de Autonomía" placeholder="2 (recomendado 1–3)" />
      </div>
    </div>
  );
}

function Step4() {
  return (
    <div>
      <StepHeader icon={Sun} title="Ficha Técnica del Panel" sub="Parámetros eléctricos del módulo solar." />
      <div className="grid grid-cols-2 gap-5">
        <Field label="Voltaje Nominal (Vnom) [V]" placeholder="24" />
        <Field label="Potencia (Pmax) [W]" placeholder="450" />
        <Field label="Voltaje Máx. Potencia (Vmp) [V]" placeholder="41.5" />
        <Field label="Corriente Máx. Potencia (Imp) [A]" placeholder="10.8" />
        <Field label="Voltaje Circuito Abierto (Voc) [V]" placeholder="49.8" />
        <Field label="Corriente Cortocircuito (Isc) [A]" placeholder="11.4" />
      </div>
    </div>
  );
}
