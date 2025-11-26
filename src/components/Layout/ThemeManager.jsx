import React, { useEffect } from 'react';
import { shopService } from '../../services/api';

const ThemeManager = ({ children }) => {
    
    useEffect(() => {
        applyEquippedTheme();
        
        // On écoute un événement custom pour mettre à jour sans recharger la page
        // (Utile quand on clique sur "Équiper" dans la boutique)
        window.addEventListener('themeChange', applyEquippedTheme);
        
        return () => {
            window.removeEventListener('themeChange', applyEquippedTheme);
        };
    }, []);

    const applyEquippedTheme = async () => {
        try {
            // 1. On récupère l'inventaire
            const inventory = await shopService.getInventory();
            if (!inventory) return;

            // 2. On cherche le skin équipé
            const equippedSkin = inventory.find(i => i.shop_items.type === 'skin' && i.is_equipped);

            // 3. Application ou Reset
            if (equippedSkin && equippedSkin.shop_items.asset_data) {
                updateCssVariables(equippedSkin.shop_items.asset_data);
            } else {
                resetTheme();
            }
        } catch (e) {
            console.error("Erreur chargement thème", e);
            resetTheme();
        }
    };

    const updateCssVariables = (data) => {
        const root = document.documentElement;

        // --- COULEUR PRINCIPALE (Néon) ---
        if (data.primary) {
            // Remplace le bleu par la couleur du thème
            root.style.setProperty('--neon-blue', data.primary);
            // On force aussi le gradient principal
            root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, -20)} 100%)`);
            root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${data.primary} 0%, ${adjustColorBrightness(data.primary, 20)} 100%)`);
        }

        // --- COULEUR SECONDAIRE ---
        if (data.secondary) {
            root.style.setProperty('--neon-purple', data.secondary);
            root.style.setProperty('--neon-green', data.secondary); // On harmonise
        }

        // --- ARRIÈRE-PLAN (Dark Mode Custom) ---
        if (data.bg) {
            root.style.setProperty('--bg-deep', data.bg);
            // On génère des variantes légèrement plus claires pour les cartes/sidebar
            root.style.setProperty('--bg-card', adjustColorBrightness(data.bg, 10)); 
            root.style.setProperty('--bg-sidebar', adjustColorBrightness(data.bg, 5));
        }
    };

    const resetTheme = () => {
        const root = document.documentElement;
        // On retire les styles inline pour revenir aux valeurs de index.css
        root.style.removeProperty('--neon-blue');
        root.style.removeProperty('--neon-purple');
        root.style.removeProperty('--neon-green');
        root.style.removeProperty('--gradient-primary');
        root.style.removeProperty('--gradient-secondary');
        root.style.removeProperty('--bg-deep');
        root.style.removeProperty('--bg-card');
        root.style.removeProperty('--bg-sidebar');
    };

    // Petit utilitaire pour éclaircir/assombrir une couleur Hex (pour générer les variantes)
    const adjustColorBrightness = (hex, percent) => {
        let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    };

    // Ce composant ne rend rien visuellement, il enveloppe juste l'app
    return <>{children}</>;
};

export default ThemeManager;
