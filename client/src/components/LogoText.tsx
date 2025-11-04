interface LogoTextProps {
  className?: string;
  wClassName?: string;
  evroClassName?: string;
}

export default function LogoText({ 
  className = "", 
  wClassName = "",
  evroClassName = ""
}: LogoTextProps) {
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span 
        style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }} 
        className={wClassName}
      >
        W
      </span>
      <span 
        style={{ 
          fontFamily: 'Poiret One, cursive', 
          fontWeight: 900,
          textShadow: '0 0 0.4px currentColor, 0 0 0.4px currentColor',
          letterSpacing: '0.01em'
        }}
        className={evroClassName}
      >
        evro
      </span>
    </span>
  );
}

