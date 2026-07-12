import { Link } from 'react-router-dom';
import logoLight from '../assets/LightMode.png';
import logoDark from '../assets/NightMode.png';

interface LogoProps {
  theme: 'dark' | 'light';
  className?: string;
}

/**
 * Renders the correct logo for the current theme.
 * Both PNGs are transparent, so no blend-mode tricks needed.
 * The header logo is rendered at h-14 (56 px) for strong presence.
 */
export default function Logo({ theme, className = '' }: LogoProps) {
  const isDark = theme === 'dark';

  return (
    <Link
      to="/"
      className={`inline-flex items-center select-none hover:opacity-90 active:scale-[0.98] transition-all duration-200 ${className}`}
    >
      <img
        src={isDark ? logoDark : logoLight}
        alt="InterviewOS"
        className="h-14 w-auto object-contain"
        draggable={false}
      />
    </Link>
  );
}
