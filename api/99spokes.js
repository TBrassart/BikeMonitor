export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants (brand, year, model)' });
    }

    try {
        // 1. On récupère la Home Page pour trouver le BUILD_ID
        // On se fait passer pour un vrai navigateur (User-Agent) pour éviter les blocages basiques
        const homeResponse = await fetch('https://99spokes.com/fr-FR', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });
        const homeHtml = await homeResponse.text();

        // 2. On extrait le buildId via Regex (Next.js le met dans __NEXT_DATA__)
        // On cherche la chaine : "buildId":"xyz..."
        const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
        
        if (!buildIdMatch || !buildIdMatch[1]) {
            return res.status(500).json({ error: 'Impossible de récupérer le BUILD_ID 99spokes' });
        }
        
        const buildId = buildIdMatch[1];
        
        // 3. On construit l'URL magique JSON
        const safeBrand = brand.toLowerCase().replace(/\s+/g, '-');
        const safeModel = model.toLowerCase().replace(/\s+/g, '-');
        
        const apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        console.log("Fetching 99spokes API:", apiUrl);

        // 4. On récupère les specs
        const specsResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });

        if (!specsResponse.ok) {
            return res.status(404).json({ error: 'Vélo introuvable sur 99spokes' });
        }

        const data = await specsResponse.json();

        // 5. On nettoie et mappe les données pour notre app
        // La structure de 99spokes est complexe, on essaie d'attraper les composants
        const rawComponents = data.pageProps?.bike?.components || {};
        const cleanParts = [];

        // Mapping de catégories 99spokes -> BikeMonitor
        const categoryMap = {
            'chain': 'transmission',
            'cassette': 'transmission',
            'rearDerailleur': 'transmission',
            'shifters': 'transmission',
            'brakes': 'freinage',
            'tires': 'pneus',
            'tyres': 'pneus'
        };

        // Parcours des sections (Frame, Drivetrain, Brakes...)
        Object.keys(rawComponents).forEach(section => {
            const items = rawComponents[section];
            // Parfois c'est un tableau, parfois un objet
            if (typeof items === 'object') {
                Object.keys(items).forEach(key => {
                    // key est le type de pièce (ex: "chain")
                    const partName = items[key]; // La valeur (ex: "Shimano 105")
                    
                    // On essaie de deviner la catégorie
                    let myCat = 'autre';
                    for (const [detect, cat] of Object.entries(categoryMap)) {
                        if (key.toLowerCase().includes(detect)) myCat = cat;
                    }

                    // On ignore les cadres, fourches, etc pour l'instant (focus pièces d'usure)
                    if (myCat !== 'autre' && partName) {
                         cleanParts.push({
                            name: Array.isArray(partName) ? partName.join(' ') : partName,
                            category: myCat,
                            life_target_km: getLifeKm(myCat) // Fonction helper
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

// Durée de vie par défaut selon la catégorie
function getLifeKm(cat) {
    if (cat === 'transmission') return 5000; // Chaîne
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000; // Plaquettes/Disques
    return 2000;
}