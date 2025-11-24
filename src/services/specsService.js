// src/services/specsService.js

export const specsService = {
    /**
     * Appelle notre Proxy Vercel qui va scraper 99spokes dynamiquement
     */
    async fetchSpecs(brand, year, model) {
        console.log(`🔍 Recherche 99spokes via Proxy : ${brand} ${model} (${year})`);
        
        try {
            // Appel à notre fonction serveur Vercel (créée dans /api/99spokes.js)
            const response = await fetch(`/api/99spokes?brand=${encodeURIComponent(brand)}&year=${encodeURIComponent(year)}&model=${encodeURIComponent(model)}`);
            
            if (!response.ok) {
                console.warn("Erreur API Proxy:", response.statusText);
                return [];
            }

            const parts = await response.json();
            console.log("✅ Pièces trouvées :", parts.length);
            return parts;

        } catch (e) {
            console.error("Erreur lors de la récupération des specs :", e);
            return [];
        }
    }
};