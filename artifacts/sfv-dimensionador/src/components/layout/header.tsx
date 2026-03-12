import { Link } from "wouter";
import { Sun, FileText } from "lucide-react";

interface HeaderProps {
  hasResult: boolean;
  onReport: () => void;
}

export function Header({ hasResult, onReport }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 bg-white/90 backdrop-blur-md border-b border-border shadow-sm shadow-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
            <Sun className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight whitespace-nowrap">
            Dimensionador<span className="text-primary">SFV</span>
          </span>
        </Link>

        <button
          onClick={onReport}
          disabled={!hasResult}
          title={hasResult ? "Generar reporte PDF" : "Realiza un cálculo primero"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed
            enabled:border-primary/30 enabled:text-primary enabled:hover:bg-primary/5 enabled:hover:border-primary/60 enabled:hover:shadow-sm
            border-slate-200 text-slate-400"
        >
          <FileText className="w-4 h-4" />
          Reporte
        </button>
      </div>
    </header>
  );
}
