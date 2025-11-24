export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // --- FONCTION DE NETTOYAGE ROBUSTE ---
    const toSlug = (str) => {
        return str
            .toLowerCase() // Minuscules
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents (É -> e)
            .replace(/[^a-z0-9\s-]/g, "") // Enlève les caractères spéciaux (/, +, etc)
            .trim()
            .replace(/\s+/g, '-'); // Remplace les espaces par des tirets
    };

    try {
        // 1. On récupère la Home Page pour trouver le BUILD_ID
        const homeResponse = await fetch('https://99spokes.com/fr-FR', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });
        const homeHtml = await homeResponse.text();

        const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
        
        if (!buildIdMatch || !buildIdMatch[1]) {
            return res.status(500).json({ error: 'Impossible de récupérer le BUILD_ID' });
        }
        
        const buildId = buildIdMatch[1];
        
        // 3. On construit l'URL avec notre fonction de nettoyage
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);
        
        const apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        console.log("Fetching:", apiUrl);

        // 4. On récupère les specs
        const specsResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });

        if (!specsResponse.ok) {
            return res.status(404).json({ error: 'Vélo introuvable sur 99spokes' });
        }

        const data = await specsResponse.json();

        // ... (Le reste du parsing reste identique à ce que je t'ai donné avant) ...
        // Je te remets le bloc de parsing pour être sûr que le fichier est complet

        const rawComponents = data.pageProps?.bike?.components || {};
        const cleanParts = [];

        const categoryMap = {
            'chain': 'transmission',
            'cassette': 'transmission',
            'rearDerailleur': 'transmission',
            'shifters': 'transmission',
            'brakes': 'freinage',
            'tires': 'pneus',
            'tyres': 'pneus'
        };

        Object.keys(rawComponents).forEach(section => {
            const items = rawComponents[section];
            if (typeof items === 'object') {
                Object.keys(items).forEach(key => {
                    const partName = items[key];
                    let myCat = 'autre';
                    for (const [detect, cat] of Object.entries(categoryMap)) {
                        if (key.toLowerCase().includes(detect)) myCat = cat;
                    }

                    if (myCat !== 'autre' && partName) {
                         cleanParts.push({
                            name: Array.isArray(partName) ? partName.join(' ') : partName,
                            category: myCat,
                            life_target_km: getLifeKm(myCat)
                        });
                    }
                });
            }
        });

        return res.status(200).json(cleanParts);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur lors du scraping' });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}