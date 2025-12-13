import fs from 'fs';

// --- CONFIGURATION ---
const MY_TOKEN = "Bearer a3d09d44-c3cd-4d17-b4f8-0fb1e85b2c37"; // ⚠️ Remets ta clé ici
const BASE_URL = "https://api.probikegarage.com/components-catalog?q&filter=unique&page=";
const TOTAL_PAGES = 197;
const OUTPUT_FILE = "import_compatible_sql.csv";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const toCsvField = (field) => {
    if (!field) return '';
    const stringField = String(field);
    return `"${stringField.replace(/"/g, '""')}"`;
};

async function run() {
    if (MY_TOKEN.includes("TA_CLE")) {
        console.error("❌ ERREUR : Colle ton token ligne 4 !");
        return;
    }

    console.log("🚀 Démarrage... Génération compatible avec ta table SQL 'component_library'");
    
    // 1. En-têtes EXACTS de ta table PostgreSQL
    // On ignore 'id' (généré auto) et 'created_at' (auto)
    let csvContent = "brand,model,category,lifespan_km\n";
    
    let totalItems = 0;

    for (let page = 1; page <= TOTAL_PAGES; page++) {
        try {
            console.log(`📥 Page ${page}/${TOTAL_PAGES}...`);
            
            const response = await fetch(`${BASE_URL}${page}`, {
                method: 'GET',
                headers: {
                    'Authorization': MY_TOKEN,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const items = data.definitions || [];

            items.forEach(item => {
                // Calcul KM
                let lifeKm = ""; 
                if (item.service_intervals?.length > 0) {
                    const dist = item.service_intervals.find(i => i.type === 'distance');
                    if (dist?.value) lifeKm = Math.round(dist.value / 1000);
                }

                // Si pas de durée de vie définie, on met ta valeur par défaut (2000) ou on laisse vide pour que SQL mette le DEFAULT
                const finalLife = lifeKm || "";

                // Construction de la ligne
                const line = [
                    toCsvField(item.brand),
                    toCsvField(item.name), // ASTUCE : On met le NOM complet dans la colonne 'model' pour la recherche
                    toCsvField(item.type), // Deviendra 'category'
                    finalLife
                ].join(",");

                csvContent += line + "\n";
                totalItems++;
            });
            
            await sleep(100); // Rapide

        } catch (error) {
            console.error(`❌ Erreur page ${page}:`, error.message);
        }
    }

    console.log(`✅ Terminé ! ${totalItems} lignes prêtes.`);
    fs.writeFileSync(OUTPUT_FILE, csvContent);
    console.log(`💾 Fichier prêt à importer : ${OUTPUT_FILE}`);
}

run();