export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    // --- SÉCURITÉ ANTI-CRASH ---
    if (!brand || brand === 'undefined' || brand === 'null') {
        return res.status(400).json({ error: 'Marque manquante' });
    }
    if (!model || model === 'undefined' || model === 'null') {
        return res.status(400).json({ error: 'Modèle manquant' });
    }
    if (!year || year === 'undefined' || isNaN(year)) {
        return res.status(400).json({ error: 'Année manquante ou invalide' });
    }

    const toSlug = (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim().replace(/\s+/g, '-');
    };

    try {
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);

        console.log(`🔍 99spokes: ${safeBrand} ${safeModel} (${year})`);

        // 1. Home Page pour le BUILD_ID
        const homeResponse = await fetch('https://99spokes.com/fr-FR', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });
        
        if (!homeResponse.ok) throw new Error(`Home unreachable: ${homeResponse.status}`);
        
        const homeHtml = await homeResponse.text();
        const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
        
        if (!buildIdMatch || !buildIdMatch[1]) {
            return res.status(500).json({ error: 'Build ID introuvable (Site mis à jour ?)' });
        }
        
        const buildId = buildIdMatch[1];
        
        // 2. URL JSON
        const apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        const specsResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });

        if (specsResponse.status === 404) {
            return res.status(404).json({ error: `Vélo introuvable : ${brand} ${model} ${year}` });
        }

        const data = await specsResponse.json();

        // 3. Parsing
        const rawComponents = data.pageProps?.bike?.components || {};
        const cleanParts = [];

        const categoryMap = {
            'chain': 'transmission', 'cassette': 'transmission',
            'rearDerailleur': 'transmission', 'shifters': 'transmission',
            'brakes': 'freinage', 'tires': 'pneus', 'tyres': 'pneus',
            'wheels': 'autre'
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

        return res.status(200).json(cleanParts);

    } catch (error) {
        console.error("🔥 API CRASH:", error);
        return res.status(500).json({ error: error.message });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}