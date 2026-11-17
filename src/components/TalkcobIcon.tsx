import React from 'react';

interface TalkcobIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
  variant?: 'mark' | 'badge';
  mascotColor?: string;
  badgeColor?: string;
}

/**
 * Original Talkcob brand emblem:
 * A distinctive talking character wearing a studio headset, holding and eating
 * a golden corn on the cob while talking with radiating acoustic voice waves.
 */
export const TalkcobIcon: React.FC<TalkcobIconProps> = ({
  size = 32,
  className = '',
  animated = false,
  variant = 'mark',
  mascotColor = '#FFFFFF',
  badgeColor = '#E53935',
}) => {
  const detailColor = variant === 'badge' ? badgeColor : '#1E1F22';
  const cornOutline = variant === 'badge' ? '#7F1D1D' : '#1E1F22';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Talkcob talking character eating corn on the cob icon"
      role="img"
    >
      {variant === 'badge' && (
        <rect x="2" y="2" width="60" height="60" rx="18" fill={badgeColor} />
      )}

      <g transform={variant === 'badge' ? 'translate(1.5, 1.5) scale(0.95)' : 'translate(0, 0)'}>
        {/* Studio headset band over the character */}
        <path
          d="M11 26C11 16.2 19 8.5 29 8.5C36.4 8.5 42.6 12.8 45.4 19"
          stroke={mascotColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Left headphone earcup */}
        <rect x="6.5" y="21" width="6" height="13.5" rx="3" fill={mascotColor} />

        {/* Round talking character head with subtle speech-tail */}
        <path
          d="M28.5 13.5C20.5 13.5 14 20 14 28C14 36 20.5 42.5 28.5 42.5C31.2 42.5 33.8 41.7 36 40.4L41.5 43.2C42.4 43.7 43.3 42.9 43 41.9L41.7 36.8C42.6 34.2 43 31.2 43 28C43 20 36.5 13.5 28.5 13.5Z"
          fill={mascotColor}
        />

        {/* Expressive eyes */}
        <circle cx="23.5" cy="22.8" r="2.4" fill={detailColor} />
        <circle cx="34.2" cy="22.8" r="2.4" fill={detailColor} />

        {/* Open talking mouth */}
        <path
          d="M21.8 29.2C21.8 28.6 22.3 28.2 22.9 28.2H35.3C35.9 28.2 36.3 28.6 36.3 29.2C36.3 33.9 33.3 37.3 29.1 37.3C24.9 37.3 21.8 33.9 21.8 29.2Z"
          fill={detailColor}
        />
        {/* Upper teeth */}
        <path
          d="M24 28.2H34.1V29.8C34.1 30.2 33.8 30.5 33.4 30.5H24.7C24.3 30.5 24 30.2 24 29.8V28.2Z"
          fill={mascotColor}
        />
        {/* Warm tongue inside talking mouth */}
        <path
          d="M25 34.6C26.1 33.3 27.5 32.8 29.1 32.8C30.7 32.8 32.1 33.3 33.2 34.6C32.1 35.8 30.7 36.4 29.1 36.4C27.5 36.4 26.1 35.8 25 34.6Z"
          fill="#FB7185"
        />

        {/* Corn on the cob held up to his talking mouth with a bite taken out */}
        <g transform="translate(21, 44) rotate(-22)">
          {/* Green corn husk leaves at the base */}
          <path
            d="M-16.5 -4.2C-13.5 -6.8 -8.2 -6.2 -5.2 -3.4L-9.5 1.5L-16.5 -4.2Z"
            fill="#22C55E"
            stroke={cornOutline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M-15.8 5.2C-12.6 7.5 -7.2 6.8 -4.2 3.8L-9.2 -0.6L-15.8 5.2Z"
            fill="#16A34A"
            stroke={cornOutline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />

          {/* Golden corn cob body with bite notch on the top-right */}
          <path
            d="M-10.5 -4.6H3.8C4.9 -4.6 5.6 -3.8 6.4 -2.8C7.4 -1.6 9.3 -1.6 10.3 -2.7C11.1 -3.5 12.1 -3.3 12.7 -2.4C13.4 -1.4 13.7 -0.2 13.6 1.1C13.4 3.4 11.4 5 8.8 5H-10.5C-12.5 5 -13.8 3.2 -13.8 0.2C-13.8 -2.8 -12.5 -4.6 -10.5 -4.6Z"
            fill="#FACC15"
            stroke={cornOutline}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Subtle inner cob highlight along the bite edge */}
          <path
            d="M5.6 -3.1C7.1 -1.1 9.6 -1.1 11.1 -2.8"
            stroke="#FEF08A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Kernel grid lines */}
          <path
            d="M-9.5 -0.2H11.5"
            stroke="#CA8A04"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M-7 -4.2V4.6M-2.2 -4.2V4.6M2.6 -4.2V4.6M7.4 -1.3V4.6"
            stroke="#CA8A04"
            strokeWidth="1.1"
            strokeLinecap="round"
          />

          {/* Character hand gripping the cob */}
          <rect
            x="-6.2"
            y="2.4"
            width="6.8"
            height="4.6"
            rx="2.3"
            fill={mascotColor}
            stroke={cornOutline}
            strokeWidth="1.5"
          />
        </g>

        {/* Radiating acoustic voice waves */}
        <path
          d="M47.5 20.5C50.3 23.2 51.8 26.5 51.8 29.8C51.8 33.1 50.3 36.4 47.5 39.1"
          stroke={mascotColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          className={animated ? 'animate-pulse' : ''}
        />
        <path
          d="M53.2 15.8C57 19.6 59 24.5 59 29.8C59 35.1 57 40 53.2 43.8"
          stroke={mascotColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.82"
          className={animated ? 'animate-pulse' : ''}
        />
      </g>
    </svg>
  );
};

export const TalkcobWordmark: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}> = ({ size = 'md', animated = false, className = '' }) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 30;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <TalkcobIcon size={iconSize} variant="badge" animated={animated} />
      <span className={`font-display font-bold tracking-tight whitespace-nowrap ${textSize}`}>
        Talkcob
      </span>
    </div>
  );
};
