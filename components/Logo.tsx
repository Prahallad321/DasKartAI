
import React from 'react';

interface LogoProps {
  className?: string;
  disableText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", disableText = true }) => {
  return (
    <div className={`flex items-center gap-2 ${disableText ? 'justify-center' : ''}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="daskart-gradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#00C2FF" />
            <stop offset="100%" stopColor="#F7941D" />
          </linearGradient>
        </defs>
        
        {/* Cart Body */}
        <path 
          d="M20 25 H80 L72 65 H28 L20 25 Z" 
          stroke="url(#daskart-gradient)" 
          strokeWidth="6" 
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.05"
        />
        
        {/* Handle */}
        <path 
          d="M80 25 L85 15 H95" 
          stroke="url(#daskart-gradient)" 
          strokeWidth="6" 
          strokeLinecap="round"
        />
        
        {/* Wheels */}
        <circle cx="35" cy="75" r="6" fill="#F7941D" />
        <circle cx="65" cy="75" r="6" fill="#00C2FF" />
        
        {/* Brain/Circuit Details inside Cart */}
        <circle cx="50" cy="45" r="4" fill="currentColor" />
        <path d="M50 45 L35 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 45 L65 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 45 L50 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        
        <circle cx="35" cy="35" r="2.5" fill="#00C2FF" />
        <circle cx="65" cy="35" r="2.5" fill="#F7941D" />
        <circle cx="50" cy="55" r="2.5" fill="currentColor" />
      </svg>
      {!disableText && (
        <span className="font-bold text-xl tracking-tight text-inherit">
          DasKart<span className="text-[#00C2FF]">AI</span>
        </span>
      )}
    </div>
  );
};
