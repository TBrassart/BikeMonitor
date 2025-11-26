import React, { useEffect } from 'react';
import { shopService } from '../../services/api';

const ThemeManager = ({ children }) => {
    
    useEffect(() => {
        // 1. Chargement initial (au démarrage)
        applyEquippedTheme();
        
        // 2. Écouteur d'événement (Quand on clique sur "Équiper")
        const handleThemeChange = (e) => {
            console.log("🎨 ThemeManager: Demande de changement reçue", e.detail);
            if (e.detail) {
                // Si on reçoit les couleurs directement, on applique
                updateCssVariables(e.detail);
            } else {
                // Sinon on recharge depuis la base
                applyEquippedTheme();
            }
        };

        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const applyEquippedTheme = async () => {
        try {
            const inventory = await shopService.getInventory();
            if (!inventory) return;

            // On cherche l'item 'skin' équipé
            const equippedSkin = inventory.find(i => i.shop_items.type === 'skin' && i.is_equipped);

            if (equippedSkin && equippedSkin.shop_items.asset_data) {
                console.log("🎨 ThemeManager: Thème trouvé en base", equippedSkin.shop_items.name);
                updateCssVariables(equippedSkin.shop_items.asset_data);
            } else {
                console.log("🎨 ThemeManager: Aucun thème, reset.");
                resetTheme();
            }
        } catch (e) {
            console.error("Erreur ThemeManager:", e);
            resetTheme();
        }
    };

    const updateCssVariables = (data) => {
        const root = document.documentElement;
        if (!data) return;

        // 1. Couleur Principale (Néon)
        if (data.primary) {
            root.style.setProperty('--neon-blue', data.primary);
            root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, -20)} 100%)`);
            root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, 20)} 100%)`);
        }

        // 2. Couleur Secondaire
        if (data.secondary) {
            root.style.setProperty('--neon-purple', data.secondary);
            root.style.setProperty('--neon-green', data.secondary);
        }

        // 3. Arrière-plan (Dark Mode)
        if (data.bg) {
            root.style.setProperty('--bg-deep', data.bg);
            root.style.setProperty('--bg-card', adjustColorBrightness(data.bg, 10)); 
            root.style.setProperty('--bg-sidebar', adjustColorBrightness(data.bg, 5));
            // Force le background du body immédiatement
            document.body.style.backgroundColor = data.bg;
        }
    };

    const resetTheme = () => {
        const root = document.documentElement;
        root.removeAttribute('style'); // Nettoie tout les styles inline sur :root
        document.body.style.backgroundColor = ''; // Reset body
    };

    // Utilitaire couleur (Hex -> plus clair/foncé)
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
