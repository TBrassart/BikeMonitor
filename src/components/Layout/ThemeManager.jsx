import React, { useEffect } from 'react';
import { shopService } from '../../services/api';

const ThemeManager = ({ children }) => {
    
    useEffect(() => {
        // 1. Chargement au démarrage : ON INTERROGE LA BDD
        syncThemeFromDB();

        // 2. Écouteur pour changement immédiat (Preview instantanée lors du clic)
        const handleThemeChange = (e) => {
            if (e.detail) {
                updateCssVariables(e.detail);
            } else {
                syncThemeFromDB();
            }
        };

        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const syncThemeFromDB = async () => {
        try {
            // On récupère l'inventaire complet depuis le serveur
            const inventory = await shopService.getInventory();
            
            if (!inventory) return;

            // On cherche l'item de type 'skin' qui est équipé
            const equippedSkin = inventory.find(i => i.shop_items.type === 'skin' && i.is_equipped);

            if (equippedSkin && equippedSkin.shop_items.asset_data) {
                // Si trouvé en base, on l'applique
                updateCssVariables(equippedSkin.shop_items.asset_data);
            } else {
                // Sinon, on remet le thème par défaut
                resetTheme();
            }
        } catch (e) {
            console.error("Erreur synchro thème:", e);
            // En cas d'erreur (offline), on ne touche à rien pour ne pas casser l'affichage
        }
    };

    const updateCssVariables = (data) => {
        const root = document.documentElement;
        if (!data) return;

        // Application des variables CSS
        if (data.primary) {
            root.style.setProperty('--neon-blue', data.primary);
            // On recalcule les gradients basés sur la nouvelle couleur
            root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, -20)} 100%)`);
            root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, 20)} 100%)`);
        }

        if (data.secondary) {
            root.style.setProperty('--neon-purple', data.secondary);
            root.style.setProperty('--neon-green', data.secondary);
        }

        if (data.bg) {
            root.style.setProperty('--bg-deep', data.bg);
            root.style.setProperty('--bg-card', adjustColorBrightness(data.bg, 10)); 
            root.style.setProperty('--bg-sidebar', adjustColorBrightness(data.bg, 5));
            document.body.style.backgroundColor = data.bg;
        }
    };

    const resetTheme = () => {
        const root = document.documentElement;
        root.removeAttribute('style'); // Nettoie tout les styles inline
        document.body.style.backgroundColor = ''; 
    };

    const adjustColorBrightness = (hex, percent) => {
        if (!hex) return '#000000';
        let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    };

    return <>{children}</>;
};

export default ThemeManager;