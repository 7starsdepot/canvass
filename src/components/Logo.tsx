import React from 'react';

interface SevenStarsMarkProps {
  size?: number | string;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

// Helper to generate 5-pointed star points centered at (cx, cy) pointing at angle deg
function getStarPoints(cx: number, cy: number, R: number, r: number, rotationDeg = 0) {
  const points: string[] = [];
  const startAngle = (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? R : r;
    const angle = startAngle + i * (Math.PI / 5);
    const x = cx + radius * Math.sin(angle);
    const y = cy - radius * Math.cos(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * The official 7-Stars geometric starburst rosette emblem.
 * Exactly 7 interlocking 5-pointed stars forming a symmetrical mandala/wreath.
 */
export const SevenStarsMark: React.FC<SevenStarsMarkProps> = ({
  size = 36,
  className = '',
  strokeColor = '#0047FF',
  strokeWidth = 3.6,
}) => {
  const cx = 100;
  const cy = 100;
  const orbit = 24;
  const R = 34;
  const r = 15.5;

  const stars = [];
  for (let k = 0; k < 7; k++) {
    const deg = 180 + k * (360 / 7);
    const rad = (deg * Math.PI) / 180;
    const starX = cx + orbit * Math.sin(rad);
    const starY = cy - orbit * Math.cos(rad);
    const pts = getStarPoints(starX, starY, R, r, deg);
    stars.push(pts);
  }

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`shrink-0 inline-block overflow-visible ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="7 Stars Logo Mark"
    >
      <g id="seven-stars-rosette">
        {stars.map((pts, idx) => (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
};

interface SevenStarsLogoProps {
  variant?: 'mark' | 'compact' | 'horizontal' | 'full';
  dark?: boolean;
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Official 7 Stars School and Office Supplies Depot Logo Component
 * Incorporates the 7-star rosette, dual-color typography (Red & Royal Blue),
 * and the signature script "Your supply source."
 */
export const SevenStarsLogo: React.FC<SevenStarsLogoProps> = ({
  variant = 'horizontal',
  dark = false,
  className = '',
  showTagline = true,
  size = 'md',
}) => {
  const redText = dark ? 'text-red-500' : 'text-[#E31837]';
  const blueText = dark ? 'text-blue-400' : 'text-[#0047FF]';
  const markColor = dark ? '#60a5fa' : '#0047FF';
  const taglineColor = dark ? 'text-blue-300/80' : 'text-[#0030B0]';

  if (variant === 'mark') {
    const markSize = size === 'sm' ? 24 : size === 'lg' ? 48 : 36;
    return <SevenStarsMark size={markSize} strokeColor={markColor} className={className} />;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`p-1 rounded-lg ${dark ? 'bg-blue-950/60 border border-blue-800/60' : 'bg-blue-50 border border-blue-200'}`}>
          <SevenStarsMark size={size === 'sm' ? 22 : 28} strokeColor={markColor} strokeWidth={4} />
        </div>
        <div className="leading-tight">
          <div className="font-black text-sm tracking-tight flex items-center gap-1">
            <span className={redText}>7</span>
            <span className={blueText}>Stars</span>
            <span className={dark ? 'text-white' : 'text-slate-900'}>Depot</span>
          </div>
          <span className={`text-[10px] ${dark ? 'text-blue-200/70' : 'text-slate-500'} block`}>
            School & Office Supplies
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal') {
    const markDimensions = size === 'sm' ? 32 : size === 'lg' ? 52 : 40;
    const line1Size = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
    const line2Size = size === 'sm' ? 'text-xs sm:text-sm' : size === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg';

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Emblem badge */}
        <div
          className={`shrink-0 p-1.5 rounded-xl flex items-center justify-center transition-all ${
            dark
              ? 'bg-slate-900/90 border border-blue-500/40 shadow-inner shadow-blue-500/10'
              : 'bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <SevenStarsMark size={markDimensions} strokeColor={markColor} strokeWidth={3.8} />
        </div>

        {/* Dual-color Typography */}
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-black tracking-tight ${line1Size} flex items-center gap-1 flex-wrap`}>
            <span className={redText}>7</span>
            <span className={blueText}>Stars</span>
            <span className={redText}>School</span>
            <span className={blueText}>and</span>
          </div>
          <div className={`font-black tracking-tight mt-1 ${line2Size} flex items-center gap-1 flex-wrap`}>
            <span className={redText}>Office</span>
            <span className={blueText}>Supplies</span>
            <span className={redText}>Depot</span>
          </div>
          {showTagline && (
            <div className={`italic text-[11px] sm:text-xs font-semibold mt-0.5 self-end ${taglineColor}`}>
              Your supply source.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full / Stacked Logo (resembling the user's uploaded official brand sheet)
  return (
    <div className={`flex flex-col items-center text-center p-4 ${className}`}>
      <div className="mb-2">
        <SevenStarsMark size={size === 'lg' ? 90 : 70} strokeColor={markColor} strokeWidth={3.6} />
      </div>
      <div className="font-black text-xl sm:text-2xl tracking-tight leading-tight">
        <span className={redText}>7 </span>
        <span className={blueText}>Stars </span>
        <span className={redText}>School </span>
        <span className={blueText}>and</span>
      </div>
      <div className="font-black text-2xl sm:text-3xl tracking-tight leading-tight mt-0.5">
        <span className={redText}>Office </span>
        <span className={blueText}>Supplies </span>
        <span className={redText}>Depot</span>
      </div>
      {showTagline && (
        <p className={`italic font-semibold text-sm sm:text-base mt-1.5 self-end pr-2 ${taglineColor}`}>
          Your supply source.
        </p>
      )}
    </div>
  );
};

export default SevenStarsLogo;
