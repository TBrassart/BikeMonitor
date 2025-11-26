import React, { useEffect, useRef } from 'react';

const ThemeEffects = ({ effect }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        if (!effect || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Ajuster la taille
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // --- MOTEUR D'EFFETS ---
        
        // 1. MATRIX RAIN
        const matrixEffect = () => {
            const letters = '0101010101010101010101010101'; // Binaire
            const fontSize = 14;
            const columns = canvas.width / fontSize;
            const drops = Array(Math.ceil(columns)).fill(1);

            const draw = () => {
                // Fond noir semi-transparent pour l'effet de traînée
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#0F0'; // Vert Hacker
                ctx.font = `${fontSize}px monospace`;

                for (let i = 0; i < drops.length; i++) {
                    const text = letters.charAt(Math.floor(Math.random() * letters.length));
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                    // Reset aléatoire ou fin d'écran
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                        drops[i] = 0;
                    }
                    drops[i]++;
                }
                requestRef.current = requestAnimationFrame(draw);
            };
            draw();
        };

        // 2. SPACE WARP (Exemple pour un autre thème futur)
        const spaceEffect = () => {
            const stars = Array(200).fill().map(() => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 2
            }));

            const draw = () => {
                ctx.fillStyle = 'rgba(10, 10, 20, 0.2)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';

                stars.forEach(star => {
                    star.y += star.z;
                    if (star.y > canvas.height) {
                        star.y = 0;
                        star.x = Math.random() * canvas.width;
                    }
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.z, 0, Math.PI * 2);
                    ctx.fill();
                });
                requestRef.current = requestAnimationFrame(draw);
            };
            draw();
        };

        // SÉLECTION DE L'EFFET
        if (effect === 'matrix') matrixEffect();
        if (effect === 'space') spaceEffect();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(requestRef.current);
        };
    }, [effect]);

    if (!effect) return null;

    return (
        <canvas 
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100%', height: '100%',
                zIndex: 0, // Derrière le contenu (App.css gère le z-index du main)
                pointerEvents: 'none', // Laisse passer les clics
                opacity: 0.4 // Subtil
            }}
        />
    );
};

export default ThemeEffects;