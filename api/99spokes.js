export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    const toSlug = (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "") // On garde chiffres et lettres
            .trim()
            .replace(/\s+/g, '-');
    };

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    let targetUrl = "";

    try {
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);

        // STRATÉGIE "GOOGLEBOT" : On tape directement l'URL publique de la page
        // Au lieu de chercher l'API cachée, on charge la page comme si on était Google
        targetUrl = `https://99spokes.com/fr-FR/bikes/${safeBrand}/${year}/${safeModel}`;
        
        console.log(`🤖 Googlebot va voir : ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                // L'astuce : On se fait passer pour Googlebot
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (response.status === 404) {
            return res.status(404).json({ 
                error: `Vélo introuvable (${year}). Essayez l'année d'avant ?`,
                debugUrl: targetUrl 
            });
        }

        if (response.status === 403) {
            console.error("⛔ Blocage 403 Cloudflare");
            return res.status(403).json({ 
                error: "Accès bloqué par 99spokes (Protection Anti-Robot).",
                debugUrl: targetUrl
            });
        }

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const html = await response.text();

        // EXTRACTION DE LA DATA CACHÉE (Hydratation Next.js)
        // Les données sont stockées dans une balise <script id="__NEXT_DATA__">
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);

        if (!jsonMatch || !jsonMatch[1]) {
            return res.status(500).json({ error: 'Impossible de lire les données de la page.' });
        }

        const jsonData = JSON.parse(jsonMatch[1]);
        
        // Navigation dans l'objet JSON géant pour trouver les specs
        // Chemin habituel : props -> pageProps -> bike -> components
        const rawComponents = jsonData.props?.pageProps?.bike?.components || {};
        const cleanParts = [];

        const categoryMap = {
            'chain': 'transmission', 'cassette': 'transmission',
            'rearDerailleur': 'transmission', 'shifters': 'transmission',
            'brakes': 'freinage', 'brakeLevers': 'freinage', 'rotors': 'freinage',
            'tires': 'pneus', 'tyres': 'pneus',
            'wheels': 'autre', 'handlebar': 'peripheriques', 'saddle': 'peripheriques'
        };

        Object.keys(rawComponents).forEach(section => {
            const items = rawComponents[section];
            if (typeof items === 'object' && items !== null) {
                Object.keys(items).forEach(key => {
                    const partName = items[key];
                    let myCat = 'autre';
                    
                    for (const [detect, cat] of Object.entries(categoryMap)) {
                        if (key.toLowerCase().includes(detect.toLowerCase())) myCat = cat;
                    }

                    if (myCat !== 'autre' && partName) {
                         const finalName = Array.isArray(partName) ? partName.join(' ') : partName;
                         cleanParts.push({
                            name: finalName,
                            category: myCat,
                            life_target_km: getLifeKm(myCat)
                        });
                    }
                });
            }
        });

        return res.status(200).json({ parts: cleanParts, debugUrl: targetUrl });

    } catch (error) {
        console.error("🔥 ERREUR:", error);
        return res.status(500).json({ error: error.message, debugUrl: targetUrl });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}