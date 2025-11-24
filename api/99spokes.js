export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    // Fonction de nettoyage interne (Indispensable)
    const toSlug = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, '-');
    };

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    try {
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);

        console.log(`🔍 [API] Recherche 99spokes: ${safeBrand} ${safeModel} (${year})`);

        // 1. Home Page pour le BUILD_ID
        const homeResponse = await fetch('https://99spokes.com/fr-FR', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
            }
        });
        
        if (!homeResponse.ok) throw new Error(`Home unreachable: ${homeResponse.status}`);
        
        const homeHtml = await homeResponse.text();
        
        // Regex plus souple pour trouver le buildId
        const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
        
        if (!buildIdMatch || !buildIdMatch[1]) {
            console.error("❌ [API] Build ID introuvable dans le HTML");
            return res.status(500).json({ error: 'Impossible de récupérer le token 99spokes.' });
        }
        
        const buildId = buildIdMatch[1];
        
        // 2. URL JSON
        const apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        console.log("👉 [API] Fetching:", apiUrl);

        const specsResponse = await fetch(apiUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (specsResponse.status === 404) {
            return res.status(404).json({ error: 'Vélo introuvable. Vérifiez l\'orthographe exacte.' });
        }

        if (!specsResponse.ok) {
            throw new Error(`Erreur API 99spokes: ${specsResponse.status}`);
        }

        const data = await specsResponse.json();
        const rawComponents = data.pageProps?.bike?.components || {};
        const cleanParts = [];

        const categoryMap = {
            'chain': 'transmission',
            'cassette': 'transmission',
            'rearDerailleur': 'transmission',
            'shifters': 'transmission',
            'brakes': 'freinage',
            'brakeLevers': 'freinage',
            'rotors': 'freinage',
            'tires': 'pneus',
            'tyres': 'pneus',
            'wheels': 'autre',
            'handlebar': 'peripheriques',
            'saddle': 'peripheriques'
        };

        Object.keys(rawComponents).forEach(section => {
            const items = rawComponents[section];
            if (typeof items === 'object' && items !== null) {
                Object.keys(items).forEach(key => {
                    const partName = items[key];
                    let myCat = 'autre';
                    
                    // Détection de catégorie
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

        return res.status(200).json(cleanParts);

    } catch (error) {
        console.error("🔥 [API CRASH]", error);
        return res.status(500).json({ error: error.message || 'Erreur interne' });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}