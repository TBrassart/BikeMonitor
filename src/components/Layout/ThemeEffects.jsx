import React, { useEffect, useRef } from 'react';

const ThemeEffects = ({ effect }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        if (!effect || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // --- CLASSES D'EFFETS ---

        // 1. LAVE (Cercles flous qui bougent)
        const lavaBlobs = Array(15).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: Math.random() * 100 + 50,
            color: `hsl(${Math.random() * 40}, 100%, 50%)` // Rouge/Orange
        }));

        const drawLava = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Le flou crée l'effet "Lave" quand les cercles se croisent
            ctx.filter = 'blur(40px)'; 
            lavaBlobs.forEach(blob => {
                blob.x += blob.vx;
                blob.y += blob.vy;
                if (blob.x < 0 || blob.x > canvas.width) blob.vx *= -1;
                if (blob.y < 0 || blob.y > canvas.height) blob.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
                ctx.fillStyle = blob.color;
                ctx.fill();
            });
            ctx.filter = 'none';
        };

        // 2. MATRIX (Pluie binaire)
        const letters = '01';
        const fontSize = 14;
        const columns = Math.floor(window.innerWidth / fontSize); // Fix crash resize
        const drops = Array(columns).fill(1);
        
        const drawMatrix = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0F0';
            ctx.font = `${fontSize}px monospace`;
            for (let i = 0; i < drops.length; i++) {
                const text = letters.charAt(Math.floor(Math.random() * letters.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };

        // 3. VAPORWAVE (Briques + Néons)
        const neons = Array(10).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            w: Math.random() * 100 + 50,
            h: 5,
            color: Math.random() > 0.5 ? '#ff71ce' : '#01cdfe',
            blinkSpeed: Math.random() * 0.1
        }));

        const drawVaporwave = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Fond Briques (Dessiné procéduralement pour éviter chargement image)
            ctx.strokeStyle = 'rgba(255, 113, 206, 0.1)';
            ctx.lineWidth = 1;
            for(let y=0; y<canvas.height; y+=30) {
                for(let x=0; x<canvas.width; x+=60) {
                    const offset = (y/30) % 2 === 0 ? 0 : 30;
                    ctx.strokeRect(x + offset, y, 60, 30);
                }
            }
            // Néons
            neons.forEach(n => {
                ctx.shadowBlur = 20;
                ctx.shadowColor = n.color;
                ctx.fillStyle = n.color;
                // Clignotement
                if (Math.sin(time * n.blinkSpeed) > 0) {
                    ctx.fillRect(n.x, n.y, n.w, n.h);
                }
                ctx.shadowBlur = 0;
            });
        };

        // 4. STEALTH (Radar Scan)
        let scanLineY = 0;
        const drawStealth = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Grille verte
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<canvas.width; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); }
            for(let i=0; i<canvas.height; i+=50) { ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); }
            ctx.stroke();

            // Barre de scan
            scanLineY += 2;
            if(scanLineY > canvas.height) scanLineY = 0;
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#10b981';
            ctx.fillStyle = '#10b981';
            ctx.fillRect(0, scanLineY, canvas.width, 2);
            ctx.shadowBlur = 0;
        };

        // 5. GRAND TOUR (Route qui défile)
        let roadOffset = 0;
        const roadSpeed = 8; // Vitesse de défilement de la route

        // Création des cyclistes
        const cyclists = Array(25).fill().map(() => {
            const isMaillotJaune = Math.random() > 0.3; // 70% de maillots jaunes
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                // Vitesse relative : certains vont un peu plus vite que la route, d'autres moins vite
                speedVar: (Math.random() - 0.5) * 2, 
                color: isMaillotJaune ? '#facc15' : (Math.random() > 0.5 ? '#ffffff' : '#ef4444'), // Jaune, Blanc ou Rouge
                width: 12,
                height: 20
            };
        });

        const drawRoad = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 1. Fond Asphalte
            ctx.fillStyle = '#333'; 
            ctx.fillRect(0,0,canvas.width, canvas.height);
            
            // 2. Lignes de route défilantes
            ctx.fillStyle = '#facc15';
            roadOffset += roadSpeed; 
            if(roadOffset > 200) roadOffset = 0;
            const centerX = canvas.width / 2;
            for(let i = -200; i < canvas.height; i+=200) {
                // Ligne centrale pointillée
                ctx.fillRect(centerX - 5, i + roadOffset, 10, 100);
            }

            // 3. Dessiner les Cyclistes
            cyclists.forEach(c => {
                // Mise à jour position : vitesse de la route + leur propre variation
                c.y += roadSpeed + c.speedVar;

                // Respawn en haut s'ils sortent en bas
                if(c.y > canvas.height + 50) {
                    c.y = -50;
                    c.x = Math.random() * canvas.width;
                }
                // Respawn en bas s'ils sortent en haut (pour les plus lents)
                if(c.y < -50) {
                    c.y = canvas.height + 50;
                    c.x = Math.random() * canvas.width;
                }

                // Dessin du cycliste (vue de dessus simplifiée)
                ctx.save();
                ctx.translate(c.x, c.y);

                // Ombre portée (pour la profondeur)
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.ellipse(2, 5, c.width/2, c.height/2, 0, 0, Math.PI*2); ctx.fill();

                // Corps/Maillot (Ellipse)
                ctx.fillStyle = c.color;
                ctx.beginPath(); ctx.ellipse(0, 0, c.width/2, c.height/2, 0, 0, Math.PI*2); ctx.fill();

                // Casque (Petit cercle noir)
                ctx.fillStyle = '#222';
                ctx.beginPath(); ctx.arc(0, -c.height/3, c.width/3, 0, Math.PI*2); ctx.fill();

                ctx.restore();
            });
        };

        // 6. GIRO (Pétales Roses)
        const petals = Array(50).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            speed: Math.random() * 2 + 1,
            sway: Math.random() * 2,
            size: Math.random() * 5 + 2
        }));
        
        const drawPetals = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#db2777';
            
            petals.forEach(p => {
                p.y += p.speed;
                const swayOffset = Math.sin(time * 0.002 + p.sway) * 20;
                
                if(p.y > canvas.height) p.y = -10;
                
                ctx.beginPath();
                ctx.ellipse(p.x + swayOffset, p.y, p.size, p.size/2, Math.PI/4, 0, Math.PI*2);
                ctx.fill();
            });
        };

        // 7. OCEAN (Poissons + Algues)
        const fish = Array(10).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 2 + 0.5,
            size: Math.random() * 10 + 5,
            color: Math.random() > 0.5 ? '#0ea5e9' : '#14b8a6'
        }));

        const drawOcean = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Algues (Sinusoides en bas)
            ctx.strokeStyle = '#0f766e';
            ctx.lineWidth = 5;
            const weedCount = Math.floor(canvas.width / 50);
            for(let i=0; i<weedCount; i++) {
                ctx.beginPath();
                const baseX = i * 50;
                ctx.moveTo(baseX, canvas.height);
                const sway = Math.sin(time * 0.002 + i) * 30;
                ctx.quadraticCurveTo(baseX + sway, canvas.height - 100, baseX + sway/2, canvas.height - 200);
                ctx.stroke();
            }

            // Poissons
            fish.forEach(f => {
                f.x -= f.speed; // Nagent vers la gauche
                if(f.x < -50) f.x = canvas.width + 50;
                
                ctx.fillStyle = f.color;
                ctx.beginPath();
                // Corps
                ctx.ellipse(f.x, f.y, f.size*2, f.size, 0, 0, Math.PI*2);
                // Queue
                ctx.moveTo(f.x + f.size*1.5, f.y);
                ctx.lineTo(f.x + f.size*3, f.y - f.size);
                ctx.lineTo(f.x + f.size*3, f.y + f.size);
                ctx.fill();
            });
        };

        // 8. TOXIC (Fumée Verte)
        const gasClouds = Array(10).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 200 + 100,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5
        }));

        const drawToxic = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.filter = 'blur(60px)'; // Très flou
            
            gasClouds.forEach(c => {
                c.x += c.dx; c.y += c.dy;
                if(c.x < -c.r) c.x = canvas.width + c.r;
                if(c.x > canvas.width + c.r) c.x = -c.r;
                
                const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
                g.addColorStop(0, 'rgba(74, 222, 128, 0.4)');
                g.addColorStop(1, 'rgba(74, 222, 128, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.filter = 'none';
        };

        // 9. GOLD (Scintillement)
        const sparkles = Array(30).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3,
            alpha: Math.random(),
            speed: Math.random() * 0.02 + 0.005
        }));

        const drawGold = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            sparkles.forEach(s => {
                s.alpha += s.speed;
                if(s.alpha >= 1 || s.alpha <= 0) s.speed *= -1;
                
                ctx.globalAlpha = Math.abs(s.alpha);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                // Forme étoile
                ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        };

        // 10. SPACE
        const stars = Array(200).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * 2 + 0.5 // Vitesse/Profondeur
        }));

        const drawSpace = () => {
            // Fond sombre semi-transparent pour laisser une trainée (effet warp)
            ctx.fillStyle = 'rgba(10, 10, 20, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';

            stars.forEach(star => {
                star.y += star.z; // Les étoiles descendent
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
                
                // Taille selon la "profondeur" z
                const size = star.z * 1.2;
                ctx.beginPath();
                ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        // BOUCLE D'ANIMATION
        const render = (time) => {
            if (effect === 'lava') drawLava();
            else if (effect === 'matrix') drawMatrix();
            else if (effect === 'vaporwave') drawVaporwave(time);
            else if (effect === 'stealth') drawStealth();
            else if (effect === 'road') drawRoad();
            else if (effect === 'petals') drawPetals(time);
            else if (effect === 'ocean') drawOcean(time);
            else if (effect === 'toxic') drawToxic();
            else if (effect === 'gold') drawGold();
            else if (effect === 'space') drawSpace();
            
            requestRef.current = requestAnimationFrame(render);
        };

        requestRef.current = requestAnimationFrame(render);

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
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 0, pointerEvents: 'none', opacity: 0.6
            }}
        />
    );
};

export default ThemeEffects;