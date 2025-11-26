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

        // 11. MOUNTAIN (Parallaxe) ---
        // Génération des crêtes de montagne
        const createMountain = (count, height, roughness) => {
            const points = [];
            for (let i = 0; i <= count; i++) {
                points.push({
                    x: (canvas.width / count) * i,
                    y: canvas.height - height + (Math.random() - 0.5) * roughness
                });
            }
            return points;
        };
        const layer1 = createMountain(10, 150, 50);
        const layer2 = createMountain(20, 100, 30);
        const layer3 = createMountain(30, 50, 20);
        let snowY = 0;

        const drawMountain = (time) => {
            // Ciel dégradé
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#334155');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Lune
            ctx.fillStyle = '#f8fafc';
            ctx.shadowBlur = 20; ctx.shadowColor = 'white';
            const moonY = 100 + Math.sin(time * 0.0001) * 50;
            ctx.beginPath(); ctx.arc(100, moonY, 40, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;

            // Dessin des couches (Simple parallaxe via translation)
            const drawLayer = (points, color, speed) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height);
                const offset = (time * speed) % canvas.width;
                
                points.forEach(p => {
                    // Astuce pour boucle infinie : on dessine 2 fois
                    ctx.lineTo(p.x - offset, p.y);
                });
                // Suite de la boucle pour remplir l'écran
                points.forEach(p => {
                    ctx.lineTo(p.x + canvas.width - offset, p.y);
                });
                
                ctx.lineTo(canvas.width, canvas.height);
                ctx.lineTo(0, canvas.height);
                ctx.fill();
            };

            drawLayer(layer1, '#1e293b', 0.2); // Loin
            drawLayer(layer2, '#334155', 0.5); // Moyen
            drawLayer(layer3, '#475569', 1);   // Proche

            // Neige
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            snowY += 0.5;
            for(let i=0; i<50; i++) {
                const x = (i * 123456) % canvas.width;
                const y = (snowY + i * 123) % canvas.height;
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
            }
        };


        // 12. NATURE (Forêt & Lucioles) ---
        const particles = Array(40).fill().map(() => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: Math.random() * 0.5, vy: Math.random() * -0.5,
            size: Math.random() * 3, alpha: Math.random()
        }));
        let wind = 0;

        const drawNature = (time) => {
            // Fond vert profond
            const grad = ctx.createRadialGradient(canvas.width/2, 0, 0, canvas.width/2, canvas.height, canvas.height);
            grad.addColorStop(0, '#14532d'); grad.addColorStop(1, '#052e16');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Rayons de lumière (God Rays)
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; // Mode lumière
            const rayGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            rayGrad.addColorStop(0, 'rgba(250, 204, 21, 0.1)');
            rayGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(canvas.width/2 + Math.sin(time*0.0005)*200, canvas.height);
            ctx.lineTo(canvas.width/2 + 300 + Math.sin(time*0.0005)*200, canvas.height);
            ctx.lineTo(200, 0);
            ctx.fill();
            ctx.restore();

            // Vent aléatoire
            if (Math.random() > 0.99) wind = 2;
            wind *= 0.98;

            // Lucioles / Spores
            particles.forEach(p => {
                p.x += p.vx + wind;
                p.y += p.vy;
                if(p.x > canvas.width) p.x = 0;
                if(p.y < 0) p.y = canvas.height;

                ctx.fillStyle = `rgba(250, 204, 21, ${0.3 + Math.sin(time*0.005 + p.x)*0.2})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            });
        };


        // 13. PINOT (Fumigènes & Chèvre) ---
        const flares = []; // Particules de fumée
        let goat = { x: -100, active: false }; // Kimberley la chèvre
        let nextAttack = 0;

        const drawPinot = (time) => {
            ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Générer fumigènes (BBR)
            if (flares.length < 200) {
                const colorPool = ['#0055a4', '#ffffff', '#ef4135']; // Bleu Blanc Rouge
                flares.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height + Math.random() * 50,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -(Math.random() * 3 + 1),
                    size: Math.random() * 20 + 10,
                    color: colorPool[Math.floor(Math.random() * 3)],
                    life: 1
                });
            }

            // Dessiner fumigènes
            flares.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy; p.life -= 0.005;
                p.size *= 1.01; // La fumée s'étend
                if (p.life <= 0) flares.splice(i, 1);

                ctx.globalAlpha = p.life * 0.3;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            });
            ctx.globalAlpha = 1;

            // L'ATTAQUE DE KIMBERLEY
            if (!goat.active && Math.random() > 0.995 && time > nextAttack) {
                goat.active = true;
                goat.x = -100;
                nextAttack = time + 10000; // Cooldown
            }

            if (goat.active) {
                goat.x += 5; // Vitesse de sprint
                
                // Dessin Cycliste (Abstrait)
                const cy = canvas.height - 100;
                const cx = goat.x + 200;
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx, cy, 30, 20); // Corps
                ctx.beginPath(); ctx.arc(cx+5, cy+20, 10, 0, Math.PI*2); ctx.fill(); // Roue
                ctx.beginPath(); ctx.arc(cx+25, cy+20, 10, 0, Math.PI*2); ctx.fill(); // Roue

                // Dessin Chèvre (Kimberley)
                ctx.fillStyle = '#eee'; // Blanc laine
                const gy = canvas.height - 90 + Math.sin(time*0.05)*5; // Rebond
                ctx.beginPath(); ctx.ellipse(goat.x, gy, 15, 10, 0, 0, Math.PI*2); ctx.fill(); // Corps
                ctx.beginPath(); ctx.arc(goat.x+12, gy-8, 6, 0, Math.PI*2); ctx.fill(); // Tête
                
                // Texte ferveur
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText("ALLEZ THIBAUT !", cx - 20, cy - 30);

                if (goat.x > canvas.width) goat.active = false;
            }
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