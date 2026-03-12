import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { useCalcularSFV, SFVInput, SFVResultado } from "@workspace/api-client-react";
import { MapPin, Sun, Zap, Battery, ArrowRight, ArrowLeft, Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { MEXICAN_STATES_HSP, CATALOGO_BATERIAS, DOD_POR_TIPO } from "@/lib/constants";
import { ResultsView } from "@/components/calculator/results-view";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ================= Schema Validation =================
const sfvSchema = z.object({
  latitud: z.coerce.number().min(-90).max(90, "Latitud inválida"),
  longitud: z.coerce.number().min(-180).max(180, "Longitud inválida"),
  hsp: z.coerce.number().min(1, "HSP debe ser mayor a 0"),
  tipoSistema: z.enum(["aislado", "interconectado", "bombeo"]),
  metodoPerfil: z.enum(["cargas", "recibo"]),
  cargas: z.array(z.object({
    elemento: z.string().min(1, "Requerido"),
    tipoCarga: z.enum(["AC", "DC"]),
    cantidad: z.coerce.number().min(1),
    potencia: z.coerce.number().min(1),
    horas: z.coerce.number().min(0.1).max(24)
  })).optional(),
  registrosRecibo: z.array(z.object({
    consumo: z.coerce.number().min(0),
    precio: z.coerce.number().min(0)
  })).optional(),
  diasPeriodoRecibo: z.coerce.number().optional(),
  panelVnom: z.coerce.number().min(1),
  panelPotencia: z.coerce.number().min(1),
  panelImp: z.coerce.number().min(0.1),
  panelVmp: z.coerce.number().min(1),
  panelIsc: z.coerce.number().min(0.1),
  panelVoc: z.coerce.number().min(1),
  tipoBateria: z.enum(["Plomo", "Litio"]).optional(),
  diasAutonomia: z.coerce.number().optional(),
  bateriaSeleccionMetodo: z.enum(["catalogo", "manual"]).optional(),
  bateriaAh: z.coerce.number().optional(),
  bateriaV: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.metodoPerfil === "cargas" && (!data.cargas || data.cargas.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Agrega al menos una carga", path: ["cargas"] });
  }
  if (data.metodoPerfil === "recibo") {
    if (!data.registrosRecibo || data.registrosRecibo.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Agrega al menos un registro", path: ["registrosRecibo"] });
    }
    if (!data.diasPeriodoRecibo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["diasPeriodoRecibo"] });
    }
  }
  if (data.tipoSistema === "aislado") {
    if (!data.tipoBateria) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona tipo de batería", path: ["tipoBateria"] });
    }
    if (!data.diasAutonomia) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["diasAutonomia"] });
    }
  }
});

type FormData = z.infer<typeof sfvSchema>;

const STEPS = [
  { id: 1, title: "Ubicación", icon: MapPin },
  { id: 2, title: "Perfil", icon: Zap },
  { id: 3, title: "Panel", icon: Sun },
  { id: 4, title: "Baterías", icon: Battery }, // Conditional
];

