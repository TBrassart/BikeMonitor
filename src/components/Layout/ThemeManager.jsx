import React, { useEffect, useState } from 'react';
import { shopService } from '../../services/api';
import ThemeEffects from './ThemeEffects'; // <--- IMPORT

const ThemeManager = ({ children }) => {
    // Nouvel état pour stocker le nom de l'effet (ex: 'matrix')
    const [currentEffect, setCurrentEffect] = useState(null);

    useEffect(() => {
        syncThemeFromDB();

        const handleThemeChange = (e) => {
            if (e.detail) applyThemeData(e.detail);
            else syncThemeFromDB();
        };

        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const syncThemeFromDB = async () => {
        try {
            const inventory = await shopService.getInventory();
            const equippedSkin = inventory?.find(i => i.shop_items.type === 'skin' && i.is_equipped);

            if (equippedSkin?.shop_items?.asset_data) {
                applyThemeData(equippedSkin.shop_items.asset_data);
            } else {
                resetTheme();
            }
        } catch (e) { 
            console.error(e);
            resetTheme();
        }
    };

    const applyThemeData = (data) => {
        updateCssVariables(data);
        // On applique l'effet s'il existe dans le JSON
        setCurrentEffect(data.effect || null);
    };

    const updateCssVariables = (data) => {
        const root = document.documentElement;
        if (!data) return;

        // 1. Calcul de la couleur du texte selon le fond (Contraste)
        // Si le fond est clair, on met le texte en noir, sinon en blanc
        const textColor = data.bg && isLightColor(data.bg) ? '#111827' : '#f8fafc';
        const textSecondary = data.bg && isLightColor(data.bg) ? '#4b5563' : '#94a3b8';
        
        root.style.setProperty('--text-primary', textColor);
        root.style.setProperty('--text-secondary', textSecondary)

        if (data.primary) {
            root.style.setProperty('--neon-blue', data.primary);
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
        root.removeAttribute('style');
        document.body.style.backgroundColor = '';
        setCurrentEffect(null); // Reset effet
    };

    const adjustColorBrightness = (hex, percent) => {
        if(!hex) return '#000';
        let num = parseInt(hex.replace("#",""), 16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    };

    // Détecte si une couleur est claire (pour mettre le texte en noir)
    const isLightColor = (hex) => {
        const c = hex.substring(1);      // Strip #
        const rgb = parseInt(c, 16);   // Convert rrggbb to decimal
        const r = (rgb >> 16) & 0xff;  // Extract red
        const g = (rgb >>  8) & 0xff;  // Extract green
        const b = (rgb >>  0) & 0xff;  // Extract blue

        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // SMPTE C-Y (YIQ) formula
        return luma > 128; // Si > 128, c'est clair
    };

    return (
        <>
            {/* LE CANVAS DE FOND EST ICI */}
            <ThemeEffects effect={currentEffect} />
            
            {/* L'APPLICATION PAR DESSUS */}
            <div style={{position: 'relative', zIndex: 1}}>
                {children}
            </div>
        </>
    );
};

export default ThemeManager;