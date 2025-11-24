export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    const toSlug = (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "") // Garde lettres, chiffres, espaces, tirets
            .trim()
            .replace(/\s+/g, '-');
    };

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    let apiUrl = ""; 

    try {
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);

        console.log(`🔍 Recherche: ${safeBrand} ${safeModel} (${year})`);

        // 1. Récupération de la Home Page (Racine, plus stable que /fr-FR)
        const homeResponse = await fetch('https://99spokes.com/', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });
        
        if (!homeResponse.ok) throw new Error(`Home inaccessible: ${homeResponse.status}`);
        
        const homeHtml = await homeResponse.text();
        let buildId = null;

        // --- STRATÉGIE DE DÉTECTION ROBUSTE (3 Méthodes) ---

        // Méthode A : Le script __NEXT_DATA__ (Le plus fiable)
        const nextDataMatch = homeHtml.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (nextDataMatch && nextDataMatch[1]) {
            try {
                const json = JSON.parse(nextDataMatch[1]);
                buildId = json.buildId;
                console.log("✅ BuildID trouvé (Méthode JSON):", buildId);
            } catch (e) { console.warn("Echec parsing JSON NextData"); }
        }

        // Méthode B : Regex sur la variable (Fallback)
        if (!buildId) {
            const regexMatch = homeHtml.match(/"buildId":"([^"]+)"/);
            if (regexMatch) {
                buildId = regexMatch[1];
                console.log("✅ BuildID trouvé (Méthode Regex):", buildId);
            }
        }

        // Méthode C : Recherche dans les liens de scripts JS (Ultime recours)
        // Cherche un truc du genre: src="/_next/static/BUILD_ID/_buildManifest.js"
        if (!buildId) {
            const scriptSrcMatch = homeHtml.match(/static\/([^/]+)\/_buildManifest\.js/);
            if (scriptSrcMatch) {
                buildId = scriptSrcMatch[1];
                console.log("✅ BuildID trouvé (Méthode Script Src):", buildId);
            }
        }

        // -------------------------------------------------------

        if (!buildId) {
            console.error("❌ ECHEC TOTAL : Build ID introuvable dans le HTML.");
            // On renvoie une erreur explicite sans crasher
            return res.status(500).json({ error: 'Impossible de scanner 99spokes (Protection site ?)' });
        }
        
        // 2. Construction de l'URL avec le BuildID trouvé
        apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        // 3. Appel API
        const specsResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });

        // Si 404, on renvoie l'URL pour debug
        if (specsResponse.status === 404) {
            return res.status(404).json({ 
                error: `Vélo introuvable. Essayez une autre année ?`,
                debugUrl: apiUrl 
            });
        }

        const data = await specsResponse.json();

        // 4. Parsing des pièces
        const rawComponents = data.pageProps?.bike?.components || {};
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

        return res.status(200).json({ parts: cleanParts, debugUrl: apiUrl });

    } catch (error) {
        console.error("🔥 ERREUR CRITIQUE:", error);
        return res.status(500).json({ error: error.message, debugUrl: apiUrl });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}