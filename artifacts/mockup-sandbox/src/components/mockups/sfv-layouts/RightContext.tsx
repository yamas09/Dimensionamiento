import { useState } from "react";
import { MapPin, Zap, Battery, Sun, Check, ChevronRight, Info } from "lucide-react";

const STEPS = [
  {
    id: 1, label: "Ubicación", icon: MapPin,
    description: "Definimos el sitio de instalación para conocer la radiación solar disponible (HSP).",
    tips: ["El HSP varía entre 4.9 y 6.9 h/día en México.", "Selecciona tu estado para autocompletar."],
  },
  {
    id: 2, label: "Perfil de Consumo", icon: Zap,
    description: "Caracterizamos la demanda eléctrica que el sistema deberá cubrir diariamente.",
    tips: ["Para sistemas aislados, sé preciso con las horas de uso.", "Las cargas AC se multiplican ×1.1 por el inversor."],
  },
  {
    id: 3, label: "Baterías", icon: Battery,
    description: "Dimensionamos el banco de almacenamiento para los días de autonomía requeridos.",
    tips: ["Un mayor DoD alarga los ciclos pero reduce la vida útil.", "Recomendamos 1–3 días de autonomía."],
    onlyAislado: true,
  },
  {
    id: 4, label: "Panel Solar", icon: Sun,
    description: "Ingresa los parámetros del módulo para calcular el arreglo fotovoltaico exacto.",
    tips: ["Los datos vienen en la hoja de datos (datasheet) del fabricante.", "Verifica los valores a condiciones estándar (STC)."],
  },
];

export function RightContext() {
  const [active, setActive] = useState(1);
  const tipoSistema = "aislado";
  const visible = STEPS.filter(s => !(s.onlyAislado && tipoSistema !== "aislado"));
  const currentStep = visible.find(s => s.id === active)!;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Sun className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-800 text-sm">DimensionadorSFV</span>
        <span className="ml-auto text-xs text-slate-400 font-medium">Sistema Aislado</span>
      </nav>

      {/* Main Layout: Form LEFT + Context RIGHT */}
      <div className="flex flex-1 max-w-5xl mx-auto w-full px-4 py-8 gap-6">

        {/* LEFT — Form Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-lg p-8 flex flex-col">
          {/* Step header inside form */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
              <currentStep.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Paso {visible.findIndex(s => s.id === active) + 1} de {visible.length}</p>
              <h2 className="text-lg font-bold text-slate-900 leading-none mt-0.5">{currentStep.label}</h2>
            </div>
          </div>

          <div className="flex-1">
            {active === 1 && <FormStep1 />}
            {active === 2 && <FormStep2 />}
            {active === 3 && <FormStep3 />}
            {active === 4 && <FormStep4 />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setActive(v => Math.max(visible[0].id, v - 1))}
              disabled={active === visible[0].id}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-0 transition-all"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setActive(v => {
                const idx = visible.findIndex(s => s.id === v);
                return visible[Math.min(visible.length - 1, idx + 1)].id;
              })}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {active === visible[visible.length - 1].id ? "Calcular →" : "Siguiente →"}
            </button>
          </div>
        </div>

        {/* RIGHT — Context Panel */}
        <div className="w-72 flex flex-col gap-4 shrink-0">
          {/* Steps list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Progreso</p>
            <div className="space-y-1">
              {visible.map((step) => {
                const isPast = active > step.id;
                const isActive = active === step.id;
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActive(step.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
                      ${isActive ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-500"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${isActive ? "bg-emerald-500 text-white" : isPast ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {isPast ? <Check className="w-3 h-3" /> : step.id}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? "text-emerald-700" : isPast ? "text-slate-700" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context description */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 opacity-80" />
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">¿Por qué este paso?</p>
            </div>
            <p className="text-sm leading-relaxed opacity-95 mb-4">{currentStep.description}</p>
            <div className="space-y-2">
              {currentStep.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs opacity-85">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Completion status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500">Avance total</p>
              <p className="text-xs font-bold text-emerald-600">
                {Math.round(((visible.findIndex(s => s.id === active)) / visible.length) * 100)}%
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((visible.findIndex(s => s.id === active)) / visible.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1.5">{children}</label>;
}
function Input({ placeholder }: { placeholder: string }) {
  return (
    <input readOnly placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm placeholder:text-slate-400" />
  );
}
function FormStep1() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div><Label>Latitud</Label><Input placeholder="Ej. 19.43" /></div>
      <div><Label>Longitud</Label><Input placeholder="Ej. −99.13" /></div>
      <div>
        <Label>Estado (autocompletar HSP)</Label>
        <select className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-400">
          <option>Seleccione un estado…</option>
          <option>Ciudad de México — 6.02 HSP</option>
          <option>Sonora — 6.70 HSP</option>
        </select>
      </div>
      <div><Label>Horas Sol Pico (HSP)</Label><Input placeholder="Ej. 5.2" /></div>
    </div>
  );
}
function FormStep2() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Sistema</Label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["aislado","interconectado","bombeo"].map((t,i) => (
              <button key={t} className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg capitalize ${i===0?"bg-white text-emerald-600 shadow-sm":"text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Método de Perfil</Label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["cargas","recibo"].map((t,i) => (
              <button key={t} className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize ${i===0?"bg-white text-emerald-600 shadow-sm":"text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-400 uppercase">
            <tr>{["Elemento","Tipo","Cant.","Pot. (W)","Horas",""].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[["Focos LED","AC","5","15","4"],["Refrigerador","AC","1","150","8"]].map((r,i) => (
              <tr key={i}>{r.map((c,j) => <td key={j} className="px-3 py-2 text-slate-700">{c}</td>)}<td className="px-3 py-2 text-slate-300">×</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function FormStep3() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] font-semibold text-blue-500 uppercase">Voltaje sistema</p>
          <p className="text-xl font-bold text-blue-800 mt-0.5">24 V</p>
        </div>
        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-[11px] font-semibold text-emerald-500 uppercase">Capacidad Cn</p>
          <p className="text-xl font-bold text-emerald-800 mt-0.5">185 Ah</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Batería</Label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["Plomo 70%","Litio 90%"].map((t,i) => (
              <button key={t} className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${i===0?"bg-white text-emerald-600 shadow-sm":"text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div><Label>Días de Autonomía</Label><Input placeholder="2 (rec. 1–3)" /></div>
      </div>
    </div>
  );
}
function FormStep4() {
  return (
    <div className="grid grid-cols-2 gap-5">
      {[["Voltaje Nominal (Vnom) [V]","24"],["Potencia (Pmax) [W]","450"],["Vmp [V]","41.5"],["Imp [A]","10.8"],["Voc [V]","49.8"],["Isc [A]","11.4"]].map(([l,p]) => (
        <div key={l}><Label>{l}</Label><Input placeholder={p} /></div>
      ))}
    </div>
  );
}
