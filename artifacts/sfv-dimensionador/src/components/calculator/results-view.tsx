import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, ReferenceDot, Legend } from "recharts";
import { SFVResultado } from "@workspace/api-client-react";
import { Leaf, Sun, Zap, Battery, Cpu, Activity, Info, DollarSign, TrendingUp, PiggyBank, Clock, RotateCcw, Droplets, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultsViewProps {
  data: SFVResultado;
  onReset: () => void;
}

export function ResultsView({ data, onReset }: ResultsViewProps) {
  const environmentalData = data.ambiental.vectorAhorrosCo2.map((co2, index) => ({
    year: index + 1,
    co2: Number(co2.toFixed(2)),
    degradation: Number(data.ambiental.vectorDegradacion[index].toFixed(2)),
  }));

  const isBombeo = !!data.bomba;
  const isInterconectado = !data.bomba && !data.baterias;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-lg shadow-primary/5 border border-border">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Resultados del Dimensionamiento</h2>
          <p className="text-muted-foreground mt-1">Análisis completo del sistema fotovoltaico sugerido.</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium border-2 border-primary/20 text-primary hover:bg-primary/5 transition-colors shrink-0"
        >
          <RotateCcw className="w-4 h-4" /> Nuevo Cálculo
        </button>
      </div>

      {/* SECCIÓN 1 — DIMENSIONAMIENTO */}
      <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/20 rounded-3xl p-5 md:p-7 space-y-6 border border-orange-100">
      <SectionHeader icon={<Sun className="w-5 h-5 text-primary" />} title="Dimensionamiento" color="orange" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arreglo Fotovoltaico — ancho completo cuando no hay tarjeta de par (interconectado) */}
        <div className={cn(
          "bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border relative overflow-hidden group",
          !data.baterias && !data.bomba && "lg:col-span-2"
        )}>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sun className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Sun className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Arreglo Fotovoltaico</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <DataPoint label="Total Paneles"       value={data.paneles.totalPaneles} />
            <DataPoint label="Voltaje de Sistema"  value={`${data.paneles.voltajeSistema} V`} />
            <DataPoint label="Serie"               value={data.paneles.panelesSerie} />
            <DataPoint label="Paralelo"            value={data.paneles.panelesParalelo} />
            <DataPoint label="Corriente"           value={`${data.paneles.corrienteSistema.toFixed(2)} A`} />
          </div>
        </div>

        {/* Banco de Baterías (aislado) */}
        {data.baterias && (
          <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Battery className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <Battery className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Banco de Baterías</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <DataPoint label="Total Baterías"      value={data.baterias.totalBaterias} />
              <DataPoint label="Capacidad (Nominal)" value={`${data.baterias.capacidadNominal.toFixed(0)} Ah`} />
              <DataPoint label="Serie"               value={data.baterias.bateriasSerie} />
              <DataPoint label="Paralelo"            value={data.baterias.bateriasParalelo} />
              <DataPoint label="Voltaje"             value={`${data.baterias.voltajeBateria} V`} />
              <DataPoint label="Prof. Descarga"      value={`${(data.baterias.dod * 100).toFixed(0)}%`} />
            </div>
          </div>
        )}

        {/* Bomba + Variador (bombeo) */}
        {data.bomba && (
          <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Droplets className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Sistema de Bombeo</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <DataPoint label="Potencia Eléctrica" value={`${data.bomba.potenciaKw.toFixed(3)} kW`} />
              <DataPoint label="Potencia (HP)"      value={`${data.bomba.potenciaHP.toFixed(3)} HP`} />
              <DataPoint label="Pot. Hidráulica"    value={`${data.bomba.potenciaHidraulicaW.toFixed(0)} W`} />
              <DataPoint label="Caudal"             value={`${(data.bomba.caudalM3s * 1000).toFixed(4)} L/s`} />
            </div>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              <strong>Nota:</strong> Seleccione la bomba comercial con la potencia inmediata superior a {data.bomba.potenciaHP.toFixed(3)} HP.
            </div>
          </div>
        )}

        {data.variador && (
          <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Settings className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Variador de Frecuencia</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {data.variador.tipo && (
                <DataPoint label="Tipo recomendado" value={data.variador.tipo} />
              )}
              {data.variador.vocTotal !== undefined && (
                <DataPoint label="Voc Total (arreglo)" value={`${data.variador.vocTotal.toFixed(2)} V`} />
              )}
              <DataPoint label="Corriente máxima" value={`${data.variador.corrienteMaxima.toFixed(2)} A`} />
            </div>
            {data.variador.tipo === "No compatible" && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                ⚠️ La configuración de paneles no cumple con ningún rango de variador (230 V o 400 V). Revisa el arreglo.
              </div>
            )}
          </div>
        )}

        {/* Componentes Eléctricos — ancho completo cuando no hay variador (aislado/interconectado) */}
        <div className={cn(
          "bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border",
          !data.variador && "lg:col-span-2"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Componentes Eléctricos</h3>
          </div>
          <div className="space-y-4">
            {data.inversor && (
              <SpecRow label="Inversor (I_min)" value={`${data.inversor.corrienteMinima.toFixed(2)} A`} />
            )}
            {data.regulador && (
              <SpecRow label="Regulador (I_min)" value={`${data.regulador.corrienteMinima.toFixed(2)} A`} />
            )}
            <SpecRow label="Cableado (I_min)" value={`${data.cableado.corrienteMinima.toFixed(2)} A`} />
            {data.protecciones && (
              <>
                {data.protecciones.corrienteFusible !== undefined && (
                  <SpecRow label="Fusible CC" value={`${data.protecciones.corrienteFusible.toFixed(2)} A`} accent />
                )}
                {data.protecciones.breakerCC !== undefined && (
                  <SpecRow label="Breaker CC" value={`${data.protecciones.breakerCC.toFixed(2)} A`} accent />
                )}
                {data.protecciones.seccionadorVoltaje !== undefined && (
                  <SpecRow label="Interruptor Seccionador" value={`${data.protecciones.seccionadorVoltaje.toFixed(2)} V / ${data.protecciones.seccionadorCorriente?.toFixed(2)} A`} accent />
                )}
                {data.protecciones.sobretensionesVoltaje !== undefined && (
                  <SpecRow label="Protector Sobretensiones" value={`${data.protecciones.sobretensionesVoltaje.toFixed(2)} V`} accent />
                )}
                {data.protecciones.termomagneticoCorriente !== undefined && (
                  <SpecRow label="Termomagnético CA" value={`${data.protecciones.termomagneticoCorriente.toFixed(2)} A`} accent />
                )}
              </>
            )}
          </div>
        </div>
        {/* Ángulo óptimo de inclinación */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ángulo Óptimo de Inclinación</h3>
              <p className="text-sm text-muted-foreground">
                {isInterconectado ? "Fórmula optimizada: β = 3.7 + 0.69 × φ" : "Según IDAE (uso anual): β = |φ| + 10°"}
              </p>
            </div>
            <div className="ml-auto text-4xl font-bold text-primary">{data.anguloInclinacion}°</div>
          </div>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* SVG diagrama */}
            <div className="w-full md:w-72 shrink-0">
              {(() => {
                const β = data.anguloInclinacion;
                const βRad = (β * Math.PI) / 180;
                const arcR = 44;
                const arcX = 50 + arcR * Math.cos(βRad);
                const arcY = 100 - arcR * Math.sin(βRad);
                const midAngleRad = βRad / 2;
                return (
                  <svg viewBox="0 0 220 128" className="w-full h-auto" aria-label={`Diagrama de inclinación ${β}°`}>
                    {/* Fondo suave */}
                    <rect x="0" y="0" width="220" height="128" rx="12" fill="#fafafa" />
                    {/* Línea de tierra */}
                    <line x1="10" y1="100" x2="210" y2="100" stroke="#64748b" strokeWidth="2" />
                    {/* Trazos de tierra */}
                    {Array.from({ length: 11 }, (_, i) => (
                      <line key={i} x1={15 + i * 18} y1="100" x2={8 + i * 18} y2="112" stroke="#94a3b8" strokeWidth="1" />
                    ))}
                    {/* Panel solar */}
                    <g transform={`translate(50,100) rotate(-${β})`}>
                      <rect x="0" y="-11" width="130" height="11" rx="2" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
                      {[33, 66, 99].map(x => (
                        <line key={x} x1={x} y1="-11" x2={x} y2="0" stroke="#c2410c" strokeWidth="0.7" opacity="0.6" />
                      ))}
                      <line x1="0" y1="-5.5" x2="130" y2="-5.5" stroke="#c2410c" strokeWidth="0.7" opacity="0.6" />
                    </g>
                    {/* Línea de referencia horizontal */}
                    <line x1="50" y1="100" x2="120" y2="100" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
                    {/* Arco del ángulo */}
                    <path
                      d={`M ${50 + arcR} 100 A ${arcR} ${arcR} 0 0 0 ${arcX.toFixed(2)} ${arcY.toFixed(2)}`}
                      fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 2"
                    />
                    {/* Etiqueta del ángulo */}
                    <text
                      x={(50 + (arcR + 17) * Math.cos(midAngleRad)).toFixed(1)}
                      y={(100 - (arcR + 17) * Math.sin(midAngleRad)).toFixed(1)}
                      fontSize="13" fontWeight="bold" fill="#ea580c"
                      textAnchor="middle" dominantBaseline="middle"
                    >
                      {β}°
                    </text>
                    {/* Etiqueta orientación */}
                    <text x="195" y="94" fontSize="9" fill="#94a3b8" textAnchor="middle">{data.orientacion === "sur" ? "Sur ☀" : "Norte ☀"}</text>
                  </svg>
                );
              })()}
            </div>
            {/* Texto explicativo */}
            <div className="flex-1 space-y-3 text-sm text-muted-foreground">
              <p>
                Para maximizar la captación anual de energía solar, los paneles deben orientarse hacia el{" "}
                <strong>{data.orientacion === "sur" ? "sur geográfico" : "norte geográfico"}</strong> con una inclinación de{" "}
                <strong>{data.anguloInclinacion}°</strong> respecto a la horizontal.
              </p>
              <p>
                {isInterconectado
                  ? <>Esta inclinación está calculada con la fórmula optimizada <strong>β = 3.7 + 0.69 × φ</strong> para sistemas interconectados.</>
                  : <>Esta recomendación está basada en la metodología del <strong>IDAE</strong> (Instituto para la Diversificación y Ahorro de la Energía), que establece <strong>β = |φ| + 10°</strong> para instalaciones de uso anual continuo.</>
                }
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <p className="text-orange-800 text-xs">
                  <strong>Nota:</strong> Asegúrate de que no existan sombras sobre los paneles en el ángulo seleccionado. Ajusta la inclinación según las condiciones específicas del sitio si es necesario.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>{/* /section-1 */}

      {/* SECCIÓN 2 — ELÉCTRICO */}
      <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/20 rounded-3xl p-5 md:p-7 space-y-6 border border-amber-100">
      <SectionHeader icon={<Zap className="w-5 h-5 text-amber-500" />} title="Eléctrico" color="amber" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title={isBombeo ? "Energía Necesaria (Bombeo)" : "Energía Diaria"}
          value={data.energiaDiariaKwh.toFixed(3)}
          unit="kWh/día"
          icon={<Zap className="w-5 h-5 text-amber-500" />}
          colorClass="bg-amber-50"
        />
        <MetricCard
          title={isBombeo ? "Potencia Bomba" : "Potencia Demandada"}
          value={data.potenciaDemandaKw.toFixed(3)}
          unit="kW"
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          colorClass="bg-blue-50"
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Energía generada con degradación (25 años)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={environmentalData} margin={{ top: 5, right: 20, bottom: 30, left: 55 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                label={{ value: 'Años', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                label={{ value: 'Energía [kWh]', angle: -90, position: 'insideLeft', offset: -35, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => [`${val} kWh`, 'Energía Generada']}
                labelFormatter={(val) => `Año ${val}`}
              />
              <Line type="monotone" dataKey="degradation" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>{/* /section-2 */}

      {/* SECCIÓN 3 — AMBIENTAL */}
      <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/20 rounded-3xl p-5 md:p-7 space-y-6 border border-green-100">
      <SectionHeader icon={<Leaf className="w-5 h-5 text-green-600" />} title="Ambiental" color="green" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title="Ahorro CO₂ (1er Año)"
          value={data.ambiental.ahorroCo2PrimerAnio.toFixed(2)}
          unit="kg CO₂"
          icon={<Leaf className="w-5 h-5 text-orange-500" />}
          colorClass="bg-orange-50"
        />
        <MetricCard
          title="Ahorro CO₂ Total"
          value={data.ambiental.ahorroCo2TotalTon.toFixed(2)}
          unit="Ton (25 Años)"
          icon={<Leaf className="w-5 h-5 text-amber-600" />}
          colorClass="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 shadow-xl shadow-orange-500/20 text-white flex flex-col justify-center relative overflow-hidden">
          <Leaf className="absolute -bottom-4 -right-4 w-48 h-48 opacity-10" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Impacto Ambiental</h3>
            <p className="text-orange-50 mb-6 leading-relaxed">
              Este sistema generará <strong>{data.ambiental.energiaAnualKwh.toFixed(0)} kWh</strong> durante su primer año de operación.
            </p>
            <div className="bg-black/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 text-orange-100 mt-0.5" />
                <p className="text-sm text-orange-50">
                  Al cabo de 25 años, evitarás la emisión de <strong>{data.ambiental.ahorroCo2TotalTon.toFixed(1)} toneladas</strong> de CO₂, equivalente a plantar entre <strong>{Math.round(data.ambiental.ahorroCo2TotalTon * 1000 / 25)}</strong> y <strong>{Math.round(data.ambiental.ahorroCo2TotalTon * 1000 / 20)}</strong> árboles (20–25 kg CO₂ absorbido por árbol al año).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-orange-500" />
            Ahorro Anual de CO₂ (25 Años)
          </h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={environmentalData} margin={{ top: 5, right: 20, bottom: 30, left: 55 }}>
                <defs>
                  <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Años', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'CO₂ [kg]', angle: -90, position: 'insideLeft', offset: -35, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`${val} kg CO₂`, 'Ahorro anual']}
                  labelFormatter={(val) => `Año ${val}`}
                />
                <Area type="monotone" dataKey="co2" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCo2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>{/* /section-3 */}

      {/* SECCIÓN 4 — ECONÓMICO (solo si existe) */}
      {data.economico && (() => {
        const eco = data.economico!;
        const fmt = (n: number) =>
          n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Flujo de caja: 26 puntos, año 0..25
        const flujoData = (eco.flujoCaja ?? []).map((val, i) => ({ year: i, flujo: val }));

        return (
          <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/20 rounded-3xl p-5 md:p-7 space-y-6 border border-violet-100">
            <SectionHeader icon={<DollarSign className="w-5 h-5 text-violet-600" />} title="Económico" color="violet" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Inversión Total"
                value={`$${fmt(eco.costoTotal)}`}
                unit="MXN"
                icon={<DollarSign className="w-5 h-5 text-violet-500" />}
                colorClass="bg-violet-50"
              />
              <MetricCard
                title="Retorno (ROI)"
                value={eco.payback !== null
                  ? Number.isInteger(eco.payback) ? `Año ${eco.payback}` : `${Number(eco.payback).toFixed(1)} años`
                  : "Sin retorno"}
                unit={eco.payback !== null ? "de recuperación" : "en 25 años"}
                icon={<Clock className="w-5 h-5 text-blue-500" />}
                colorClass="bg-blue-50"
              />
              <MetricCard
                title={isBombeo ? "Ahorro anual (vs convencional)" : "Ahorro 1er Año"}
                value={`$${fmt(eco.ahorroPrimerAnio)}`}
                unit="MXN/año"
                icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
                colorClass="bg-orange-50"
              />
              <MetricCard
                title="Ahorro Total (25 años)"
                value={`$${fmt(eco.ahorroTotal)}`}
                unit="MXN"
                icon={<PiggyBank className="w-5 h-5 text-green-500" />}
                colorClass="bg-green-50"
              />
            </div>

            {/* Bombeo: costos comparativos */}
            {isBombeo && eco.costoConvencional !== undefined && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard
                  title="Costo Anual Sistema Actual"
                  value={`$${fmt(eco.costoConvencional)}`}
                  unit="MXN/año"
                  icon={<Zap className="w-5 h-5 text-red-500" />}
                  colorClass="bg-red-50"
                />
                <MetricCard
                  title="Mantenimiento Solar (2%/año)"
                  value={`$${fmt(eco.costoMantenimiento ?? 0)}`}
                  unit="MXN/año"
                  icon={<Settings className="w-5 h-5 text-slate-500" />}
                  colorClass="bg-slate-50"
                />
              </div>
            )}

            {/* Gráfica comparativa Solar vs Convencional (solo bombeo) */}
            {isBombeo && eco.costoConvencional !== undefined && (eco.flujoCaja?.length ?? 0) >= 26 && (() => {
              const convAnual = eco.costoConvencional!;
              const comparacionData = Array.from({ length: 25 }, (_, i) => ({
                year: i + 1,
                solar: parseFloat((eco.flujoCaja![i + 1]).toFixed(2)),
                convencional: parseFloat((-convAnual * (i + 1)).toFixed(2)),
              }));
              return (
                <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Comparación: Sistema Solar vs Convencional
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    El sistema solar recupera la inversión y supera al sistema convencional cuando su línea cruza la del sistema actual.
                  </p>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparacionData} margin={{ top: 10, right: 20, bottom: 30, left: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="year"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          label={{ value: 'Año', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          tickFormatter={(v) => v >= 0 ? `$${(v / 1000).toFixed(0)}k` : `-$${(Math.abs(v) / 1000).toFixed(0)}k`}
                          label={{ value: 'Flujo acumulado [$MXN]', angle: -90, position: 'insideLeft', offset: -50, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                        />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={2} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(val: number, name: string) => [`$${fmt(val)} MXN`, name === 'solar' ? 'Sistema Solar' : 'Sistema Convencional']}
                          labelFormatter={(val) => `Año ${val}`}
                        />
                        <Legend
                          formatter={(value) => value === 'solar' ? 'Sistema Solar' : 'Sistema Convencional'}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                        />
                        <Line type="monotone" dataKey="solar" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="convencional" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* Gráfica flujo de caja acumulado */}
            {flujoData.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Flujo de Caja Acumulado (25 Años)
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Muestra la recuperación de la inversión año a año. La inversión se recupera cuando el flujo cruza cero.
                </p>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={flujoData} margin={{ top: 24, right: 24, bottom: 30, left: 70 }}>
                      <defs>
                        <linearGradient id="colorFlujoPos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFlujoNeg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        label={{ value: 'Año', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(v) => v >= 0 ? `$${(v / 1000).toFixed(0)}k` : `-$${(Math.abs(v) / 1000).toFixed(0)}k`}
                        label={{ value: 'Flujo [$MXN]', angle: -90, position: 'insideLeft', offset: -50, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      {/* Línea de equilibrio visible */}
                      <ReferenceLine
                        y={0}
                        stroke="#7c3aed"
                        strokeDasharray="6 4"
                        strokeWidth={2.5}
                        label={{
                          value: "▶ Punto de equilibrio",
                          position: "insideTopLeft",
                          fill: "#7c3aed",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [
                          `$${fmt(val)} MXN`,
                          val >= 0 ? 'Ganancia acumulada' : 'Inversión pendiente'
                        ]}
                        labelFormatter={(val) => `Año ${val}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="flujo"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorFlujoPos)"
                      />
                      {/* Marcador en el año de recuperación */}
                      {eco.payback !== null && (() => {
                        const yr = Math.ceil(eco.payback!);
                        const yVal = flujoData[yr]?.flujo ?? 0;
                        return (
                          <ReferenceDot
                            x={yr}
                            y={yVal}
                            r={8}
                            fill="#7c3aed"
                            stroke="white"
                            strokeWidth={2.5}
                            label={{
                              value: `Año ${yr}`,
                              position: 'top',
                              fill: '#7c3aed',
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          />
                        );
                      })()}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: "orange" | "amber" | "green" | "violet" }) {
  const colorMap = {
    orange: "from-orange-50 to-transparent border-orange-200 text-orange-700",
    amber:  "from-amber-50 to-transparent border-amber-200 text-amber-700",
    green:  "from-green-50 to-transparent border-green-200 text-green-700",
    violet: "from-violet-50 to-transparent border-violet-200 text-violet-700",
  };
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3 rounded-xl border bg-gradient-to-r", colorMap[color])}>
      {icon}
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function MetricCard({ title, value, unit, icon, colorClass }: { title: string; value: string; unit: string; icon: React.ReactNode; colorClass: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-border flex items-start gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={cn("p-3 rounded-xl shrink-0", colorClass)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-baseline gap-1 flex-wrap">
          <span className="text-xl font-bold tracking-tight text-foreground">{value}</span>
          {unit && <span className="text-sm font-medium text-muted-foreground mb-1">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SpecRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center pb-3 border-b border-border/50 last:border-0 last:pb-0">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn("font-bold", accent ? "text-destructive" : "text-foreground")}>{value}</span>
    </div>
  );
}
