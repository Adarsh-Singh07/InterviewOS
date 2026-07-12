interface LogoProps {
  theme: 'dark' | 'light';
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export default function Logo({ theme, layout = 'horizontal', className = '' }: LogoProps) {
  const isDark = theme === 'dark';
  const isVertical = layout === 'vertical';

  const svgIcon = (
    <svg viewBox="0 0 100 100" className={isVertical ? "w-16 h-16 md:w-20 md:h-20" : "w-9 h-9"}>
      <defs>
        <linearGradient id="logo-grad-shared" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* 'i' - Rounded vertical bar and dot */}
      <rect x="22" y="44" width="10" height="36" rx="5" fill="url(#logo-grad-shared)" />
      <circle cx="27" cy="28" r="6" fill="url(#logo-grad-shared)" />
      
      {/* 'o' - Thick circular ring cutout */}
      <path 
        d="M 62,30 A 25,25 0 1,0 62,80 A 25,25 0 1,0 62,30 Z M 62,41 A 14,14 0 1,1 62,69 A 14,14 0 1,1 62,41 Z" 
        fill="url(#logo-grad-shared)" 
        fillRule="evenodd" 
      />
      
      {/* Sparkle star at top right of 'o' */}
      <path 
        d="M 82,22 Q 82,32 92,32 Q 82,32 82,42 Q 82,32 72,32 Q 82,32 82,22 Z" 
        fill="#818cf8" 
      />
    </svg>
  );

  const textContent = (
    <div className={`flex flex-col justify-center leading-none ${isVertical ? 'items-center text-center mt-3' : 'text-left'}`}>
      <span className={`text-xl md:text-2xl font-sans font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
        Interview<span className="text-[#4f46e5]">OS</span>
      </span>
      <span className={`text-[7.5px] md:text-[8px] font-mono font-bold tracking-widest uppercase mt-2.5 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        AI-POWERED INTERVIEW COPILOT
      </span>
    </div>
  );

  if (isVertical) {
    return (
      <div className={`flex flex-col items-center select-none ${className}`}>
        <div className="relative shrink-0 flex items-center justify-center">
          {svgIcon}
        </div>
        {textContent}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3.5 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        {svgIcon}
      </div>
      {textContent}
    </div>
  );
}
