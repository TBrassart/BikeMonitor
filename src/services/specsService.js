export const specsService = {
    async fetchSpecs(brand, year, model) {
        console.log(`🔍 Recherche : ${brand} ${model} (${year})`);
        
        try {
            const response = await fetch(`/api/99spokes?brand=${encodeURIComponent(brand)}&year=${encodeURIComponent(year)}&model=${encodeURIComponent(model)}`);
            
            const data = await response.json();

            // --- DEBUG CRITIQUE ---
            if (data.debugUrl) {
                console.log("%c🔗 URL CIBLÉE PAR LE SERVEUR :", "background: #222; color: #bada55; font-size:12px");
                console.log(data.debugUrl);
                console.log("Note: Si tu cliques dessus et que tu vois un JSON, c'est que ça marche.");
                console.log("Note: Si tu vois 'Not Found', l'URL est mauvaise.");
            }
            // ---------------------

            if (!response.ok) {
                console.warn("Erreur API:", data.error);
                return [];
            }

            // L'API renvoie maintenant un objet { parts: [], debugUrl: ... }
            // On doit récupérer .parts
            return data.parts || [];

        } catch (e) {
            console.error("Erreur fetchSpecs:", e);
            return [];
        }
    }
};