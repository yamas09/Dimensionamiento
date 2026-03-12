import { Link } from "wouter";
import { Sun } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
            <Sun className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl text-foreground tracking-tight">
            Dimensionador<span className="text-primary">SFV</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Calculadora</Link>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Documentación</a>
        </nav>
      </div>
    </header>
  );
}
