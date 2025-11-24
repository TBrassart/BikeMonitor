export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    const toSlug = (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim().replace(/\s+/g, '-');
    };

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    let apiUrl = ""; // On la déclare ici pour l'avoir dans le catch

    try {
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);

        // 1. Home Page pour le BUILD_ID
        const homeResponse = await fetch('https://99spokes.com/fr-FR', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });
        
        const homeHtml = await homeResponse.text();
        const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
        
        if (!buildIdMatch || !buildIdMatch[1]) {
            return res.status(500).json({ error: 'Build ID introuvable' });
        }
        
        const buildId = buildIdMatch[1];
        
        // 2. Construction URL
        apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        console.log("Target URL:", apiUrl);

        // 3. Fetch Specs
        const specsResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });

        // SI 404 : On renvoie l'URL tentée pour que tu puisses débugger
        if (specsResponse.status === 404) {
            return res.status(404).json({ 
                error: `Vélo introuvable (${specsResponse.status})`,
                debugUrl: apiUrl, // <--- C'EST ICI QUE ÇA SE PASSE
                slugs: { brand: safeBrand, model: safeModel, year }
            });
        }

        if (!specsResponse.ok) throw new Error(`Status ${specsResponse.status}`);

        const data = await specsResponse.json();

        // 4. Parsing (inchangé)
        const rawComponents = data.pageProps?.bike?.components || {};
        const cleanParts = [];
        
        const categoryMap = {
            'chain': 'transmission', 'cassette': 'transmission',
            'rearDerailleur': 'transmission', 'shifters': 'transmission',
            'brakes': 'freinage', 'brakeLevers': 'freinage', 'rotors': 'freinage',
            'tires': 'pneus', 'tyres': 'pneus', 'wheels': 'autre',
            'handlebar': 'peripheriques', 'saddle': 'peripheriques'
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
                            name: finalName, category: myCat, life_target_km: getLifeKm(myCat)
                        });
                    }
                });
            }
        });

        // On renvoie aussi l'URL en cas de succès pour vérifier
        return res.status(200).json({ parts: cleanParts, debugUrl: apiUrl });

    } catch (error) {
        return res.status(500).json({ 
            error: error.message,
            debugUrl: apiUrl 
        });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}