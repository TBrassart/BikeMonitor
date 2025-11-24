export default async function handler(req, res) {
    const { brand, year, model } = req.query;

    // 1. Définition de la fonction de nettoyage (DANS le fichier serveur)
    const toSlug = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents
            .replace(/[^a-z0-9\s-]/g, "") // Enlève les caractères spéciaux
            .trim()
            .replace(/\s+/g, '-'); // Espaces -> tirets
    };

    if (!brand || !year || !model) {
        return res.status(400).json({ error: 'Paramètres manquants (brand, year, model)' });
    }

    try {
        // 2. Nettoyage des entrées
        const safeBrand = toSlug(brand);
        const safeModel = toSlug(model);

        console.log(`🔍 Recherche: ${safeBrand} ${safeModel} (${year})`);

        // 3. Récupérer le BUILD_ID sur la home page
        const homeResponse = await fetch('https://99spokes.com/fr-FR', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });
        
        if (!homeResponse.ok) throw new Error("Impossible d'accéder à 99spokes (Home)");
        
        const homeHtml = await homeResponse.text();
        const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
        
        if (!buildIdMatch || !buildIdMatch[1]) {
            console.error("❌ Build ID introuvable");
            return res.status(500).json({ error: 'Impossible de récupérer le BUILD_ID 99spokes' });
        }
        
        const buildId = buildIdMatch[1];
        
        // 4. Construction de l'URL JSON
        // Structure : /bikes/{marque}/{année}/{modèle}.json
        const apiUrl = `https://99spokes.com/_next/data/${buildId}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;

        console.log("👉 Fetching API:", apiUrl);

        // 5. Appel de l'API interne 99spokes
        const specsResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BikeMonitor/1.0)' }
        });

        if (specsResponse.status === 404) {
            console.warn("⚠️ Vélo introuvable (404)");
            return res.status(404).json({ error: `Vélo introuvable : ${brand} ${model} (${year}). Vérifiez la marque et le modèle.` });
        }

        if (!specsResponse.ok) {
            throw new Error(`Erreur 99spokes: ${specsResponse.status}`);
        }

        const data = await specsResponse.json();

        // 6. Parsing des composants
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

        // Parcours récursif ou itératif des sections
        Object.keys(rawComponents).forEach(section => {
            const items = rawComponents[section];
            if (typeof items === 'object' && items !== null) {
                Object.keys(items).forEach(key => {
                    const partName = items[key];
                    
                    // On cherche si la clé (ex: "chain") correspond à une catégorie connue
                    let myCat = 'autre';
                    for (const [detect, cat] of Object.entries(categoryMap)) {
                        if (key.toLowerCase().includes(detect.toLowerCase())) myCat = cat;
                    }

                    // Si on a trouvé une catégorie pertinente (pas "autre" ou null)
                    // Note: On peut ajuster ici pour inclure 'autre' si tu veux tout importer
                    if (myCat !== 'autre' && partName) {
                         // Parfois 99spokes met un tableau de strings
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

        console.log(`✅ Succès : ${cleanParts.length} pièces trouvées`);
        return res.status(200).json(cleanParts);

    } catch (error) {
        console.error("❌ Erreur Serveur:", error);
        return res.status(500).json({ error: error.message || 'Erreur interne lors du scraping' });
    }
}

function getLifeKm(cat) {
    if (cat === 'transmission') return 5000;
    if (cat === 'pneus') return 4000;
    if (cat === 'freinage') return 10000;
    return 2000;
}