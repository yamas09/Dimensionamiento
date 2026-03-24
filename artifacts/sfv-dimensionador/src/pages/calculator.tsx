import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { useCalcularSFV, SFVInput, SFVResultado } from "@workspace/api-client-react";
import { MapPin, Sun, Zap, Battery, ArrowRight, ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, AlertTriangle, Info, DollarSign } from "lucide-react";
import { SolarPanelIcon } from "@/components/icons";
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
  // Módulo económico
  costoPorPanel:    z.coerce.number().min(0).optional(),
  costoInversor:    z.coerce.number().min(0).optional(),
  costoBaterias:    z.coerce.number().min(0).optional(),
  costoRegulador:   z.coerce.number().min(0).optional(),
  costoProtecciones: z.coerce.number().min(0).optional(),
  costoInstalacion: z.coerce.number().min(0).optional(),
  precioKwh:        z.coerce.number().min(0).optional(),
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
  // Los campos económicos son opcionales (el usuario puede omitir el análisis de rentabilidad)
});

type FormData = z.infer<typeof sfvSchema>;

// id 3 = Ficha técnica, id 4 = Baterías (aislado), id 5 = Rentabilidad (no bombeo)
const STEPS = [
  { id: 1, title: "Ubicación",     icon: MapPin },
  { id: 2, title: "Perfil",        icon: Zap },
  { id: 3, title: "Ficha técnica", icon: SolarPanelIcon },
  { id: 4, title: "Baterías",      icon: Battery },
  { id: 5, title: "Rentabilidad",  icon: DollarSign },
];

interface CalculatorPageProps {
  result: SFVResultado | null;
  setResult: (r: SFVResultado | null) => void;
}

