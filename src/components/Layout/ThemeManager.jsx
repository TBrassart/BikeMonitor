import React, { useEffect } from 'react';
import { shopService } from '../../services/api';

const ThemeManager = ({ children }) => {
    useEffect(() => {
        // Lancement immédiat
        syncThemeFromDB();

        const handleThemeChange = (e) => {
            if (e.detail) updateCssVariables(e.detail);
            else syncThemeFromDB();
        };

        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const syncThemeFromDB = async () => {
        try {
            // Récupération de l'inventaire
            const inventory = await shopService.getInventory();
            
            // Recherche du skin équipé
            const equippedSkin = inventory?.find(i => i.shop_items.type === 'skin' && i.is_equipped);

            if (equippedSkin && equippedSkin.shop_items.asset_data) {
                console.log("🎨 Thème chargé depuis BDD :", equippedSkin.shop_items.name);
                updateCssVariables(equippedSkin.shop_items.asset_data);
            } else {
                console.log("🎨 Aucun thème équipé, retour défaut.");
                resetTheme();
            }
        } catch (e) { console.error("Erreur chargement thème", e); }
    };

    const updateCssVariables = (data) => {
        const root = document.documentElement;
        if (data.primary) {
            root.style.setProperty('--neon-blue', data.primary);
            root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, -20)} 100%)`);
        }
        if (data.secondary) {
            root.style.setProperty('--neon-purple', data.secondary);
            root.style.setProperty('--neon-green', data.secondary);
        }
        if (data.bg) {
            root.style.setProperty('--bg-deep', data.bg);
            root.style.setProperty('--bg-card', adjustColorBrightness(data.bg, 10)); 
            root.style.setProperty('--bg-sidebar', adjustColorBrightness(data.bg, 5));
            // Force l'application sur le body
            document.body.style.backgroundColor = data.bg;
        }
    };

    const resetTheme = () => {
        const root = document.documentElement;
        root.removeAttribute('style');
        document.body.style.backgroundColor = '';
    };

    const adjustColorBrightness = (hex, percent) => {
        if(!hex) return '#000';
        let num = parseInt(hex.replace("#",""), 16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    };

    return <>{children}</>;
};

export default ThemeManager;