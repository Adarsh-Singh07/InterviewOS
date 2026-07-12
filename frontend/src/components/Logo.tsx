import { Link } from 'react-router-dom';
import logoLight from '../assets/LightMode.png';
import logoDark from '../assets/NightMode.png';

interface LogoProps {
  theme: 'dark' | 'light';
  className?: string;
}

export default function Logo({ theme, className = '' }: LogoProps) {
  const isDark = theme === 'dark';
  
  return (
    <Link 
      to="/" 
      className={`inline-flex items-center select-none hover:opacity-95 active:scale-[0.99] transition-all ${className}`}
    >
      <img 
        src={isDark ? logoDark : logoLight} 
        alt="InterviewOS" 
        className="h-10 w-auto object-contain max-h-[44px]"
      />
    </Link>
  );
}
