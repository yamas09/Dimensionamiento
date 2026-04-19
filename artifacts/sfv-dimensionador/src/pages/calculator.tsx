import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { useCalcularSFV, SFVInput, SFVResultado } from "@workspace/api-client-react";
import { MapPin, Zap, Battery, ArrowRight, ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, AlertTriangle, Info, DollarSign, Droplets, BarChart2, Sun } from "lucide-react";

import { MEXICAN_STATES_HSP, CATALOGO_BATERIAS, DOD_POR_TIPO, CATALOGO_PANELES, PanelModelo } from "@/lib/constants";
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
  panelSeleccionMetodo: z.enum(["catalogo", "manual"]).optional(),
  tipoBateria: z.enum(["Plomo", "Litio"]).optional(),
  diasAutonomia: z.coerce.number().optional(),
  bateriaSeleccionMetodo: z.enum(["catalogo", "manual"]).optional(),
  bateriaAh: z.coerce.number().optional(),
  bateriaV: z.coerce.number().optional(),
  // Bombeo
  volumenLitros: z.coerce.number().min(1).optional(),
  alturaDebajo: z.coerce.number().min(0).optional(),
  alturaEncima: z.coerce.number().min(0).optional(),
  usarHspParaBombeo: z.boolean().optional(),
  horasBombeoManual: z.coerce.number().min(0.1).max(24).optional(),
  // Módulo económico común
  costoPorPanel:    z.coerce.number().min(0).optional(),
  costoInversor:    z.coerce.number().min(0).optional(),
  costoBaterias:    z.coerce.number().min(0).optional(),
  costoRegulador:   z.coerce.number().min(0).optional(),
  costoProtecciones: z.coerce.number().min(0).optional(),
  costoInstalacion: z.coerce.number().min(0).optional(),
  costoCableado:    z.coerce.number().min(0).optional(),
  precioKwh:        z.coerce.number().min(0).optional(),
  // Módulo económico bombeo
  costoBomba:         z.coerce.number().min(0).optional(),
  costoVariador:      z.coerce.number().min(0).optional(),
  tipoCombustible:    z.enum(["electrico", "diesel"]).optional(),
  precioKwhConvencional: z.coerce.number().min(0).optional(),
  consumoDieselAnual: z.coerce.number().min(0).optional(),
  precioDieselLitro:  z.coerce.number().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.tipoSistema !== "bombeo") {
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
  }
  if (data.tipoSistema === "bombeo") {
    if (!data.volumenLitros) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["volumenLitros"] });
    if (!data.alturaDebajo && data.alturaDebajo !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["alturaDebajo"] });
    if (!data.alturaEncima && data.alturaEncima !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["alturaEncima"] });
    if ((data.alturaDebajo ?? 0) + (data.alturaEncima ?? 0) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La suma de alturas debe ser mayor a 0", path: ["alturaDebajo"] });
    }
    if (!data.usarHspParaBombeo && !data.horasBombeoManual) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa las horas de bombeo", path: ["horasBombeoManual"] });
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

// 1=Ubicación, 2=Tipo, 3=Perfil|Bombeo, 4=Ficha técnica, 5=Baterías(aislado), 6=Resultados técnicos, 7=Rentabilidad
const STEPS = [
  { id: 1, title: "Ubicación",      icon: MapPin },
  { id: 2, title: "Tipo",           icon: Zap },
  { id: 3, title: "Perfil",         icon: Zap },
  { id: 4, title: "Paneles",        icon: Sun },
  { id: 5, title: "Baterías",       icon: Battery },
  { id: 6, title: "Resultados",     icon: CheckCircle2 },
  { id: 7, title: "Rentabilidad",   icon: DollarSign },
];

interface CalculatorPageProps {
  result: SFVResultado | null;
  setResult: (r: SFVResultado | null) => void;
}