export default function CalculatorPage({ result, setResult }: CalculatorPageProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [omitirEconomico, setOmitirEconomico] = useState(false);
  const { toast } = useToast();

  const calculateMutation = useCalcularSFV();

  const methods = useForm<FormData>({
    resolver: zodResolver(sfvSchema),
    defaultValues: {
      tipoSistema: "aislado",
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
      costoPorPanel: undefined,
      costoInversor: undefined,
      costoBaterias: undefined,
      costoRegulador: undefined,
      costoProtecciones: undefined,
      costoInstalacion: undefined,
      precioKwh: undefined,
    },
    mode: "onChange"
  });

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = methods;

  const tipoSistema = watch("tipoSistema");
  const metodoPerfil = watch("metodoPerfil");
  const tipoBateria = watch("tipoBateria");
  const bateriaSeleccionMetodo = watch("bateriaSeleccionMetodo");

  // Paso 4 (Baterías) solo aparece para sistemas aislados
  // Paso 5 (Económico) aparece para aislado e interconectado (no bombeo)
  const visibleSteps = STEPS.filter(s => {
    if (s.id === 4 && tipoSistema !== "aislado") return false;
    if (s.id === 5 && tipoSistema === "bombeo") return false;
    return true;
  });

  // Si el usuario cambia el tipo de sistema, regresar a un paso visible
  useEffect(() => {
    if (tipoSistema !== "aislado" && activeStep === 4) {
      setActiveStep(3);
    }
    if (tipoSistema === "bombeo" && activeStep === 5) {
      setActiveStep(3);
    }
  }, [tipoSistema]);

  const isLastStep = activeStep === visibleSteps[visibleSteps.length - 1].id;

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (activeStep === 1) fieldsToValidate = ["latitud", "longitud", "hsp"];
    if (activeStep === 2) fieldsToValidate = ["tipoSistema", "metodoPerfil", "cargas", "registrosRecibo", "diasPeriodoRecibo"];
    // Paso 3 = Panel: valida ficha técnica antes de continuar
    if (activeStep === 3) fieldsToValidate = ["panelVnom", "panelPotencia", "panelImp", "panelVmp", "panelIsc", "panelVoc"];
    // Paso 4 = Baterías (solo para aislado): valida los campos de batería antes de calcular
    if (activeStep === 4) fieldsToValidate = ["tipoBateria", "diasAutonomia"];
    // Paso 5 = Rentabilidad: valida costos solo si no se omite
    if (activeStep === 5 && !omitirEconomico) {
      const econFields: string[] = ["costoPorPanel", "costoInversor", "costoRegulador", "costoProtecciones", "costoInstalacion"];
      if (tipoSistema === "aislado") econFields.push("costoBaterias");
      if (metodoPerfil === "cargas") econFields.push("precioKwh");
      fieldsToValidate = econFields;
    }
    
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

  const handleOmitir = () => {
    // Limpia los campos económicos y omite el análisis de rentabilidad
    setValue("costoPorPanel", undefined as any);
    setValue("costoInversor", undefined as any);
    setValue("costoBaterias", undefined as any);
    setValue("costoRegulador", undefined as any);
    setValue("costoProtecciones", undefined as any);
    setValue("costoInstalacion", undefined as any);
    setValue("precioKwh", undefined as any);
    setOmitirEconomico(true);
    handleSubmit(onSubmit)();
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
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-6">
        <ResultsView
          data={result}
          onReset={() => {
            setResult(null);
            setActiveStep(1);
            methods.reset();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pt-6 min-h-screen flex flex-col">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          Dimensionador <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">SFV</span>
        </h1>
        <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
          Ingresa los parámetros de tu proyecto para obtener el dimensionamiento de tu SFV.
        </p>
      </div>

      {/* Horizontal Step Flow */}
      <div className="mb-6 overflow-x-auto custom-scrollbar pb-2">
        <div className="flex items-center justify-center min-w-max mx-auto px-2">
          {visibleSteps.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isPast = activeStep > step.id;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                {/* Step node */}
                <div className="flex flex-col items-center gap-1.5 group">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    isActive
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110"
                      : isPast
                        ? "bg-orange-50 border-orange-300 text-orange-500"
                        : "bg-white border-border text-muted-foreground"
                  )}>
                    {isPast
                      ? <CheckCircle2 className="w-5 h-5 text-orange-500" />
                      : <Icon className="w-4 h-4" />
                    }
                  </div>
                  <span className={cn(
                    "text-xs font-semibold whitespace-nowrap transition-colors",
                    isActive ? "text-primary" : isPast ? "text-orange-500" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
                {/* Connector line */}
                {idx < visibleSteps.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-10 sm:w-16 mx-1 rounded-full transition-colors duration-300",
                    activeStep > step.id ? "bg-orange-300" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Area - full width */}
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

                  {/* STEP 3 — Ficha Técnica del Panel */}
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

                  {/* STEP 4 — Baterías (solo para sistema aislado) */}
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

                  {/* STEP 5 — Módulo Económico */}
                  {activeStep === 5 && (
                    <EconomicoStep
                      register={methods.register}
                      errors={errors}
                      tipoSistema={tipoSistema}
                      metodoPerfil={metodoPerfil}
                      registrosRecibo={watch("registrosRecibo") || []}
                    />
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-3 mt-10 pt-6 border-t border-border">
              <button
                type="button"
                onClick={prevStep}
                disabled={activeStep === 1}
                className="btn-secondary disabled:opacity-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
              </button>
              
              <div className="flex items-center gap-3">
                {/* Botón Omitir: solo visible en el paso de Rentabilidad */}
                {isLastStep && activeStep === 5 && (
                  <button
                    type="button"
                    onClick={handleOmitir}
                    disabled={calculateMutation.isPending}
                    className="px-5 py-2.5 rounded-xl font-medium border-2 border-muted-foreground/20 text-muted-foreground hover:bg-muted/50 transition-colors text-sm"
                  >
                    Omitir análisis
                  </button>
                )}

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
            </div>
          </form>
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

// ================= Baterías Step Component =================
function BateriasStep({ control, register, errors, watch, setValue, tipoBateria, bateriaSeleccionMetodo }: any) {
  // --- Estimar energía diaria desde datos ya ingresados en steps anteriores ---
  const metodoPerfil = watch("metodoPerfil");
  const cargas = watch("cargas") || [];
  const registrosRecibo = watch("registrosRecibo") || [];
  const diasPeriodoRecibo = watch("diasPeriodoRecibo") || 30;
  const diasAutonomia = watch("diasAutonomia");
  const bateriaAh = watch("bateriaAh");
  const bateriaV = watch("bateriaV");

  let energiaEstimada = 0;
  if (metodoPerfil === "cargas" && cargas.length > 0) {
    energiaEstimada = cargas.reduce((sum: number, c: any) => {
      const pot = c.tipoCarga === "AC" ? (c.potencia || 0) * 1.1 : (c.potencia || 0);
      return sum + ((c.cantidad || 0) * pot * (c.horas || 0)) / 1000;
    }, 0);
  } else if (metodoPerfil === "recibo" && registrosRecibo.length > 0) {
    const promedio = registrosRecibo.reduce((s: number, r: any) => s + (r.consumo || 0), 0) / registrosRecibo.length;
    energiaEstimada = promedio / diasPeriodoRecibo;
  }

  // --- Voltaje del sistema (misma lógica que el backend y Python) ---
  const voltajeSistema: number = energiaEstimada < 2 ? 12 : energiaEstimada < 4.5 ? 24 : 48;

  // --- Capacidad nominal requerida (Cn_Ah) ---
  const dod = tipoBateria ? (DOD_POR_TIPO[tipoBateria] ?? 0.7) : 0.7;
  const cnAh = (energiaEstimada > 0 && diasAutonomia && voltajeSistema)
    ? Math.ceil((1.2 * energiaEstimada * 1000 * diasAutonomia) / (voltajeSistema * dod))
    : null;

  // Compatibilidad de la batería manual
  const manualIncompatible = bateriaV && voltajeSistema % bateriaV !== 0;

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Battery className="w-6 h-6 text-primary" /> Configuración de Baterías
        </h2>
        <p className="text-muted-foreground mt-1">Banco de baterías para el sistema aislado.</p>
      </div>

      {/* Info card: Voltaje del sistema + Cn_Ah estimado */}
      {energiaEstimada > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Voltaje del sistema</p>
              <p className="text-lg font-bold text-blue-800">{voltajeSistema} V</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Energía diaria estimada: {energiaEstimada.toFixed(2)} kWh/día
              </p>
            </div>
          </div>
          {cnAh !== null && (
            <div className="flex-1 flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Capacidad requerida (Cn)</p>
                <p className="text-lg font-bold text-orange-800">{cnAh} Ah</p>
                <p className="text-xs text-orange-600 mt-0.5">DoD {(dod * 100).toFixed(0)}% · {diasAutonomia} día(s) autonomía</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tipo de batería + días autonomía */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField label="Tipo de Batería" error={errors.tipoBateria?.message}>
          <Controller
            control={control}
            name="tipoBateria"
            render={({ field }) => (
              <div className="flex bg-muted p-1 rounded-xl">
                {(["Plomo", "Litio"] as const).map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => {
                      field.onChange(t);
                      setValue("bateriaAh", undefined);
                      setValue("bateriaV", undefined);
                    }}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                      field.value === t ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t} <span className="text-xs opacity-70">(DoD {(DOD_POR_TIPO[t] * 100).toFixed(0)}%)</span>
                  </button>
                ))}
              </div>
            )}
          />
        </FormField>

        <FormField label="Días de Autonomía (recomendado 1–3)" error={errors.diasAutonomia?.message}>
          <input type="number" step="any" min="1" max="10" {...register("diasAutonomia")} className="input-field" />
        </FormField>
      </div>

      {/* Método de selección */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">¿Cómo desea especificar la batería?</p>
        <Controller
          control={control}
          name="bateriaSeleccionMetodo"
          render={({ field }) => (
            <div className="flex gap-3">
              {[
                { value: "catalogo", label: "Escoger del catálogo" },
                { value: "manual",   label: "Ingresar manualmente" },
              ].map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => {
                    field.onChange(opt.value);
                    setValue("bateriaAh", undefined);
                    setValue("bateriaV", undefined);
                  }}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-center",
                    field.value === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Catálogo */}
      {bateriaSeleccionMetodo === "catalogo" && tipoBateria && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Modelos disponibles — {tipoBateria}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Solo las baterías compatibles con el voltaje del sistema ({voltajeSistema}V) pueden seleccionarse.
            Las incompatibles aparecen desactivadas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(CATALOGO_BATERIAS[tipoBateria] ?? []).map((bat) => {
              const compatible = voltajeSistema % bat.V === 0;
              const isSelected = bateriaAh === bat.Ah && bateriaV === bat.V;
              const meetsCn = cnAh !== null ? bat.Ah >= cnAh : true;
              return (
                <button
                  key={bat.modelo} type="button"
                  disabled={!compatible}
                  onClick={() => {
                    if (!compatible) return;
                    setValue("bateriaAh", bat.Ah, { shouldValidate: true });
                    setValue("bateriaV",  bat.V,  { shouldValidate: true });
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all relative",
                    !compatible && "opacity-40 cursor-not-allowed bg-muted border-border",
                    compatible && isSelected && "border-primary bg-primary/5 shadow-sm shadow-primary/10",
                    compatible && !isSelected && "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className={cn(
                      "font-semibold text-sm",
                      isSelected ? "text-primary" : compatible ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {bat.modelo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{bat.Ah} Ah · {bat.V} V</p>
                    {compatible && cnAh !== null && (
                      <p className={cn("text-xs mt-1 font-medium", meetsCn ? "text-orange-600" : "text-amber-600")}>
                        {meetsCn ? `✓ Cumple Cn (${cnAh} Ah req.)` : `⚠ Insuf. — Cn req. ${cnAh} Ah`}
                      </p>
                    )}
                    {!compatible && (
                      <p className="text-xs mt-1 text-red-500 font-medium">
                        Incompatible con {voltajeSistema}V
                      </p>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          {!bateriaAh && (
            <p className="text-xs text-amber-600 font-medium mt-3">
              Selecciona un modelo compatible del catálogo para continuar.
            </p>
          )}
        </div>
      )}

      {/* Manual */}
      {bateriaSeleccionMetodo === "manual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-muted/40 rounded-xl border border-border">
            <FormField label="Capacidad de la batería [Ah]" error={errors.bateriaAh?.message}>
              <input
                type="number" step="any" min="1"
                {...register("bateriaAh")}
                className="input-field"
                placeholder={cnAh ? `Mín. recomendado: ${cnAh} Ah` : "Ej. 200"}
              />
            </FormField>
            <FormField label="Voltaje nominal de la batería [V]" error={errors.bateriaV?.message}>
              <input
                type="number" step="any" min="1"
                {...register("bateriaV")}
                className="input-field"
                placeholder={`Debe dividir a ${voltajeSistema}V`}
              />
            </FormField>
          </div>
          {/* Advertencia de incompatibilidad en tiempo real */}
          {manualIncompatible && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                El voltaje de batería <strong>{bateriaV}V</strong> no es divisor exacto del voltaje del sistema <strong>{voltajeSistema}V</strong>.
                El cálculo fallará. Usa {voltajeSistema === 48 ? "12V, 24V o 48V" : voltajeSistema === 24 ? "12V o 24V" : "12V"}.
              </span>
            </div>
          )}
          {cnAh !== null && bateriaAh && bateriaAh < cnAh && !manualIncompatible && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                La capacidad ingresada (<strong>{bateriaAh} Ah</strong>) es menor a la requerida por el sistema (<strong>{cnAh} Ah</strong>).
                Se necesitarán más baterías en paralelo.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================= Económico Step Component =================
function EconomicoStep({ register, errors, tipoSistema, metodoPerfil, registrosRecibo }: any) {
  // Calcular precio promedio desde recibos (solo para mostrar al usuario)
  const precioKwhCalculado = (() => {
    if (metodoPerfil !== "recibo" || !registrosRecibo.length) return null;
    const totalConsumo = registrosRecibo.reduce((s: number, r: any) => s + (r.consumo || 0), 0);
    const totalPrecio  = registrosRecibo.reduce((s: number, r: any) => s + (r.precio  || 0), 0);
    return totalConsumo > 0 ? (totalPrecio / totalConsumo).toFixed(4) : null;
  })();

  const MoneyInput = ({ name, label, error, placeholder = "0.00" }: { name: string; label: string; error?: string; placeholder?: string }) => (
    <FormField label={label} error={error}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">$</span>
        <input
          type="number"
          step="any"
          min="0"
          {...register(name)}
          className="input-field pl-8"
          placeholder={placeholder}
        />
      </div>
    </FormField>
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" /> Análisis Económico
        </h2>
        <p className="text-muted-foreground mt-1">
          Ingresa los costos del sistema para calcular el retorno de inversión y el ahorro económico en 25 años.
        </p>
      </div>

      {/* Costos del sistema */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Costos del Sistema [$MX]</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <MoneyInput name="costoPorPanel"     label="Costo por panel"             error={errors.costoPorPanel?.message} />
          <MoneyInput name="costoInversor"     label="Costo del inversor"          error={errors.costoInversor?.message} />
          {tipoSistema === "aislado" && (
            <MoneyInput name="costoBaterias"   label="Costo banco de baterías"     error={errors.costoBaterias?.message} />
          )}
          <MoneyInput name="costoRegulador"    label="Costo del regulador"         error={errors.costoRegulador?.message} />
          <MoneyInput name="costoProtecciones" label="Costo de protecciones"       error={errors.costoProtecciones?.message} />
          <MoneyInput name="costoInstalacion"  label="Costo de instalación"        error={errors.costoInstalacion?.message} />
        </div>
      </div>

      {/* Precio de electricidad */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Precio de la Electricidad</h3>
        {metodoPerfil === "recibo" ? (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 max-w-md">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-700">Precio derivado de tus recibos</p>
              {precioKwhCalculado ? (
                <p className="text-lg font-bold text-blue-800 mt-1">${precioKwhCalculado} <span className="text-sm font-normal">MX/kWh</span></p>
              ) : (
                <p className="text-sm text-blue-600 mt-1">Se calculará a partir del historial de recibos ingresado.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-xs">
            <MoneyInput name="precioKwh" label="Precio de electricidad [$/kWh]" error={errors.precioKwh?.message} placeholder="Ej. 3.50" />
          </div>
        )}
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
  @apply inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none;
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