export default function CalculatorPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [result, setResult] = useState<SFVResultado | null>(null);
  const { toast } = useToast();

  const calculateMutation = useCalcularSFV();

  const methods = useForm<FormData>({
    resolver: zodResolver(sfvSchema),
    defaultValues: {
      tipoSistema: "interconectado",
      metodoPerfil: "cargas",
      cargas: [{ elemento: "Focos", tipoCarga: "AC", cantidad: 5, potencia: 15, horas: 4 }],
      registrosRecibo: [{ consumo: 300, precio: 500 }],
      diasPeriodoRecibo: 60,
      panelVnom: 24,
      panelPotencia: 450,
      panelImp: 10.8,
      panelVmp: 41.5,
      panelIsc: 11.4,
      panelVoc: 49.8,
      tipoBateria: "Plomo",
      diasAutonomia: 2,
      bateriaSeleccionMetodo: "catalogo",
      bateriaAh: undefined,
      bateriaV: undefined,
    },
    mode: "onChange"
  });

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = methods;

  const tipoSistema = watch("tipoSistema");
  const metodoPerfil = watch("metodoPerfil");
  const tipoBateria = watch("tipoBateria");
  const bateriaSeleccionMetodo = watch("bateriaSeleccionMetodo");

  const visibleSteps = STEPS.filter(s => {
    if (s.id === 4 && tipoSistema !== "aislado") return false;
    return true;
  });

  const isLastStep = activeStep === visibleSteps[visibleSteps.length - 1].id;

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (activeStep === 1) fieldsToValidate = ["latitud", "longitud", "hsp"];
    if (activeStep === 2) fieldsToValidate = ["tipoSistema", "metodoPerfil", "cargas", "registrosRecibo", "diasPeriodoRecibo"];
    if (activeStep === 3) fieldsToValidate = ["panelVnom", "panelPotencia", "panelImp", "panelVmp", "panelIsc", "panelVoc"];
    
    const isValid = await trigger(fieldsToValidate as any);
    
    if (isValid) {
      const currentIdx = visibleSteps.findIndex(s => s.id === activeStep);
      if (currentIdx < visibleSteps.length - 1) {
        setActiveStep(visibleSteps[currentIdx + 1].id);
      }
    } else {
      toast({ title: "Datos incompletos", description: "Revisa los campos marcados en rojo.", variant: "destructive" });
    }
  };

  const prevStep = () => {
    const currentIdx = visibleSteps.findIndex(s => s.id === activeStep);
    if (currentIdx > 0) {
      setActiveStep(visibleSteps[currentIdx - 1].id);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const response = await calculateMutation.mutateAsync({ data: data as SFVInput });
      setResult(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast({ title: "Cálculo Exitoso", description: "Dimensionamiento completado." });
    } catch (err) {
      toast({ title: "Error en cálculo", description: "Ocurrió un error al procesar los datos.", variant: "destructive" });
    }
  };

  if (result) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-24">
        <ResultsView data={result} onReset={() => setResult(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pt-24 min-h-screen flex flex-col">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          Dimensionador <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">SFV</span>
        </h1>
        <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
          Ingresa los parámetros de tu proyecto para obtener el dimensionamiento técnico y análisis ambiental.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start flex-1">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0 bg-white p-6 rounded-2xl shadow-lg border border-border shadow-black/5 sticky top-24">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto custom-scrollbar pb-2 lg:pb-0">
            {visibleSteps.map((step, idx) => {
              const isActive = activeStep === step.id;
              const isPast = activeStep > step.id;
              const Icon = step.icon;
              return (
                <div key={step.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all min-w-[140px] lg:min-w-0",
                  isActive ? "bg-primary/10 text-primary font-semibold" : 
                  isPast ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                    isActive ? "bg-primary text-white shadow-md shadow-primary/30" : 
                    isPast ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}>
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="whitespace-nowrap">{step.title}</span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Form Area */}
        <div className="flex-1 w-full bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-black/5 border border-border">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex-1 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* STEP 1 */}
                  {activeStep === 1 && (
                    <div className="space-y-6">
                      <div className="border-b border-border pb-4 mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="w-6 h-6 text-primary" /> Datos Geográficos</h2>
                        <p className="text-muted-foreground mt-1">Ubicación e insolación (HSP) del sitio de instalación.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField label="Latitud" error={errors.latitud?.message}>
                          <input type="number" step="any" {...methods.register("latitud")} className="input-field" placeholder="Ej. 19.43" />
                        </FormField>
                        <FormField label="Longitud" error={errors.longitud?.message}>
                          <input type="number" step="any" {...methods.register("longitud")} className="input-field" placeholder="Ej. -99.13" />
                        </FormField>
                        <FormField label="Estado (Autocompletar HSP)">
                          <select 
                            className="input-field cursor-pointer"
                            onChange={(e) => {
                              const val = MEXICAN_STATES_HSP[e.target.value];
                              if(val) setValue("hsp", val, { shouldValidate: true });
                            }}
                          >
                            <option value="">Seleccione un estado...</option>
                            {Object.keys(MEXICAN_STATES_HSP).map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Horas Sol Pico (HSP)" error={errors.hsp?.message}>
                          <input type="number" step="any" {...methods.register("hsp")} className="input-field" placeholder="Ej. 5.2" />
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {activeStep === 2 && (
                    <div className="space-y-6">
                      <div className="border-b border-border pb-4 mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Perfil de Consumo</h2>
                        <p className="text-muted-foreground mt-1">Defina cómo evaluaremos la demanda energética.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <FormField label="Tipo de Sistema">
                          <Controller
                            control={control}
                            name="tipoSistema"
                            render={({ field }) => (
                              <div className="flex bg-muted p-1 rounded-xl">
                                {["aislado", "interconectado", "bombeo"].map(t => (
                                  <button
                                    key={t} type="button"
                                    onClick={() => field.onChange(t)}
                                    className={cn("flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all", field.value === t ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            )}
                          />
                        </FormField>
                        <FormField label="Método de Perfil">
                          <Controller
                            control={control}
                            name="metodoPerfil"
                            render={({ field }) => (
                              <div className="flex bg-muted p-1 rounded-xl">
                                {["cargas", "recibo"].map(t => (
                                  <button
                                    key={t} type="button"
                                    onClick={() => field.onChange(t)}
                                    className={cn("flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all", field.value === t ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            )}
                          />
                        </FormField>
                      </div>

                      {metodoPerfil === "cargas" ? (
                        <CargasTable control={control} register={methods.register} errors={errors} />
                      ) : (
                        <RecibosTable control={control} register={methods.register} errors={errors} />
                      )}
                    </div>
                  )}

                  {/* STEP 3 */}
                  {activeStep === 3 && (
                    <div className="space-y-6">
                      <div className="border-b border-border pb-4 mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Sun className="w-6 h-6 text-primary" /> Ficha Técnica del Panel</h2>
                        <p className="text-muted-foreground mt-1">Parámetros eléctricos del módulo solar seleccionado.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField label="Voltaje Nominal (Vnom) [V]" error={errors.panelVnom?.message}>
                          <input type="number" step="any" {...methods.register("panelVnom")} className="input-field" />
                        </FormField>
                        <FormField label="Potencia (Pmax) [W]" error={errors.panelPotencia?.message}>
                          <input type="number" step="any" {...methods.register("panelPotencia")} className="input-field" />
                        </FormField>
                        <FormField label="Voltaje Máxima Pot. (Vmp) [V]" error={errors.panelVmp?.message}>
                          <input type="number" step="any" {...methods.register("panelVmp")} className="input-field" />
                        </FormField>
                        <FormField label="Corriente Máxima Pot. (Imp) [A]" error={errors.panelImp?.message}>
                          <input type="number" step="any" {...methods.register("panelImp")} className="input-field" />
                        </FormField>
                        <FormField label="Voltaje Circuito Abierto (Voc) [V]" error={errors.panelVoc?.message}>
                          <input type="number" step="any" {...methods.register("panelVoc")} className="input-field" />
                        </FormField>
                        <FormField label="Corriente Cortocircuito (Isc) [A]" error={errors.panelIsc?.message}>
                          <input type="number" step="any" {...methods.register("panelIsc")} className="input-field" />
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* STEP 4 */}
                  {activeStep === 4 && (
                    <BateriasStep
                      control={control}
                      register={methods.register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      tipoBateria={tipoBateria}
                      bateriaSeleccionMetodo={bateriaSeleccionMetodo}
                    />
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-border">
              <button
                type="button"
                onClick={prevStep}
                disabled={activeStep === 1}
                className="btn-secondary disabled:opacity-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
              </button>
              
              {!isLastStep ? (
                <button type="button" onClick={nextStep} className="btn-primary">
                  Siguiente <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={calculateMutation.isPending}
                  className="btn-primary"
                >
                  {calculateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Calcular Sistema</>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ================= Form Field Wrapper =================
function FormField({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {children}
      {error && <span className="text-xs text-destructive font-medium">{error}</span>}
    </div>
  );
}

// ================= Cargas Table Component =================
function CargasTable({ control, register, errors }: any) {
  const { fields, append, remove } = useFieldArray({ control, name: "cargas" });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="text-lg font-bold text-foreground">Cuadro de Cargas</h3>
        <button type="button" onClick={() => append({ elemento: "", tipoCarga: "AC", cantidad: 1, potencia: 0, horas: 0 })} className="btn-secondary py-1.5 text-sm">
          <Plus className="w-4 h-4 mr-1" /> Agregar Carga
        </button>
      </div>
      {errors.cargas?.root && <p className="text-sm text-destructive">{errors.cargas.root.message}</p>}
      
      <div className="overflow-x-auto rounded-xl border border-border custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-semibold">Elemento</th>
              <th className="px-4 py-3 font-semibold w-24">Tipo</th>
              <th className="px-4 py-3 font-semibold w-24">Cant.</th>
              <th className="px-4 py-3 font-semibold w-32">Pot. (W)</th>
              <th className="px-4 py-3 font-semibold w-32">Horas/día</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field, index) => (
              <tr key={field.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2"><input {...register(`cargas.${index}.elemento`)} className="input-field-table" placeholder="Ej. Focos" /></td>
                <td className="px-4 py-2">
                  <select {...register(`cargas.${index}.tipoCarga`)} className="input-field-table cursor-pointer">
                    <option value="AC">AC</option>
                    <option value="DC">DC</option>
                  </select>
                </td>
                <td className="px-4 py-2"><input type="number" {...register(`cargas.${index}.cantidad`)} className="input-field-table text-center" /></td>
                <td className="px-4 py-2"><input type="number" step="any" {...register(`cargas.${index}.potencia`)} className="input-field-table text-right" /></td>
                <td className="px-4 py-2"><input type="number" step="any" {...register(`cargas.${index}.horas`)} className="input-field-table text-right" /></td>
                <td className="px-4 py-2 text-center">
                  <button type="button" onClick={() => remove(index)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay cargas agregadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ================= Recibo Table Component =================
function RecibosTable({ control, register, errors }: any) {
  const { fields, append, remove } = useFieldArray({ control, name: "registrosRecibo" });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Historial de Recibos</h3>
          <p className="text-sm text-muted-foreground">Registre los periodos a promediar.</p>
        </div>
        <button type="button" onClick={() => append({ consumo: 0, precio: 0 })} className="btn-secondary py-1.5 text-sm">
          <Plus className="w-4 h-4 mr-1" /> Agregar Registro
        </button>
      </div>

      <div className="w-64">
        <FormField label="Días por periodo (Ej. 60 para bimestral)" error={errors.diasPeriodoRecibo?.message}>
          <input type="number" {...register("diasPeriodoRecibo")} className="input-field" />
        </FormField>
      </div>

      {errors.registrosRecibo?.root && <p className="text-sm text-destructive">{errors.registrosRecibo.root.message}</p>}
      
      <div className="overflow-x-auto rounded-xl border border-border custom-scrollbar max-w-2xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-semibold">Periodo</th>
              <th className="px-4 py-3 font-semibold">Consumo (kWh)</th>
              <th className="px-4 py-3 font-semibold">Monto Pagado ($)</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field, index) => (
              <tr key={field.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-muted-foreground">Registro {index + 1}</td>
                <td className="px-4 py-2"><input type="number" step="any" {...register(`registrosRecibo.${index}.consumo`)} className="input-field-table text-right" /></td>
                <td className="px-4 py-2"><input type="number" step="any" {...register(`registrosRecibo.${index}.precio`)} className="input-field-table text-right" /></td>
                <td className="px-4 py-2 text-center">
                  <button type="button" onClick={() => remove(index)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No hay registros agregados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Add CSS variables for shared styles directly within the page or via global index.css
// To adhere to strict instructions, the inline class approaches below simulate standard utility patterns.
const styles = `
.input-field {
  @apply w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 text-foreground transition-all duration-200;
}
.input-field-table {
  @apply w-full px-3 py-1.5 rounded-lg bg-transparent border border-transparent focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-foreground transition-all;
}
.btn-primary {
  @apply inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none;
}
.btn-secondary {
  @apply inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold bg-white border border-border text-foreground shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow transition-all duration-200;
}
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