export default function CalculatorPage({ result, setResult }: CalculatorPageProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [technicalResult, setTechnicalResult] = useState<SFVResultado | null>(null);
  const [wantsEconomicAnalysis, setWantsEconomicAnalysis] = useState<boolean | null>(null);
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
      panelSeleccionMetodo: "catalogo" as const,
      bateriaSeleccionMetodo: "catalogo" as const,
      bateriaAh: undefined,
      bateriaV: undefined,
      // Bombeo
      volumenLitros: undefined,
      alturaDebajo: undefined,
      alturaEncima: undefined,
      usarHspParaBombeo: true,
      horasBombeoManual: undefined,
      // Costos
      costoPorPanel: undefined,
      costoInversor: undefined,
      costoBaterias: undefined,
      costoRegulador: undefined,
      costoProtecciones: undefined,
      costoInstalacion: undefined,
      costoCableado: undefined,
      precioKwh: undefined,
      costoBomba: undefined,
      costoVariador: undefined,
      tipoCombustible: "electrico" as const,
      precioKwhConvencional: undefined,
      consumoDieselAnual: undefined,
      precioDieselLitro: undefined,
    },
    mode: "onChange"
  });

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = methods;

  const tipoSistema = watch("tipoSistema");
  const metodoPerfil = watch("metodoPerfil");
  const tipoBateria = watch("tipoBateria");
  const bateriaSeleccionMetodo = watch("bateriaSeleccionMetodo");
  const panelSeleccionMetodo = watch("panelSeleccionMetodo");
  const [panelCatalogo, setPanelCatalogo] = useState<PanelModelo | null>(null);

  // Step 5 (Baterías) solo aparece para aislado; step 7 (Rentabilidad) solo si el usuario elige análisis económico
  const visibleSteps = STEPS
    .filter(s => {
      if (s.id === 5 && tipoSistema !== "aislado") return false;
      if (s.id === 7 && wantsEconomicAnalysis !== true) return false;
      return true;
    })
    .map(s => s.id === 3
      ? { ...s, title: tipoSistema === "bombeo" ? "Bombeo" : "Perfil" }
      : s
    );

  // Si el usuario cambia el tipo de sistema y está en baterías (5), volver a paneles (4)
  useEffect(() => {
    if (tipoSistema !== "aislado" && activeStep === 5) {
      setActiveStep(4);
    }
  }, [tipoSistema]);

  const isLastStep = activeStep === visibleSteps[visibleSteps.length - 1].id;
  const isTechnicalPreviewStep = activeStep === 6;
  const isEconomicStep = activeStep === 7;

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (activeStep === 1) fieldsToValidate = ["latitud", "longitud", "hsp"];
    if (activeStep === 2) fieldsToValidate = [];
    if (activeStep === 3) {
      if (tipoSistema === "bombeo") {
        fieldsToValidate = ["volumenLitros", "alturaDebajo", "alturaEncima"];
        if (!watch("usarHspParaBombeo")) fieldsToValidate.push("horasBombeoManual");
      } else {
        if (metodoPerfil === "cargas") fieldsToValidate = ["cargas"];
        else fieldsToValidate = ["registrosRecibo", "diasPeriodoRecibo"];
      }
    }
    if (activeStep === 4) fieldsToValidate = ["panelVnom", "panelPotencia", "panelImp", "panelVmp", "panelIsc", "panelVoc"];
    if (activeStep === 5) fieldsToValidate = ["tipoBateria", "diasAutonomia"];

    const isValid = await trigger(fieldsToValidate as any);
    if (!isValid) {
      toast({ title: "Datos incompletos", description: "Revisa los campos marcados en rojo.", variant: "destructive" });
      return;
    }

    const currentIdx = visibleSteps.findIndex(s => s.id === activeStep);
    const nextStepData = visibleSteps[currentIdx + 1];

    // Si el siguiente paso es el de resultados técnicos (6), disparar la API primero
    if (nextStepData?.id === 6) {
      await handleCalcularTecnico();
      return;
    }

    if (currentIdx < visibleSteps.length - 1) {
      setActiveStep(nextStepData.id);
    }
  };

  const prevStep = () => {
    // Desde el paso de rentabilidad (7), volver siempre al preview técnico (6)
    if (activeStep === 7) { setActiveStep(6); return; }
    const currentIdx = visibleSteps.findIndex(s => s.id === activeStep);
    if (currentIdx > 0) setActiveStep(visibleSteps[currentIdx - 1].id);
  };

  // Calcula solo la parte técnica (sin costos) y muestra el preview en paso 6
  const handleCalcularTecnico = async () => {
    // Parsear a través del schema para asegurar que los campos numéricos estén correctamente
    // convertidos de string a number (los <input type="number"> devuelven strings sin valueAsNumber)
    const rawData = methods.getValues();
    const parseResult = sfvSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error("[handleCalcularTecnico] schema error:", parseResult.error.flatten());
      toast({ title: "Error en datos", description: "Revisa los campos marcados en rojo.", variant: "destructive" });
      return;
    }
    const data = parseResult.data;
    try {
      const response = await calculateMutation.mutateAsync({ data: data as SFVInput });
      setTechnicalResult(response);
      setWantsEconomicAnalysis(null);
      setActiveStep(6);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const apiMsg = err?.data?.error ?? err?.message ?? "Ocurrió un error al procesar los datos.";
      console.error("[handleCalcularTecnico] API error:", err);
      toast({ title: "Error en cálculo", description: apiMsg, variant: "destructive" });
    }
  };

  // Cuando el usuario decide añadir análisis económico
  const handleAddEconomic = () => {
    setWantsEconomicAnalysis(true);
    setActiveStep(7);
  };

  // Finalizar con solo resultados técnicos
  const handleFinalizarSinEconomia = () => {
    if (technicalResult) {
      setResult(technicalResult);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Calcular con costos (paso 7)
  const handleCalcular = async () => {
    const econFields: string[] = ["costoPorPanel", "costoInstalacion"];
    if (tipoSistema === "aislado") econFields.push("costoInversor", "costoRegulador", "costoProtecciones", "costoBaterias");
    if (tipoSistema === "interconectado") econFields.push("costoInversor", "costoRegulador", "costoProtecciones");
    if (tipoSistema === "bombeo") econFields.push("costoBomba", "costoVariador");
    if (tipoSistema !== "bombeo" && metodoPerfil === "cargas") econFields.push("precioKwh");

    const isValid = await trigger(econFields as any);
    if (isValid) {
      handleSubmit(onSubmit)();
    } else {
      toast({ title: "Datos incompletos", description: "Completa los costos del sistema o usa 'Omitir análisis'.", variant: "destructive" });
    }
  };

  // Omitir análisis desde paso 7: usar el resultado técnico ya calculado
  const handleOmitir = () => {
    if (technicalResult) {
      setResult(technicalResult);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-6">
        <ResultsView
          data={result}
          onReset={() => {
            setResult(null);
            setTechnicalResult(null);
            setWantsEconomicAnalysis(null);
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

                  {/* STEP 2 — Tipo de Sistema */}
                  {activeStep === 2 && (
                    <div className="space-y-8">
                      <div className="border-b border-border pb-4 mb-2">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Tipo de Sistema</h2>
                        <p className="text-muted-foreground mt-1">Selecciona el tipo de sistema fotovoltaico que deseas dimensionar.</p>
                      </div>
                      <Controller
                        control={control}
                        name="tipoSistema"
                        render={({ field }) => (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                            {[
                              { value: "aislado",        label: "Aislado",         desc: "Sin conexión a la red eléctrica. Requiere banco de baterías.", icon: Battery },
                              { value: "interconectado", label: "Interconectado",  desc: "Conectado a la red eléctrica. Inyecta excedentes.", icon: Zap },
                              { value: "bombeo",         label: "Bombeo Solar",    desc: "Alimenta una bomba de agua directamente con energía solar.", icon: Droplets },
                            ].map(({ value, label, desc, icon: Icon }) => (
                              <button
                                key={value} type="button"
                                onClick={() => field.onChange(value)}
                                className={cn(
                                  "flex flex-col items-start text-left p-5 rounded-2xl border-2 transition-all duration-200 gap-3",
                                  field.value === value
                                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                                )}
                              >
                                <div className={cn("p-2.5 rounded-xl", field.value === value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className={cn("font-bold text-base", field.value === value ? "text-primary" : "text-foreground")}>{label}</p>
                                  <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>
                  )}

                  {/* STEP 3 — Perfil de Consumo o Parámetros de Bombeo */}
                  {activeStep === 3 && (
                    <div className="space-y-6">
                      <div className="border-b border-border pb-4 mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          {tipoSistema === "bombeo"
                            ? <><Droplets className="w-6 h-6 text-primary" /> Parámetros de Bombeo</>
                            : <><Zap className="w-6 h-6 text-primary" /> Perfil de Consumo</>
                          }
                        </h2>
                        <p className="text-muted-foreground mt-1">
                          {tipoSistema === "bombeo"
                            ? "Ingresa los datos hidráulicos del sistema de bombeo."
                            : "Define cómo evaluaremos la demanda energética del sitio."
                          }
                        </p>
                      </div>
                      {tipoSistema === "bombeo" ? (
                        <BombeoParamsStep register={methods.register} control={control} errors={errors} watch={watch} setValue={setValue} />
                      ) : (
                        <>
                          <FormField label="Método de Perfil">
                            <Controller control={control} name="metodoPerfil" render={({ field }) => (
                              <div className="flex bg-muted p-1 rounded-xl max-w-xs">
                                {[{ value: "cargas", label: "Lista de cargas" }, { value: "recibo", label: "Historial de recibos" }].map(t => (
                                  <button key={t.value} type="button" onClick={() => field.onChange(t.value)}
                                    className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all px-3", field.value === t.value ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            )} />
                          </FormField>
                          {metodoPerfil === "cargas"
                            ? <CargasTable control={control} register={methods.register} errors={errors} />
                            : <RecibosTable control={control} register={methods.register} errors={errors} />
                          }
                        </>
                      )}
                    </div>
                  )}

                  {/* STEP 4 — Ficha Técnica del Panel */}
                  {activeStep === 4 && (
                    <div className="space-y-6">
                      <div className="border-b border-border pb-4 mb-2">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Sun className="w-6 h-6 text-primary" /> Ficha Técnica del Panel</h2>
                        <p className="text-muted-foreground mt-1">Selecciona un panel del catálogo o ingresa los parámetros manualmente.</p>
                      </div>

                      {/* Toggle catálogo / manual */}
                      <div className="flex bg-muted p-1 rounded-xl max-w-sm">
                        {[
                          { value: "catalogo", label: "Catálogo" },
                          { value: "manual",   label: "Manual" },
                        ].map(opt => (
                          <button
                            key={opt.value} type="button"
                            onClick={() => setValue("panelSeleccionMetodo", opt.value as "catalogo" | "manual")}
                            className={cn(
                              "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                              panelSeleccionMetodo === opt.value
                                ? "bg-white shadow-sm text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Selector de catálogo */}
                      {panelSeleccionMetodo !== "manual" && (
                        <div className="space-y-4">
                          <FormField label="Modelo de panel">
                            <select
                              className="input-field"
                              value={panelCatalogo ? `${panelCatalogo.fabricante} ${panelCatalogo.modelo}` : ""}
                              onChange={e => {
                                const panel = CATALOGO_PANELES.find(p => `${p.fabricante} ${p.modelo}` === e.target.value) ?? null;
                                setPanelCatalogo(panel);
                                if (panel) {
                                  setValue("panelVnom",     panel.Vnom);
                                  setValue("panelPotencia", panel.Pmax);
                                  setValue("panelVmp",      panel.Vmp);
                                  setValue("panelImp",      panel.Imp);
                                  setValue("panelVoc",      panel.Voc);
                                  setValue("panelIsc",      panel.Isc);
                                }
                              }}
                            >
                              <option value="" disabled>Selecciona un modelo...</option>
                              {Array.from(new Set(CATALOGO_PANELES.map(p => p.fabricante))).map(fab => (
                                <optgroup key={fab} label={fab}>
                                  {CATALOGO_PANELES.filter(p => p.fabricante === fab).map(p => (
                                    <option key={p.modelo} value={`${p.fabricante} ${p.modelo}`}>
                                      {p.modelo} — {p.Pmax} W · {p.tipo === "Monocristalino" ? "Mono" : "Poli"}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </FormField>

                          {/* Parámetros eléctricos — siempre visibles */}
                          <div className="rounded-2xl border border-orange-200 bg-orange-50/60 overflow-hidden">
                            {/* Cabecera con tipo de panel */}
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-orange-200 bg-orange-100/60">
                              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Parámetros eléctricos (STC)</p>
                              {panelCatalogo ? (
                                <span className={cn(
                                  "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                                  panelCatalogo.tipo === "Monocristalino"
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                )}>
                                  {panelCatalogo.tipo}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">— selecciona un modelo —</span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-orange-200">
                              {[
                                { label: "Vnom", value: panelCatalogo?.Vnom,     unit: "V" },
                                { label: "Pmax", value: panelCatalogo?.Pmax,     unit: "W" },
                                { label: "Vmp",  value: panelCatalogo?.Vmp,      unit: "V" },
                                { label: "Imp",  value: panelCatalogo?.Imp,      unit: "A" },
                                { label: "Voc",  value: panelCatalogo?.Voc,      unit: "V" },
                                { label: "Isc",  value: panelCatalogo?.Isc,      unit: "A" },
                              ].map((p, idx) => (
                                <div key={p.label} className={cn(
                                  "flex flex-col items-center py-3 px-1 text-center",
                                  idx >= 3 ? "border-t border-orange-200 sm:border-t-0" : ""
                                )}>
                                  <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wide">{p.label}</p>
                                  <p className={cn(
                                    "text-base font-bold mt-0.5 tabular-nums",
                                    panelCatalogo ? "text-foreground" : "text-muted-foreground"
                                  )}>
                                    {p.value != null ? p.value : "—"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">{p.unit}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Entrada manual de parámetros */}
                      {panelSeleccionMetodo === "manual" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          <FormField label="Voltaje Nominal (Vnom) [V]" error={errors.panelVnom?.message}>
                            <input type="number" step="any" {...methods.register("panelVnom")} className="input-field" placeholder="Ej. 24" />
                          </FormField>
                          <FormField label="Potencia Pico (Pmax) [W]" error={errors.panelPotencia?.message}>
                            <input type="number" step="any" {...methods.register("panelPotencia")} className="input-field" placeholder="Ej. 450" />
                          </FormField>
                          <FormField label="Volt. en MPP (Vmp) [V]" error={errors.panelVmp?.message}>
                            <input type="number" step="any" {...methods.register("panelVmp")} className="input-field" placeholder="Ej. 41.5" />
                          </FormField>
                          <FormField label="Corriente en MPP (Imp) [A]" error={errors.panelImp?.message}>
                            <input type="number" step="any" {...methods.register("panelImp")} className="input-field" placeholder="Ej. 10.8" />
                          </FormField>
                          <FormField label="Volt. Circuito Abierto (Voc) [V]" error={errors.panelVoc?.message}>
                            <input type="number" step="any" {...methods.register("panelVoc")} className="input-field" placeholder="Ej. 49.8" />
                          </FormField>
                          <FormField label="Corriente Cortocircuito (Isc) [A]" error={errors.panelIsc?.message}>
                            <input type="number" step="any" {...methods.register("panelIsc")} className="input-field" placeholder="Ej. 11.4" />
                          </FormField>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 5 — Baterías (solo para sistema aislado) */}
                  {activeStep === 5 && (
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

                  {/* STEP 6 — Preview técnico + decisión */}
                  {activeStep === 6 && technicalResult && (
                    <TechnicalPreviewStep
                      result={technicalResult}
                      tipoSistema={tipoSistema}
                      onAddEconomic={handleAddEconomic}
                      onFinish={handleFinalizarSinEconomia}
                    />
                  )}

                  {/* STEP 7 — Módulo Económico */}
                  {activeStep === 7 && (
                    <EconomicoStep
                      register={methods.register}
                      control={control}
                      errors={errors}
                      tipoSistema={tipoSistema}
                      metodoPerfil={metodoPerfil}
                      registrosRecibo={watch("registrosRecibo") || []}
                      watch={watch}
                      setValue={setValue}
                    />
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons — ocultos en paso 6 (las acciones están en el propio paso) */}
            {!isTechnicalPreviewStep && (
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
                  {/* Botón Omitir: solo en paso 7 (Rentabilidad) */}
                  {isEconomicStep && (
                    <button
                      type="button"
                      onClick={handleOmitir}
                      disabled={calculateMutation.isPending}
                      className="px-5 py-2.5 rounded-xl font-medium border-2 border-muted-foreground/20 text-muted-foreground hover:bg-muted/50 transition-colors text-sm"
                    >
                      Omitir análisis
                    </button>
                  )}

                  {!isEconomicStep ? (
                    <button type="button" onClick={nextStep} disabled={calculateMutation.isPending} className="btn-next">
                      {calculateMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
                      ) : (
                        <>Siguiente <ArrowRight className="w-4 h-4 ml-2 arrow-icon" /></>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCalcular}
                      disabled={calculateMutation.isPending}
                      className="btn-next"
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
            )}
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
      
      <div className="w-full rounded-xl border border-border overflow-hidden">
        <table className="w-full table-fixed text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-3 py-3 font-semibold w-[34%]">Elemento</th>
              <th className="px-3 py-3 font-semibold w-[12%]">Tipo</th>
              <th className="px-3 py-3 font-semibold w-[12%]">Cant.</th>
              <th className="px-3 py-3 font-semibold w-[20%]">Pot. (W)</th>
              <th className="px-3 py-3 font-semibold w-[18%]">Horas/día</th>
              <th className="px-3 py-3 w-[4%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field, index) => (
              <tr key={field.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2"><input {...register(`cargas.${index}.elemento`)} className="input-field-table w-full min-w-0" placeholder="Ej. Focos" /></td>
                <td className="px-3 py-2">
                  <select {...register(`cargas.${index}.tipoCarga`)} className="input-field-table cursor-pointer">
                    <option value="AC">AC</option>
                    <option value="DC">DC</option>
                  </select>
                </td>
                <td className="px-3 py-2"><input type="number" {...register(`cargas.${index}.cantidad`)} className="input-field-table w-full min-w-0 text-center" /></td>
                <td className="px-3 py-2"><input type="number" step="any" {...register(`cargas.${index}.potencia`)} className="input-field-table w-full min-w-0 text-right" /></td>
                <td className="px-3 py-2"><input type="number" step="any" {...register(`cargas.${index}.horas`)} className="input-field-table w-full min-w-0 text-right" /></td>
                <td className="px-3 py-2 text-center">
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

  // --- Capacidad nominal requerida (Cn_Ah) — Python: Cn = (1.2*E*1000*Daut)/(V*eff*DoD) ---
  const dod = tipoBateria ? (DOD_POR_TIPO[tipoBateria] ?? 0.7) : 0.7;
  const cnAh = (energiaEstimada > 0 && diasAutonomia && voltajeSistema)
    ? Math.ceil((1.2 * energiaEstimada * 1000 * diasAutonomia) / (voltajeSistema * 0.8075 * dod))
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
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Capacidad del banco (Cn)</p>
                <p className="text-lg font-bold text-orange-800">{cnAh} Ah</p>
                <p className="text-xs text-orange-600 mt-0.5">Eficiencia batería-inversor=80.75%</p>
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

// ================= Bombeo Params Step Component =================
function BombeoParamsStep({ register, control, errors, watch, setValue }: any) {
  const usarHsp = watch("usarHspParaBombeo");

  return (
    <div className="space-y-6">
      {/* Columnas: inputs izquierda, diagrama derecha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Columna izquierda — campos de entrada */}
        <div className="space-y-5">
          <FormField label="Volumen a bombear por día [L]" error={errors.volumenLitros?.message}>
            <input type="number" step="any" min="1" {...register("volumenLitros")} className="input-field" placeholder="Ej. 5000" />
          </FormField>
          <FormField label="Profundidad: nivel agua → suelo [m]" error={errors.alturaDebajo?.message}>
            <input type="number" step="any" min="0" {...register("alturaDebajo")} className="input-field" placeholder="Ej. 15" />
          </FormField>
          <FormField label="Altura: suelo → tanque de almacenamiento [m]" error={errors.alturaEncima?.message}>
            <input type="number" step="any" min="0" {...register("alturaEncima")} className="input-field" placeholder="Ej. 5" />
          </FormField>
        </div>

        {/* Columna derecha — diagrama de referencia */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Referencia de alturas</p>
          <svg viewBox="0 0 340 230" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <defs>
              <pattern id="hatch2" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#92400E" strokeWidth="1" opacity="0.3"/>
              </pattern>
            </defs>

            {/* Underground fill */}
            <rect x="0" y="148" width="340" height="82" fill="url(#hatch2)"/>
            <rect x="0" y="148" width="340" height="82" fill="#D4A96A" opacity="0.15"/>
            {/* Ground line */}
            <line x1="0" y1="148" x2="340" y2="148" stroke="#92400E" strokeWidth="2"/>

            {/* Well shaft */}
            <rect x="115" y="146" width="34" height="78" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" rx="2"/>
            {/* Water in well */}
            <rect x="116" y="196" width="32" height="27" fill="#38BDF8" opacity="0.55" rx="1"/>
            {/* Water surface dashed line */}
            <line x1="116" y1="196" x2="149" y2="196" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="4,2"/>
            {/* Pump */}
            <rect x="119" y="216" width="26" height="11" fill="#475569" rx="3"/>
            <circle cx="132" cy="221" r="4" fill="#64748B" stroke="#CBD5E1" strokeWidth="1"/>

            {/* Pipe: pump → elbow → tank */}
            <polyline points="143,221 168,221 168,68 240,68" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinejoin="round"/>

            {/* Elevated storage tank */}
            <rect x="240" y="38" width="82" height="62" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.5" rx="3"/>
            {/* Water inside tank */}
            <rect x="241" y="58" width="80" height="41" fill="#38BDF8" opacity="0.45" rx="2"/>
            {/* Tank top cap */}
            <line x1="238" y1="38" x2="324" y2="38" stroke="#0284C7" strokeWidth="2"/>
            {/* Support legs */}
            <line x1="252" y1="100" x2="244" y2="148" stroke="#64748B" strokeWidth="2"/>
            <line x1="310" y1="100" x2="318" y2="148" stroke="#64748B" strokeWidth="2"/>
            <line x1="252" y1="123" x2="310" y2="123" stroke="#64748B" strokeWidth="1.5"/>
            <line x1="244" y1="123" x2="318" y2="148" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3,2"/>

            {/* ── PROFUNDIDAD: ground (y=148) → water surface (y=196) ── */}
            {/* Arrow up at ground */}
            <polygon points="88,148 84,158 92,158" fill="#DC2626"/>
            {/* Arrow down at water level */}
            <polygon points="88,196 84,186 92,186" fill="#DC2626"/>
            {/* Shaft */}
            <line x1="88" y1="158" x2="88" y2="186" stroke="#DC2626" strokeWidth="1.5"/>
            {/* Reference ticks */}
            <line x1="80" y1="148" x2="113" y2="148" stroke="#DC2626" strokeWidth="1" strokeDasharray="4,2"/>
            <line x1="80" y1="196" x2="113" y2="196" stroke="#DC2626" strokeWidth="1" strokeDasharray="4,2"/>
            {/* Label — placed in clear underground region */}
            <rect x="2" y="158" width="78" height="30" fill="white" opacity="0.75" rx="4"/>
            <text x="41" y="172" fill="#DC2626" fontSize="11" fontFamily="sans-serif" textAnchor="middle" fontWeight="700">Profundidad</text>
            <text x="41" y="184" fill="#DC2626" fontSize="8.5" fontFamily="sans-serif" textAnchor="middle">nivel agua → suelo</text>

            {/* ── ALTURA: pipe level (y=68) → ground (y=148) ── */}
            {/* Arrow up at pipe level */}
            <polygon points="206,68 202,78 210,78" fill="#15803D"/>
            {/* Arrow down at ground */}
            <polygon points="206,148 202,138 210,138" fill="#15803D"/>
            {/* Shaft */}
            <line x1="206" y1="78" x2="206" y2="138" stroke="#15803D" strokeWidth="1.5"/>
            {/* Reference ticks */}
            <line x1="198" y1="68" x2="240" y2="68" stroke="#15803D" strokeWidth="1" strokeDasharray="4,2"/>
            <line x1="150" y1="148" x2="240" y2="148" stroke="#15803D" strokeWidth="1" strokeDasharray="4,2" opacity="0.5"/>
            {/* Label — between tank top and pipe, with white background */}
            <rect x="157" y="40" width="64" height="22" fill="white" opacity="0.88" rx="4"/>
            <text x="189" y="53" fill="#15803D" fontSize="11" fontFamily="sans-serif" textAnchor="middle" fontWeight="700">Altura</text>
            <text x="189" y="63" fill="#15803D" fontSize="8" fontFamily="sans-serif" textAnchor="middle">suelo → tanque</text>

            {/* Component labels */}
            <text x="132" y="142" fill="#0369A1" fontSize="8.5" fontFamily="sans-serif" textAnchor="middle">Pozo</text>
            <text x="281" y="30" fill="#0369A1" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="600">Tanque</text>
            <text x="132" y="228" fill="#64748B" fontSize="8" fontFamily="sans-serif" textAnchor="middle">Bomba</text>
          </svg>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Horas de bombeo diarias</p>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setValue("usarHspParaBombeo", true)}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-center",
              usarHsp ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            Usar HSP del sitio
          </button>
          <button
            type="button"
            onClick={() => setValue("usarHspParaBombeo", false)}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-center",
              !usarHsp ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            Ingresar manualmente
          </button>
        </div>
        {!usarHsp && (
          <div className="max-w-xs">
            <FormField label="Horas de bombeo diarias [h]" error={errors.horasBombeoManual?.message}>
              <input type="number" step="any" min="0.1" max="24" {...register("horasBombeoManual")} className="input-field" placeholder="Ej. 6" />
            </FormField>
          </div>
        )}
        {usarHsp && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 max-w-md">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">Las horas de bombeo serán iguales a las Horas Solar Pico (HSP) del sitio ingresadas en el paso 1.</p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">La altura total se ajustará automáticamente con un factor de pérdidas del 12.5% para compensar la fricción en la tubería.</p>
      </div>
    </div>
  );
}

// ================= Technical Preview Step Component =================
function TechnicalPreviewStep({ result, tipoSistema, onAddEconomic, onFinish }: {
  result: SFVResultado;
  tipoSistema: string;
  onAddEconomic: () => void;
  onFinish: () => void;
}) {
  const fmt2 = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt3 = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 3 });

  const Chip = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white border border-border rounded-xl px-4 py-3 flex flex-col gap-0.5 shadow-sm">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-base font-bold text-foreground">{value}</span>
    </div>
  );

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
        {icon}
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-green-100">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Resultados Técnicos</h2>
            <p className="text-muted-foreground text-sm">El dimensionamiento está completo. Revisa los resultados antes de continuar.</p>
          </div>
        </div>
      </div>

      {/* Datos del sistema */}
      <Section title="Arreglo Fotovoltaico" icon={<Sun className="w-4 h-4 text-amber-500" />}>
        <Chip label="Paneles totales" value={`${result.paneles.totalPaneles}`} />
        <Chip label="Serie × Paralelo" value={`${result.paneles.panelesSerie} × ${result.paneles.panelesParalelo}`} />
        <Chip label="Voltaje sistema" value={`${result.paneles.voltajeSistema} V`} />
        <Chip label="Corriente sistema" value={`${fmt3(result.paneles.corrienteSistema)} A`} />
        <Chip label="Inclinación" value={`${result.anguloInclinacion}°`} />
        <Chip label="Orientación" value={result.orientacion === "sur" ? "Sur" : "Norte"} />
      </Section>

      {tipoSistema === "aislado" && result.baterias && (
        <Section title="Banco de Baterías" icon={<Battery className="w-4 h-4 text-blue-500" />}>
          <Chip label="Baterías totales" value={`${result.baterias.totalBaterias}`} />
          <Chip label="Serie × Paralelo" value={`${result.baterias.bateriasSerie} × ${result.baterias.bateriasParalelo}`} />
          <Chip label="Cap. nominal" value={`${fmt2(result.baterias.capacidadNominal)} Ah`} />
          <Chip label="Cap. comercial" value={`${result.baterias.capacidadComercial} Ah`} />
          <Chip label="Voltaje batería" value={`${result.baterias.voltajeBateria} V`} />
          <Chip label="DoD" value={`${(result.baterias.dod * 100).toFixed(0)}%`} />
        </Section>
      )}

      {(tipoSistema === "aislado" || tipoSistema === "interconectado") && result.inversor && (
        <Section title="Inversor" icon={<Zap className="w-4 h-4 text-violet-500" />}>
          <Chip label="Corriente mínima" value={`${fmt3(result.inversor.corrienteMinima)} A`} />
          {result.regulador && <Chip label="Regulador (I mín.)" value={`${fmt3(result.regulador.corrienteMinima)} A`} />}
        </Section>
      )}

      {tipoSistema === "bombeo" && result.bomba && (
        <Section title="Bomba y Variador" icon={<Droplets className="w-4 h-4 text-sky-500" />}>
          <Chip label="Potencia bomba" value={`${fmt3(result.bomba.potenciaHP)} HP`} />
          <Chip label="Potencia eléctrica" value={`${fmt3(result.bomba.potenciaKw)} kW`} />
          {result.variador && <Chip label="Variador (I máx.)" value={`${fmt2(result.variador.corrienteMaxima)} A`} />}
        </Section>
      )}

      {result.cableado && (
        <Section title="Cableado y Protecciones" icon={<Zap className="w-4 h-4 text-orange-500" />}>
          <Chip label="Corriente mínima cable" value={`${fmt3(result.cableado.corrienteMinima)} A`} />
          {result.protecciones?.seccionadorCorriente && <Chip label="Seccionador corriente" value={`${fmt2(result.protecciones.seccionadorCorriente)} A`} />}
          {result.protecciones?.seccionadorVoltaje && <Chip label="Seccionador voltaje" value={`${fmt2(result.protecciones.seccionadorVoltaje)} V`} />}
          {result.protecciones?.sobretensionesVoltaje && <Chip label="Sobretensiones" value={`${fmt2(result.protecciones.sobretensionesVoltaje)} V`} />}
        </Section>
      )}

      {result.ambiental && (
        <Section title="Producción Energética (estimado)" icon={<BarChart2 className="w-4 h-4 text-green-600" />}>
          <Chip label="Energía anual" value={`${fmt2(result.ambiental.energiaAnualKwh)} kWh`} />
          <Chip label="CO₂ evitado/año" value={`${fmt2(result.ambiental.ahorroCo2PrimerAnio)} kg`} />
          <Chip label="CO₂ en 25 años" value={`${fmt2(result.ambiental.ahorroCo2TotalTon)} ton`} />
        </Section>
      )}

      {/* Decisión */}
      <div className="border-t border-border pt-6">
        <p className="text-base font-semibold text-foreground mb-4">¿Deseas añadir un análisis económico?</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onAddEconomic}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border-2 border-primary bg-primary/5 text-primary font-semibold text-sm hover:bg-primary/10 transition-all"
          >
            <DollarSign className="w-5 h-5" />
            Sí, añadir análisis económico
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border-2 border-border bg-white text-foreground font-semibold text-sm hover:bg-muted/50 transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            No, ver solo resultados técnicos
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Económico Step Component =================
function EconomicoStep({ register, control, errors, tipoSistema, metodoPerfil, registrosRecibo, watch, setValue }: any) {
  // Calcular precio promedio desde recibos (solo para mostrar al usuario)
  const precioKwhCalculado = (() => {
    if (metodoPerfil !== "recibo" || !registrosRecibo.length) return null;
    const totalConsumo = registrosRecibo.reduce((s: number, r: any) => s + (r.consumo || 0), 0);
    const totalPrecio  = registrosRecibo.reduce((s: number, r: any) => s + (r.precio  || 0), 0);
    return totalConsumo > 0 ? (totalPrecio / totalConsumo).toFixed(4) : null;
  })();

  const tipoCombustible = watch("tipoCombustible");

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

      {tipoSistema === "bombeo" ? (
        /* ── Costos sistema bombeo ── */
        <>
          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">Costos del Sistema [$MX]</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <MoneyInput name="costoPorPanel"  label="Costo por panel"                  error={errors.costoPorPanel?.message} />
              <MoneyInput name="costoBomba"     label="Costo de la bomba"                error={errors.costoBomba?.message} />
              <MoneyInput name="costoVariador"  label="Costo del variador de frecuencia" error={errors.costoVariador?.message} />
              <MoneyInput name="costoCableado"  label="Costo del cableado"               error={errors.costoCableado?.message} />
              <MoneyInput name="costoInstalacion" label="Costo de instalación"           error={errors.costoInstalacion?.message} />
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">Fuente de energía actual (para comparativa)</h3>
            <div className="flex gap-3 mb-5">
              {[
                { value: "electrico", label: "Red eléctrica" },
                { value: "diesel",   label: "Diésel" },
              ].map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => setValue("tipoCombustible", opt.value)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-center",
                    tipoCombustible === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {tipoCombustible === "electrico" ? (
              <div className="max-w-xs">
                <MoneyInput name="precioKwhConvencional" label="Precio electricidad convencional [$/kWh]" error={errors.precioKwhConvencional?.message} placeholder="Ej. 3.50" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-lg">
                <FormField label="Consumo anual de diésel [L]" error={errors.consumoDieselAnual?.message}>
                  <input type="number" step="any" min="0" {...register("consumoDieselAnual")} className="input-field" placeholder="Ej. 2000" />
                </FormField>
                <MoneyInput name="precioDieselLitro" label="Precio del diésel [$/L]" error={errors.precioDieselLitro?.message} placeholder="Ej. 24.50" />
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Costos sistemas aislado / interconectado ── */
        <>
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
              <MoneyInput name="costoCableado"     label="Costo del cableado"          error={errors.costoCableado?.message} />
              <MoneyInput name="costoInstalacion"  label="Costo de instalación"        error={errors.costoInstalacion?.message} />
            </div>
          </div>

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
        </>
      )}
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
