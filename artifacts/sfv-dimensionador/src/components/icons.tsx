export function SolarPanelIcon({ className }: { className?: string }) {
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

export function SolarSystemIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Sun top-right */}
      <circle cx="18.5" cy="5.5" r="2.5" />
      <line x1="18.5" y1="1.5"  x2="18.5" y2="2.5" />
      <line x1="18.5" y1="8.5"  x2="18.5" y2="9.5" />
      <line x1="14.5" y1="5.5"  x2="15.5" y2="5.5" />
      <line x1="21.5" y1="5.5"  x2="22.5" y2="5.5" />
      <line x1="15.8" y1="2.8"  x2="16.5" y2="3.5" />
      <line x1="20.5" y1="7.5"  x2="21.2" y2="8.2" />
      <line x1="20.5" y1="3.5"  x2="21.2" y2="2.8" />
      <line x1="15.8" y1="8.2"  x2="16.5" y2="7.5" />
      {/* Solar panel bottom-left */}
      <rect x="1" y="11" width="15" height="11" rx="1.5" />
      <line x1="1"   y1="14.7" x2="16" y2="14.7" />
      <line x1="1"   y1="18.3" x2="16" y2="18.3" />
      <line x1="5.5" y1="11"   x2="5.5" y2="22" />
      <line x1="11"  y1="11"   x2="11"  y2="22" />
    </svg>
  );
}
