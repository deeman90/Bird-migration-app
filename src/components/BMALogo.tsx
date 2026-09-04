import React from 'react';

interface BMALogoProps {
  className?: string;
  id?: string;
}

export const BMALogo: React.FC<BMALogoProps> = ({ className = 'h-8 sm:h-9 w-auto', id = 'bma-header-logo' }) => {
  return (
    <svg
      id={id}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 64"
      className={className}
      role="img"
      aria-label="BMA - Bird Migration App Logo"
    >
      {/* Background Badge Container */}
      <rect x="0" y="0" width="240" height="64" rx="12" fill="#059669" />

      {/* Compass Emblem Icon */}
      <g transform="translate(14, 12)">
        {/* Outer Ring */}
        <circle cx="20" cy="20" r="18" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <circle
          cx="20"
          cy="20"
          r="13"
          stroke="#FFFFFF"
          strokeDasharray="2 2"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />

        {/* Compass Pointer / Bird Silhouette */}
        <polygon points="20,6 25,18 20,15 15,18" fill="#34D399" />
        <polygon points="20,34 25,22 20,25 15,22" fill="#FFFFFF" opacity="0.7" />
        <circle cx="20" cy="20" r="2.5" fill="#FFFFFF" />
      </g>

      {/* Main Title Text */}
      <text
        x="64"
        y="34"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="24"
        letterSpacing="1.5"
        fill="#000000"
      >
        BMA
      </text>

      {/* Micro Subtitle Text */}
      <text
        x="64"
        y="48"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="700"
        fontSize="7.5"
        letterSpacing="1.2"
        fill="#000000"
      >
        BIRD MIGRATION APP
      </text>
    </svg>
  );
};

export default BMALogo;
