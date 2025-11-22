import React, { useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import '../Bike/BikeForm.css'; 

// AJOUT : On accepte 'initialData' dans les props
const LibraryForm = ({ onClose, onSave, initialData }) => {
    
    // MODIFICATION : On initialise le state avec les données existantes si elles sont là
    const [formData, setFormData] = useState({
        category: initialData?.category || 'chain',
        brand: initialData?.brand || '',
        model: initialData?.model || '',
        lifespan_km: initialData?.lifespan_km || 2000
    });
    const [isSaving, setIsSaving] = useState(false);

    const categories = [
        { id: 'chain', label: 'Chaîne' },
        { id: 'cassette', label: 'Cassette' },
        { id: 'tire', label: 'Pneu' },
        { id: 'brake_pads', label: 'Plaquettes' },
        { id: 'other', label: 'Autre' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.brand || !formData.model) return;

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Erreur ajout bibliothèque", error);
            alert("Erreur lors de l'ajout.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bike-form-container">
            <header className="form-header">
                {/* TITRE DYNAMIQUE */}
                <h2>{initialData ? 'Modifier le modèle' : 'Nouveau Modèle'}</h2>
                <button onClick={onClose} className="close-btn">
                    <FaTimes />
                </button>
            </header>

            <form onSubmit={handleSubmit} className="bike-form">
                
                <section className="form-section">
                    <h3>Identification du composant</h3>
                    
                    <div className="input-group">
                        <label>Marque *</label>
                        <input 
                            name="brand" 
                            type="text" 
                            value={formData.brand} 
                            onChange={handleChange} 
                            placeholder="Ex: Shimano, Continental..." 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label>Modèle *</label>
                        <input 
                            name="model" 
                            type="text" 
                            value={formData.model} 
                            onChange={handleChange} 
                            placeholder="Ex: Ultegra R8000 11-30" 
                            required 
                        />
                    </div>
                </section>

                <section className="form-section advanced-section">
                    <h3>Caractéristiques techniques</h3>
                    
                    <div className="input-group full-width">
                        <label>Catégorie</label>
                        <div className="type-chips">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`chip ${formData.category === cat.id ? 'active' : ''}`}
                                    onClick={() => setFormData({...formData, category: cat.id})}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Durée de vie estimée (km)</label>
                        <input 
                            name="lifespan_km" 
                            type="number" 
                            value={formData.lifespan_km} 
                            onChange={handleChange} 
                            placeholder="Ex: 5000" 
                        />
                        <p style={{fontSize: '0.8rem', color: '#888', marginTop: '5px'}}>
                            Cette valeur servira de base pour calculer l'usure par défaut.
                        </p>
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Annuler
                    </button>
                    <button type="submit" className="save-btn" disabled={isSaving}>
                        {isSaving ? 'Sauvegarder' : <><FaSave /> {initialData ? 'Mettre à jour' : 'Ajouter'}</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LibraryForm;