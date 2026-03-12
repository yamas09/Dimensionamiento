import { Link } from "wouter";
import { FileText } from "lucide-react";

function SolarPanelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1"  y1="9.4"  x2="23" y2="9.4" />
      <line x1="1"  y1="14.6" x2="23" y2="14.6" />
      <line x1="6.5"  y1="4" x2="6.5"  y2="20" />
      <line x1="12"   y1="4" x2="12"   y2="20" />
      <line x1="17.5" y1="4" x2="17.5" y2="20" />
    </svg>
  );
}

interface HeaderProps {
  hasResult: boolean;
  onReport: () => void;
}

export function Header({ hasResult, onReport }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 bg-white/90 backdrop-blur-md border-b border-border shadow-sm shadow-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg text-white group-hover:shadow-lg group-hover:shadow-primary/25 transition-all">
            <SolarPanelIcon className="w-4 h-4" />
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
