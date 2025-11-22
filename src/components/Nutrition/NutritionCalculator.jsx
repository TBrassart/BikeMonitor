import React, { useState } from 'react';
import { FaCalculator, FaBolt, FaCheck, FaShoppingBasket } from 'react-icons/fa';
import './NutritionCalculator.css';

const NutritionCalculator = ({ inventory, onConsume }) => {
    const [duration, setDuration] = useState(2); // Heures
    const [intensity, setIntensity] = useState('medium'); // low, medium, high
    const [suggestion, setSuggestion] = useState(null);

    const calculateNeeds = () => {
        // 1. Définir le besoin en glucides par heure
        let carbsPerHour = 30;
        if (intensity === 'medium') carbsPerHour = 60;
        if (intensity === 'high') carbsPerHour = 90;

        const totalCarbsNeeded = carbsPerHour * duration;

        // 2. Algorithme glouton simple pour remplir le besoin avec le stock
        let currentCarbs = 0;
        let proposedItems = [];
        
        // On trie le stock par quantité de glucides (du plus riche au moins riche)
        // et on filtre ceux qui ont du stock > 0
        const availableStock = [...inventory]
            .filter(i => i.quantity > 0 && i.carbs > 0)
            .sort((a, b) => b.carbs - a.carbs);

        for (const item of availableStock) {
            let count = 0;
            // Tant qu'on a besoin de glucides ET qu'on a du stock de cet item
            while (currentCarbs < totalCarbsNeeded && count < item.quantity) {
                // On ajoute l'item si ça ne dépasse pas trop (ou si on est loin du compte)
                if ((currentCarbs + item.carbs) <= (totalCarbsNeeded + 10)) { 
                    currentCarbs += item.carbs;
                    count++;
                } else {
                    break;
                }
            }
            if (count > 0) {
                proposedItems.push({ ...item, count });
            }
        }

        setSuggestion({
            totalCarbs: totalCarbsNeeded,
            coveredCarbs: currentCarbs,
            items: proposedItems
        });
    };

    const handleValidate = () => {
        if (!suggestion) return;
        // Pour chaque item suggéré, on appelle la fonction de consommation parente
        suggestion.items.forEach(item => {
            onConsume(item.id, -item.count); // -item.count pour déduire
        });
        setSuggestion(null); // Reset
        alert("Bonne sortie ! Stock mis à jour.");
    };

    return (
        <div className="calculator-container">
            <div className="calculator-header">
                <h2><FaCalculator /> Planificateur Intelligent</h2>
            </div>

            <div className="calc-form">
                <div className="form-group">
                    <label>Durée (heures)</label>
                    <input 
                        type="number" 
                        value={duration} 
                        onChange={(e) => setDuration(parseFloat(e.target.value))} 
                        step="0.5" min="0.5" 
                    />
                </div>

                <div className="form-group">
                    <label>Intensité</label>
                    <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
                        <option value="low">Cool (30g/h)</option>
                        <option value="medium">Tempo (60g/h)</option>
                        <option value="high">Course (90g/h)</option>
                    </select>
                </div>

                <button className="calc-btn" onClick={calculateNeeds}>
                    <FaBolt /> Calculer
                </button>
            </div>

            {suggestion && (
                <div className="calc-result">
                    <p className="needs-summary">
                        Besoin estimé : <strong>{suggestion.totalCarbs}g</strong> de glucides. 
                        Proposition ({suggestion.coveredCarbs}g) :
                    </p>
                    
                    {suggestion.items.length > 0 ? (
                        <div className="suggestion-list">
                            {suggestion.items.map(item => (
                                <div key={item.id} className="suggestion-card">
                                    <strong>x{item.count}</strong> {item.name}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{color: '#aaa'}}>Stock insuffisant ou inadapté pour couvrir ce besoin !</p>
                    )}

                    {suggestion.items.length > 0 && (
                        <button className="consume-btn" onClick={handleValidate}>
                            <FaShoppingBasket /> Préparer le sac (Déduire du stock)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default NutritionCalculator;