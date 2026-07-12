interface LogoProps {
  theme: 'dark' | 'light';
  className?: string;
}

export default function Logo({ theme, className = '' }: LogoProps) {
  const isDark = theme === 'dark';
  const gradId = isDark ? 'logo-grad-dark' : 'logo-grad-light';
  
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-9 h-9">
          <defs>
            <linearGradient id="logo-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="logo-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          {/* 'i' */}
          <rect x="24" y="38" width="12" height="38" rx="6" fill={`url(#${gradId})`} />
          <circle cx="30" cy="22" r="7" fill={`url(#${gradId})`} />
          {/* 'o' */}
          <path 
            d="M 68,57 C 68,47 76,39 86,39 C 96,39 104,47 104,57 C 104,67 96,75 86,75 C 76,75 68,67 68,57 Z M 56,57 C 56,73 70,87 86,87 C 102,87 116,73 116,57 C 116,41 102,27 86,27 C 70,27 56,41 56,57 Z" 
            fill={`url(#${gradId})`} 
            fillRule="evenodd" 
            transform="translate(-10, -5)"
          />
          {/* Sparkle star at top right of 'o' */}
          <path 
            d="M 92,26 C 92,26 94,22 98,22 C 94,22 92,18 92,18 C 92,18 90,22 86,22 C 90,22 92,26 92,26 Z" 
            fill={isDark ? '#a855f7' : '#06b6d4'} 
            transform="translate(-5, -5)"
          />
        </svg>
      </div>
      <div className="flex flex-col justify-center leading-none text-left">
        <span className="text-xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">
          Interview<span className={isDark ? 'text-indigo-400' : 'text-cyan-500'}>OS</span>
        </span>
        <span className="text-[7px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-0.5 whitespace-nowrap">
          AI-POWERED INTERVIEW COPILOT
        </span>
      </div>
    </div>
  );
}
