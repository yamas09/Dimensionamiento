import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { SFVResultado } from "@workspace/api-client-react";
import { Leaf, Sun, Zap, Battery, ShieldAlert, Cpu, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultsViewProps {
  data: SFVResultado;
  onReset: () => void;
}

export function ResultsView({ data, onReset }: ResultsViewProps) {
  // Format arrays into recharts data objects
  const environmentalData = data.ambiental.vectorAhorrosCo2.map((co2, index) => ({
    year: index + 1,
    co2: Number(co2.toFixed(2)),
    degradation: Number(data.ambiental.vectorDegradacion[index].toFixed(2)),
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-lg shadow-primary/5 border border-border">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Resultados del Dimensionamiento</h2>
          <p className="text-muted-foreground mt-1">Análisis completo de su sistema fotovoltaico sugerido.</p>
        </div>
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-xl font-medium border-2 border-primary/20 text-primary hover:bg-primary/5 transition-colors"
        >
          Nuevo Cálculo
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Energía Diaria" 
          value={`${data.energiaDiariaKwh.toFixed(2)}`} 
          unit="kWh/día" 
          icon={<Zap className="w-5 h-5 text-amber-500" />} 
          colorClass="bg-amber-50"
        />
        <MetricCard 
          title="Potencia Demanda" 
          value={`${data.potenciaDemandaKw.toFixed(2)}`} 
          unit="kW" 
          icon={<Activity className="w-5 h-5 text-blue-500" />} 
          colorClass="bg-blue-50"
        />
        <MetricCard 
          title="Ahorro CO₂ (1er Año)" 
          value={`${data.ambiental.ahorroCo2PrimerAnio.toFixed(2)}`} 
          unit="kg CO₂" 
          icon={<Leaf className="w-5 h-5 text-orange-500" />} 
          colorClass="bg-orange-50"
        />
        <MetricCard 
          title="Ahorro CO₂ Total" 
          value={`${data.ambiental.ahorroCo2TotalTon.toFixed(2)}`} 
          unit="Ton (25 Años)" 
          icon={<Leaf className="w-5 h-5 text-amber-600" />} 
          colorClass="bg-amber-50"
        />
      </div>

      {/* Detailed Technical Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panels */}
        <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border relative overflow-hidden group">
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
            <DataPoint label="Total Paneles" value={data.paneles.totalPaneles} />
            <DataPoint label="Voltaje de Sistema" value={`${data.paneles.voltajeSistema.toFixed(2)} V`} />
            <DataPoint label="Serie" value={data.paneles.panelesSerie} />
            <DataPoint label="Paralelo" value={data.paneles.panelesParalelo} />
            <DataPoint label="Corriente" value={`${data.paneles.corrienteSistema.toFixed(2)} A`} />
          </div>
        </div>

        {/* Batteries */}
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
              <DataPoint label="Total Baterías" value={data.baterias.totalBaterias} />
              <DataPoint label="Capacidad (Nominal)" value={`${data.baterias.capacidadNominal.toFixed(2)} Ah`} />
              <DataPoint label="Serie" value={data.baterias.bateriasSerie} />
              <DataPoint label="Paralelo" value={data.baterias.bateriasParalelo} />
              <DataPoint label="Voltaje" value={`${data.baterias.voltajeBateria} V`} />
              <DataPoint label="Profundidad Descarga" value={`${(data.baterias.dod * 100).toFixed(0)}%`} />
            </div>
          </div>
        )}

        {/* Electrical Components */}
        <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Componentes Eléctricos</h3>
          </div>
          <div className="space-y-4">
            {data.inversor && (
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Inversor (I_min)</span>
                <span className="font-bold">{data.inversor.corrienteMinima.toFixed(2)} A</span>
              </div>
            )}
            {data.regulador && (
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Regulador (I_min)</span>
                <span className="font-bold">{data.regulador.corrienteMinima.toFixed(2)} A</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Cableado (I_min)</span>
              <span className="font-bold">{data.cableado.corrienteMinima.toFixed(2)} A</span>
            </div>
            {data.protecciones && (
              <>
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Fusible CC</span>
                  <span className="font-bold text-destructive">{data.protecciones.corrienteFusible.toFixed(2)} A</span>
                </div>
                {data.protecciones.breakerCC !== undefined && (
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Breaker CC</span>
                    <span className="font-bold text-destructive">{data.protecciones.breakerCC.toFixed(2)} A</span>
                  </div>
                )}
                {data.protecciones.seccionadorVoltaje !== undefined && (
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Interruptor Seccionador</span>
                    <span className="font-bold text-destructive">
                      {data.protecciones.seccionadorVoltaje.toFixed(2)} V / {data.protecciones.seccionadorCorriente?.toFixed(2)} A
                    </span>
                  </div>
                )}
                {data.protecciones.sobretensionesVoltaje !== undefined && (
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Protector Sobretensiones</span>
                    <span className="font-bold text-destructive">{data.protecciones.sobretensionesVoltaje.toFixed(2)} V</span>
                  </div>
                )}
                {data.protecciones.termomagneticoCorriente !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Termomagnético CA</span>
                    <span className="font-bold text-destructive">{data.protecciones.termomagneticoCorriente.toFixed(2)} A</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Environmental Summary */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 shadow-xl shadow-orange-500/20 text-white flex flex-col justify-center relative overflow-hidden">
          <Leaf className="absolute -bottom-4 -right-4 w-48 h-48 opacity-10" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Impacto Ambiental</h3>
            <p className="text-orange-50 mb-6 leading-relaxed">
              Este sistema fotovoltaico generará <strong>{data.ambiental.energiaAnualKwh.toFixed(0)} kWh</strong> durante su primer año de operación.
            </p>
            <div className="bg-black/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 text-orange-100 mt-0.5" />
                <p className="text-sm text-orange-50">
                  Al cabo de 25 años, evitarás la emisión de <strong>{data.ambiental.ahorroCo2TotalTon.toFixed(1)} toneladas</strong> de CO₂, equivalente a plantar cientos de árboles.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Degradación de Energía (25 Años)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={environmentalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
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

        <div className="bg-white rounded-2xl p-6 shadow-md shadow-black/5 border border-border">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-orange-500" />
            Ahorro Acumulado de CO₂ (25 Años)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={environmentalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`${val} Toneladas`, 'Ahorro Acumulado']}
                  labelFormatter={(val) => `Año ${val}`}
                />
                <Area type="monotone" dataKey="co2" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCo2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon, colorClass }: { title: string, value: string, unit: string, icon: React.ReactNode, colorClass: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-border flex items-start gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={cn("p-3 rounded-xl shrink-0", colorClass)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          <span className="text-sm font-medium text-muted-foreground mb-1">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function DataPoint({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
