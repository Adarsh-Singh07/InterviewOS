interface LogoProps {
  theme: 'dark' | 'light';
  className?: string;
}

export default function Logo({ theme, className = '' }: LogoProps) {
  const isDark = theme === 'dark';
  
  return (
    <div className={`flex items-center space-x-3.5 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-9 h-9">
          <defs>
            <linearGradient id="logo-grad-shared" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          {/* 'i' - Rounded bar and dot */}
          <rect x="20" y="38" width="10" height="38" rx="5" fill="url(#logo-grad-shared)" />
          <circle cx="25" cy="22" r="5.5" fill="url(#logo-grad-shared)" />
          
          {/* 'o' - Outer circle and cutout inner circle */}
          <path 
            d="M 60,37 A 20,20 0 1,0 60,77 A 20,20 0 1,0 60,37 Z M 60,47 A 10,10 0 1,1 60,67 A 10,10 0 1,1 60,47 Z" 
            fill="url(#logo-grad-shared)" 
            fillRule="evenodd" 
          />
          
          {/* Sparkle star at top right of 'o' */}
          <path 
            d="M 77,25 Q 77,35 87,35 Q 77,35 77,45 Q 77,35 67,35 Q 77,35 77,25 Z" 
            fill="#a855f7" 
          />
        </svg>
      </div>
      <div className="flex flex-col justify-center leading-none text-left">
        <span className={`text-xl font-serif font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Interview<span className="text-indigo-500 dark:text-indigo-400">OS</span>
        </span>
        <span className={`text-[7.5px] font-mono font-bold tracking-wider uppercase mt-1.5 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          AI-POWERED INTERVIEW COPILOT
        </span>
      </div>
    </div>
  );
}
