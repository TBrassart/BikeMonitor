import React, { useEffect, useRef } from 'react';

const ThemeEffects = ({ effect }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000, clickTime: 0 });

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

        // Gestion du clic pour les interactions
        const handleClick = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY, clickTime: Date.now() };
        };
        window.addEventListener('click', handleClick);

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
        const peloton = [];
        // Formation diamant serrée
        const rows = 5; const cols = 3;
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                if (r === 0 && c !== 1) continue; // Leader seul devant
                peloton.push({
                    bx: (c-1)*25 + (Math.random()-0.5)*5,
                    by: r*40 + (Math.random()-0.5)*5,
                    color: r===0 ? '#facc15' : (Math.random()>0.7 ? '#ef4444' : '#ffffff'),
                    swayOffset: Math.random()*100
                });
            }
        }

        const drawRoad = (time) => {
            const w = canvas.width; const h = canvas.height; const cx = w/2; const cy = h/2 - 100;
            ctx.clearRect(0,0,w,h);
            
            // Sol
            ctx.fillStyle = '#1e1e24'; ctx.fillRect(0,0,w,h);
            
            // Route défilante
            roadOffset += 8; if(roadOffset > 100) roadOffset = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx-120, 0); ctx.lineTo(cx-120, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx+120, 0); ctx.lineTo(cx+120, h); ctx.stroke();
            
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            for(let i=-100; i<h; i+=100) ctx.fillRect(cx-2, i+roadOffset, 4, 50);

            // Peloton
            const groupSway = Math.sin(time * 0.001) * 40; // Tout le groupe bouge
            ctx.save();
            ctx.translate(cx + groupSway, cy);

            peloton.forEach(p => {
                const indSway = Math.sin(time*0.005 + p.swayOffset) * 3;
                const px = p.bx + indSway;
                const py = p.by;

                // Ombre
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                drawPill(ctx, px+8, py+8, 10, 22);

                // Cycliste
                ctx.fillStyle = p.color;
                drawPill(ctx, px, py, 10, 22);
                
                // Casque
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.arc(px, py-6, 4, 0, Math.PI*2); ctx.fill();
            });
            ctx.restore();
            
            // Vitesse (traits blancs rapides sur les côtés)
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for(let i=0; i<10; i++) {
                const x = (time*i*100) % w;
                const y = Math.random() * h;
                if(x < cx-150 || x > cx+150) ctx.fillRect(x, y, 100, 2);
            }
        };

        const drawPill = (c, x, y, w, h) => {
            c.beginPath();
            c.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2);
            c.fill();
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

        // 14. MOUTONS (IA) ---
        // Initialisation du troupeau
        const sheepHerd = Array(12).fill().map(() => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 100), // Pas dans le lac direct
            state: 'idle', // idle, move, drink, flee
            target: {x:0, y:0},
            timer: Math.random() * 100,
            dir: 1 // 1 = droite, -1 = gauche
        }));

        const drawSheep = (time) => {
            // 1. Décors
            // Herbe
            ctx.fillStyle = '#3f6212'; 
            ctx.fillRect(0,0,canvas.width, canvas.height);
            
            // Lac (En bas à droite)
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.ellipse(canvas.width, canvas.height, 300, 150, 0, 0, Math.PI*2);
            ctx.fill();

            // 2. Logique Moutons
            sheepHerd.forEach(s => {
                // --- CERVEAU MOUTON ---
                
                // Interaction Peur (Clic souris)
                const distMouse = Math.hypot(s.x - mouseRef.current.x, s.y - mouseRef.current.y);
                if (Date.now() - mouseRef.current.clickTime < 500 && distMouse < 200) {
                    s.state = 'flee';
                    // Vecteur de fuite
                    const angle = Math.atan2(s.y - mouseRef.current.y, s.x - mouseRef.current.x);
                    s.target.x = s.x + Math.cos(angle) * 300;
                    s.target.y = s.y + Math.sin(angle) * 300;
                }

                if (s.state === 'idle') {
                    s.timer--;
                    if (s.timer <= 0) {
                        // Décision : Bouger ou Boire ?
                        if (Math.random() > 0.8) {
                            s.state = 'drink'; // Aller au lac
                            s.target = { 
                                x: canvas.width - Math.random() * 150, 
                                y: canvas.height - Math.random() * 80 
                            };
                        } else {
                            s.state = 'move';
                            s.target = { 
                                x: Math.max(50, Math.min(canvas.width-50, s.x + (Math.random()-0.5)*200)),
                                y: Math.max(50, Math.min(canvas.height-50, s.y + (Math.random()-0.5)*200))
                            };
                        }
                        s.dir = s.target.x > s.x ? 1 : -1;
                    }
                }
                else if (s.state === 'move' || s.state === 'drink' || s.state === 'flee') {
                    // Déplacement fluide
                    const dx = s.target.x - s.x;
                    const dy = s.target.y - s.y;
                    const dist = Math.hypot(dx, dy);
                    
                    if (dist < 5) {
                        s.state = 'idle';
                        s.timer = Math.random() * 200 + 100;
                    } else {
                        const speed = s.state === 'flee' ? 4 : 0.5;
                        s.x += (dx / dist) * speed;
                        s.y += (dy / dist) * speed;
                        
                        // Petit sautillement
                        if (s.state !== 'drink') s.y += Math.sin(time * 0.2) * 0.5;
                    }
                }

                // --- DESSIN MOUTON ---
                ctx.save();
                ctx.translate(s.x, s.y);
                if (s.dir === -1) ctx.scale(-1, 1); // Miroir si va à gauche

                // Pattes
                ctx.fillStyle = '#000';
                const legAnim = s.state !== 'idle' ? Math.sin(time * 0.2) * 3 : 0;
                ctx.fillRect(-8+legAnim, 10, 3, 10);
                ctx.fillRect(5-legAnim, 10, 3, 10);

                // Corps (Laine)
                ctx.fillStyle = '#fefce8'; // Crème
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(-10, -5, 12, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -2, 11, 0, Math.PI*2); ctx.fill();

                // Tête
                ctx.fillStyle = '#1f2937'; // Noir/Gris
                // Si boit, tête en bas
                const headY = (s.state === 'drink' && Math.hypot(s.x - s.target.x, s.y - s.target.y) < 10) ? 10 : -5;
                ctx.beginPath(); ctx.ellipse(15, headY, 8, 5, 0, 0, Math.PI*2); ctx.fill();
                
                ctx.restore();
            });
        };

        // 15. RETROWAVE (La Grille Infinie)
        const drawRetrowave = (time) => {
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2; // Horizon au centre
            
            // 1. Ciel (Dégradé sombre)
            const skyGrad = ctx.createLinearGradient(0, 0, 0, cy);
            skyGrad.addColorStop(0, '#0f0c29');
            skyGrad.addColorStop(0.5, '#302b63');
            skyGrad.addColorStop(1, '#24243e');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, cy);

            // 2. Soleil (Gradient + Bandes)
            const sunY = cy - 50;
            const sunSize = Math.min(w, h) * 0.25;
            const sunGrad = ctx.createLinearGradient(0, sunY - sunSize, 0, sunY + sunSize);
            sunGrad.addColorStop(0, '#ffd700'); // Jaune
            sunGrad.addColorStop(0.5, '#ff00c8'); // Rose
            sunGrad.addColorStop(1, '#9900ff'); // Violet
            
            ctx.fillStyle = sunGrad;
            ctx.beginPath(); ctx.arc(cx, sunY, sunSize, 0, Math.PI*2); ctx.fill();

            // Bandes noires sur le soleil (Scanlines)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for(let i=0; i<10; i++) {
                const bandY = sunY + (i * sunSize/5) - (time*0.02 % (sunSize/5));
                const height = i * 2;
                if (bandY > sunY - sunSize && bandY < sunY + sunSize) {
                     ctx.fillRect(cx - sunSize, bandY, sunSize*2, height);
                }
            }

            // 3. Sol (Noir profond)
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, cy, w, h/2);

            // 4. Grille (Perspective 3D)
            ctx.strokeStyle = '#d946ef'; // Rose Néon
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#d946ef';

            // Lignes Verticales (Fuyantes)
            ctx.beginPath();
            const fov = 300;
            for (let i = -2000; i < 2000; i += 100) {
                // Projection simple
                // Point au sol (bas de l'écran)
                const x1 = cx + i * 3;
                const y1 = h;
                // Point à l'horizon
                const x2 = cx + i * 0.1;
                const y2 = cy;
                
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();

            // Lignes Horizontales (Qui avancent)
            // Z va de l'horizon (loin) vers nous (proche)
            const speed = 0.0001;
            const offset = (time * speed) % 0.1; // 0 à 1
            
            ctx.beginPath();
            for (let z = 0; z < 1; z += 0.05) {
                // Effet de perspective : y = horizon + (hauteur / z)
                // On ajoute l'offset pour le mouvement
                let currentZ = z - offset;
                if (currentZ <= 0) currentZ += 1;
                
                // Plus Z est petit (proche), plus Y est grand (bas)
                // Inversion : Z=0 est l'horizon, Z=1 est le bas de l'écran
                // Formule "fake 3D"
                const p = 1 - currentZ; // 1 (horizon) -> 0 (bas)
                
                // Fonction exponentielle pour tasser les lignes à l'horizon
                const y = cy + (h/2) * Math.pow(currentZ, 4); // Puissance 4 pour l'effet de profondeur extrême
                
                if (y < h && y > cy) {
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                }
            }
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset glow
        };

        // BOUCLE D'ANIMATION
        const render = (time) => {
            if (effect === 'lava') drawLava();
            if (effect === 'matrix') drawMatrix();
            if (effect === 'vaporwave') drawVaporwave(time);
            if (effect === 'stealth') drawStealth();
            if (effect === 'road') drawRoad();
            if (effect === 'petals') drawPetals(time);
            if (effect === 'ocean') drawOcean(time);
            if (effect === 'toxic') drawToxic();
            if (effect === 'gold') drawGold();
            if (effect === 'space') drawSpace();
            if (effect === 'mountain') drawMountain(time);
            if (effect === 'nature') drawNature(time);
            if (effect === 'pinot') drawPinot(time);
            if (effect === 'sheep') drawSheep(time);
            if (effect === 'retrowave') drawRetrowave(time);

            requestRef.current = requestAnimationFrame(render);
        };

        requestRef.current = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('click', handleClick);
            cancelAnimationFrame(requestRef.current);
        };
    }, [effect]);

    if (!effect) return null;

    return (
        <canvas 
            ref={canvasRef}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 0, pointerEvents: 'auto', opacity: 0.6
            }}
        />
    );
};

export default ThemeEffects;