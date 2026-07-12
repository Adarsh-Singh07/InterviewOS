import logoIcon from '../assets/Logo.png';

interface BrandWatermarkProps {
  /**
   * Multiplier applied to the base opacity (0.045).
   * Pass 0–1. Copilot page passes 0.45 when answer is visible, 1 when idle.
   * The CSS transition makes the fade smooth.
   */
  opacity?: number;
  className?: string;
}

/**
 * Full-page centred brand watermark — 80% of the viewport, behind all content.
 * Logo.png is a transparent PNG so it floats cleanly over any background color.
 * Glass/frosted-glass content cards naturally obscure it via their backdrop-blur
 * giving the "content dims the watermark" premium effect automatically.
 *
 * On the Copilot page the parent passes a lower opacity multiplier when an
 * answer is generating/displayed, creating an intentional dynamic fade.
 */
export default function BrandWatermark({ opacity = 1, className = '' }: BrandWatermarkProps) {
  const resolvedOpacity = 0.048 * opacity;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden ${className}`}
    >
      <img
        src={logoIcon}
        alt=""
        style={{
          opacity: resolvedOpacity,
          transition: 'opacity 0.8s ease',
        }}
        className="w-[80vmin] h-[80vmin] object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
