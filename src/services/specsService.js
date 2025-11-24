// src/services/specsService.js

// Mapping entre les catégories 99spokes (anglais) et les tiennes (français/code)
const CATEGORY_MAPPING = {
    'Chain': 'transmission',
    'Cassette': 'transmission',
    'Shifters': 'transmission',
    'Rear Derailleur': 'transmission',
    'Front Derailleur': 'transmission',
    'Crankset': 'transmission',
    'Bottom Bracket': 'transmission',
    'Brakes': 'freinage',
    'Brake Levers': 'freinage',
    'Rotors': 'freinage',
    'Tires': 'pneus',
    'Tyres': 'pneus',
    'Wheels': 'autre', // Ou créer une catégorie 'roues'
    'Handlebar': 'peripheriques',
    'Stem': 'peripheriques',
    'Saddle': 'peripheriques',
    'Seatpost': 'peripheriques'
};

export const specsService = {
    /**
     * Simule la recherche 99spokes (En attendant l'API ou un Proxy)
     */
    async fetchSpecs(brand, year, model) {
        console.log(`Recherche specs pour : ${brand} ${model} (${year})`);
        
        // ICI : C'est là qu'on mettra le vrai appel fetch quand tu auras l'API Key
        // ou qu'on passera par une Edge Function pour contourner le CORS/Scraping.
        
        // Pour ce soir, on SIMULE un succès après 1 seconde pour tester l'UI
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { name: "Shimano 105 CN-M7100", category: "transmission", life_target_km: 5000 },
                    { name: "Conti Grand Sport Race SL, 28-622", category: "pneus", life_target_km: 4000 },
                    { name: "Shimano 105 CS-R7000, 11-32T", category: "transmission", life_target_km: 10000 },
                    { name: "Shimano 105 BR-R7070, Hydr. Disc", category: "freinage", life_target_km: 15000 }
                ]);
            }, 1000);
        });
    },

    /**
     * Tente de construire l'URL JSON (Expérimental - Risque de casser avec le BUILD_ID)
     */
    construct99SpokesUrl(brand, year, model) {
        // ATTENTION : Ce Build ID change à chaque déploiement de 99spokes
        const BUILD_ID = "UgXUkizGHhIOJ2-T3z-6Y"; 
        const safeBrand = brand.toLowerCase().replace(/\s+/g, '-');
        const safeModel = model.toLowerCase().replace(/\s+/g, '-');
        
        return `https://99spokes.com/_next/data/${BUILD_ID}/fr-FR/bikes/${safeBrand}/${year}/${safeModel}.json?makerId=${safeBrand}&year=${year}&modelId=${safeModel}`;
    }
};