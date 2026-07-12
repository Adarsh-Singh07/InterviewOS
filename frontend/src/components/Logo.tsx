import { Link } from 'react-router-dom';
import logoLight from '../assets/LightMode.png';
import logoIconOnly from '../assets/Logo.png';

interface LogoProps {
  theme: 'dark' | 'light';
  className?: string;
}

export default function Logo({ theme, className = '' }: LogoProps) {
  const isDark = theme === 'dark';

  return (
    <Link
      to="/"
      className={`inline-flex items-center select-none hover:opacity-90 active:scale-[0.99] transition-all duration-200 ${className}`}
    >
      {isDark ? (
        /* Dark mode: use icon-only Logo.png with screen blend to make dark bg transparent,
           then show "InterviewOS" text in CSS since the icon has no text */
        <div className="flex items-center gap-3">
          <img
            src={logoIconOnly}
            alt="InterviewOS"
            style={{ mixBlendMode: 'screen' }}
            className="h-14 w-auto object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-white">
              Interview<span className="text-[#7c6fff]">OS</span>
            </span>
            <span className="text-[9px] font-mono tracking-[0.18em] uppercase text-slate-400 mt-0.5">
              AI-Powered Copilot
            </span>
          </span>
        </div>
      ) : (
        /* Light mode: use LightMode.png with multiply blend so white bg disappears */
        <img
          src={logoLight}
          alt="InterviewOS"
          style={{ mixBlendMode: 'multiply' }}
          className="h-16 w-auto object-contain"
        />
      )}
    </Link>
  );
}
