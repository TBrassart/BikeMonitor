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
        const roadSpeed = 6;
        
        // Création du peloton serré
        // On les place en formation "diamant" ou "flèche"
        const peloton = [];
        const rows = 5;
        const cols = 3;
        const spacingX = 30;
        const spacingY = 50;

        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                // Petit décalage aléatoire pour faire naturel
                const offsetX = (Math.random()-0.5) * 10;
                const offsetY = (Math.random()-0.5) * 20;
                
                // Le leader est seul devant (dernière ligne, milieu)
                if (r === rows-1 && c !== 1) continue; 

                peloton.push({
                    baseX: c * spacingX - (cols*spacingX)/2 + offsetX,
                    baseY: r * spacingY + offsetY,
                    x: 0, y: 0, // Position calculée à chaque frame
                    color: (r === rows-1) ? '#facc15' : (Math.random() > 0.7 ? '#ef4444' : '#ffffff'), // Leader jaune, autres blanc/rouge
                    swayOffset: Math.random() * 100 // Pour l'oscillation individuelle
                });
            }
        }

        const drawRoad = (time) => {
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            ctx.clearRect(0, 0, w, h);
            
            // 1. SOL (Asphalte gris foncé)
            ctx.fillStyle = '#1e1e24'; 
            ctx.fillRect(0,0,w,h);

            // 2. MARQUAGES ROUTE (Défilement)
            roadOffset += roadSpeed;
            if(roadOffset > 100) roadOffset = 0;

            // Bandes latérales
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - 150, 0); ctx.lineTo(cx - 150, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 150, 0); ctx.lineTo(cx + 150, h); ctx.stroke();

            // Ligne centrale pointillée
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for(let i = -100; i < h; i+=100) {
                ctx.fillRect(cx - 2, i + roadOffset, 4, 50);
            }

            // 3. PELOTON (Le groupe bouge ensemble)
            // Oscillation globale du peloton (gauche/droite)
            const groupSway = Math.sin(time * 0.001) * 30;

            ctx.save();
            ctx.translate(cx + groupSway, cy); // On centre le peloton

            peloton.forEach(p => {
                // Oscillation individuelle (effet "danseuse")
                const indSway = Math.sin(time * 0.005 + p.swayOffset) * 2;
                const px = p.baseX + indSway;
                const py = p.baseY;

                // --- DESSIN DU CYCLISTE (STYLE MINIMALISTE VUE DESSUS) ---
                
                // Ombre portée (pour l'effet de hauteur)
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                drawCyclistShape(ctx, px + 10, py + 10, 25); // Décalé

                // Le Cycliste
                ctx.fillStyle = p.color;
                // Ombre interne pour le volume
                ctx.shadowBlur = 0;
                drawCyclistShape(ctx, px, py, 25);
                
                // Casque (Petit rond plus foncé)
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.arc(px, py - 8, 6, 0, Math.PI*2); ctx.fill();
            });

            ctx.restore();
            
            // Effet de vitesse (traits sur les côtés)
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for(let i=0; i<5; i++) {
                const x = (time * 2 + i * 200) % w;
                const y = Math.random() * h;
                if(x < cx - 200 || x > cx + 200) ctx.fillRect(x, y, 50, 2);
            }
        };

        // Helper pour dessiner la forme "Gélule"
        const drawCyclistShape = (context, x, y, scale) => {
            context.beginPath();
            // Forme ovale allongée
            context.ellipse(x, y, 8, 18, 0, 0, Math.PI*2);
            context.fill();
            // Épaules (petit rectangle arrondi)
            context.beginPath();
            context.roundRect(x - 10, y - 5, 20, 8, 4);
            context.fill();
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

        // 11. MOUNTAIN (Parallaxe) ---
        // Génération des crêtes de montagne
        const createPeaks = (count, height, yOffset) => {
            const points = [];
            const step = canvas.width / count;
            for (let i = 0; i <= count; i++) {
                // Variation aléatoire pour faire "pic"
                points.push({ x: i * step, y: canvas.height - yOffset - Math.random() * height });
            }
            return points;
        };
        // On génère une fois pour toutes
        const m1 = createPeaks(5, 300, 200); // Fond (Haut)
        const m2 = createPeaks(10, 200, 100); // Milieu
        
        let snowY = 0;
        const drawMountain = (time) => {
            // Ciel
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e293b');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            const drawPoly = (points, color) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height);
                points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.lineTo(canvas.width, canvas.height);
                ctx.fill();
            };

            drawPoly(m1, '#334155'); // Montagnes lointaines
            drawPoly(m2, '#1e293b'); // Montagnes proches

            // Neige très lente
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            snowY += 0.2;
            for(let i=0; i<50; i++) {
                const x = (i * 997) % canvas.width;
                const y = (snowY + i * 123) % canvas.height;
                ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
            }
        };

        // 12. NATURE (Forêt & Lucioles) ---
        const trees = Array(6).fill().map((_, i) => ({
            x: i * (canvas.width/5) + Math.random()*50,
            width: Math.random() * 40 + 60,
        }));
        
        const drawNature = (time) => {
            // Fond vert sombre
            ctx.fillStyle = '#052e16'; ctx.fillRect(0,0,canvas.width, canvas.height);

            // Rayons
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const rayGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            rayGrad.addColorStop(0, 'rgba(250, 204, 21, 0.05)');
            rayGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            const sway = Math.sin(time * 0.0002) * 50;
            ctx.moveTo(0, 0); ctx.lineTo(canvas.width/2 + sway, canvas.height);
            ctx.lineTo(canvas.width, 0);
            ctx.fill();
            ctx.restore();

            // Arbres (Silhouettes noires massives)
            ctx.fillStyle = '#022c22';
            trees.forEach(t => {
                ctx.fillRect(t.x, 0, t.width, canvas.height);
            });
            
            // Lucioles lentes
            for(let i=0; i<20; i++) {
                const x = (Math.sin(time*0.0005 + i)*canvas.width/2) + canvas.width/2;
                const y = (Math.cos(time*0.0003 + i)*canvas.height/2) + canvas.height/2;
                ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
            }
        };

        // 13. PINOT (Fumigènes & Chèvre) ---
        let pinotRoadOffset = 0;
        const pinotSpeed = 6; // Vitesse de défilement
        
        // Les supporters (Foule sur les côtés)
        const supporters = [];
        const sideMargin = 100; // Espace laissé pour la route au centre
        
        // On génère une foule dense
        for(let i=0; i<40; i++) {
            supporters.push({
                x: Math.random() > 0.5 ? Math.random() * (canvas.width/2 - sideMargin) : canvas.width/2 + sideMargin + Math.random() * (canvas.width/2 - sideMargin),
                y: Math.random() * canvas.height,
                color: `hsl(${Math.random()*360}, 70%, 50%)`, // T-shirts colorés
                jumpOffset: Math.random() * 100,
                hasFlare: Math.random() > 0.8 // 20% ont un fumigène
            });
        }

        // Les fumigènes (Particules)
        const pinotSmoke = [];

        const drawPinot = (time) => {
            const cx = canvas.width / 2;
            
            // 1. SOL (Asphalte)
            ctx.fillStyle = '#333'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. FOULE (Supporters qui sautent)
            supporters.forEach(s => {
                // Sautillement de ferveur
                const jump = Math.abs(Math.sin(time * 0.01 + s.jumpOffset)) * 10;
                
                // Corps
                ctx.fillStyle = s.color;
                ctx.beginPath(); ctx.arc(s.x, s.y - jump, 8, 0, Math.PI*2); ctx.fill(); // Tête
                ctx.fillRect(s.x - 8, s.y + 8 - jump, 16, 20); // Torse

                // Fumigène
                if (s.hasFlare && Math.random() > 0.5) {
                    pinotSmoke.push({
                        x: s.x + (Math.random()-0.5)*10,
                        y: s.y - jump - 10,
                        vx: (Math.random()-0.5) + (cx - s.x)*0.005, // La fumée va vers la route
                        vy: -Math.random()*3,
                        size: Math.random()*10 + 5,
                        color: Math.random() > 0.66 ? 'rgba(0,85,164,0.4)' : (Math.random() > 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(239,65,53,0.4)'), // BBR
                        life: 1
                    });
                }
            });

            // 3. ROUTE & MARQUAGES
            // Bande centrale (Route dégagée)
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - sideMargin, 0, sideMargin * 2, canvas.height);
            
            pinotRoadOffset += pinotSpeed;
            if (pinotRoadOffset > 400) pinotRoadOffset = 0; // Boucle plus longue pour le texte

            // Texte au sol "THIBAUT" "PINOT" "ALLEZ"
            ctx.save();
            ctx.translate(cx, 0);
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = 'bold 40px Arial';
            
            // On dessine les mots qui défilent
            const words = ["ALLEZ", "THIBAUT", "PINOT", "MERCI", "🐐"];
            words.forEach((word, i) => {
                const y = (i * 150 + pinotRoadOffset) % 800; // Espace vertical entre mots
                // Effet perspective simple (plus petit en haut)
                if(y < canvas.height) {
                    ctx.fillText(word, 0, y);
                }
            });
            ctx.restore();

            // 4. THIBAUT & KIM (Le Duo)
            const bikeY = canvas.height - 150;
            
            // -- THIBAUT --
            ctx.save();
            ctx.translate(cx - 20, bikeY);
            // Ombre
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(5, 10, 15, 30, 0, 0, Math.PI*2); ctx.fill();
            // Maillot FDJ (Bleu/Blanc/Rouge simplifié)
            ctx.fillStyle = '#0055a4';
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 25, 0, 0, Math.PI*2); ctx.fill(); // Corps
            ctx.fillStyle = '#fff'; ctx.fillRect(-8, -10, 16, 5); // Bande blanche
            ctx.fillStyle = '#ef4135'; ctx.fillRect(-8, -5, 16, 5); // Bande rouge
            // Casque
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            // -- KIM (LA CHÈVRE) --
            ctx.save();
            // Elle court un peu derrière et sur le côté
            const kimOffset = Math.sin(time * 0.005) * 30; // Elle zigzague un peu
            ctx.translate(cx + 30 + kimOffset, bikeY + 40);
            
            // Ombre
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(2, 5, 10, 8, 0, 0, Math.PI*2); ctx.fill();
            
            // Corps (Blanc)
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI*2); ctx.fill();
            // Tête
            ctx.beginPath(); ctx.arc(8, -5, 6, 0, Math.PI*2); ctx.fill();
            // Cornes
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(12, -15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(2, -15); ctx.stroke();
            // Pattes (animation rapide)
            ctx.fillStyle = '#333';
            const leg = Math.sin(time * 0.02) * 5;
            ctx.fillRect(-5+leg, 5, 2, 8);
            ctx.fillRect(5-leg, 5, 2, 8);
            ctx.restore();

            // 5. FUMÉE (Au premier plan pour l'immersion)
            pinotSmoke.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy; p.life -= 0.01;
                p.size += 0.5;
                if (p.life <= 0) pinotSmoke.splice(i, 1);
                else {
                    ctx.globalAlpha = p.life * 0.6;
                    ctx.fillStyle = p.color;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                }
            });
            ctx.globalAlpha = 1;
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
            else if (effect === 'mountain') drawMountain(time);
            else if (effect === 'nature') drawNature(time);
            else if (effect === 'pinot') drawPinot(time);
            else if (effect === 'sheep') drawSheep(time);
            
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