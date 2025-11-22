import React from 'react';

const Logo = ({ width = 50, height = 50, className = "" }) => {
    return (
        <svg 
            width={width} 
            height={height} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ overflow: 'visible' }} // Pour l'effet de lueur
        >
            {/* DÉGRADÉS DÉFINIS */}
            <defs>
                <linearGradient id="gearGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4a4a5e" />
                    <stop offset="1" stopColor="#2a2a3e" />
                </linearGradient>
                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* LE PLATEAU (ENGRENAGE) */}
            <path 
                d="M50 15C52 15 53.5 13 53.5 11V5C53.5 2.2 51.3 0 48.5 0H51.5C48.7 0 46.5 2.2 46.5 5V11C46.5 13 48 15 50 15Z" 
                transform="rotate(0 50 50)" fill="url(#gearGradient)" 
            />
            {/* Je simplifie ici avec un cercle cranté pour le code, plus propre */}
            <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M50 10C72.0914 10 90 27.9086 90 50C90 72.0914 72.0914 90 50 90C27.9086 90 10 72.0914 10 50C10 27.9086 27.9086 10 50 10ZM50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20Z" 
                fill="url(#gearGradient)" 
                stroke="#3a3a4e" 
                strokeWidth="2"
            />
            
            {/* DENTS DU PLATEAU (Simplifiées visuellement par un stroke pointillé) */}
            <circle cx="50" cy="50" r="43" stroke="#4a4a5e" strokeWidth="4" strokeDasharray="6 4" />

            {/* LA LIGNE DE POULS (ECG) */}
            <path 
                d="M15 50 H 35 L 42 32 L 52 68 L 60 42 L 68 50 H 85" 
                stroke="#00e5ff" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                filter="url(#neonGlow)" /* L'effet néon est ici */
            />
            
            {/* PETIT POINT DATA AU CENTRE */}
            <circle cx="52" cy="68" r="3" fill="#ff00c8" filter="url(#neonGlow)" />
        </svg>
    );
};

export default Logo;