import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import '../Bike/BikeForm.css'; // Réutilisation du CSS global des formulaires

const EquipmentForm = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: 'textile',
        type: 'Maillot',
        state: 'new'
    });

    // Remplir le formulaire si on édite
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if(formData.name) {
            onSave(formData); // onSave gérera l'update ou la création
            onClose();
        }
    };

    return (
        <div className="bike-form-container">
            <header className="form-header">
                <h2>{initialData ? 'Modifier' : 'Nouvel'} Équipement</h2>
                <button onClick={onClose} className="close-btn"><FaTimes /></button>
            </header>

            <form onSubmit={handleSubmit} className="bike-form">
                <section className="form-section">
                    <h3>Détails</h3>
                    
                    <div className="input-group">
                        <label>Nom de l'équipement *</label>
                        <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Ex: Maillot Club 2025" required />
                    </div>

                    <div className="input-group">
                        <label>Marque</label>
                        <input name="brand" type="text" value={formData.brand} onChange={handleChange} placeholder="Ex: Castelli, Garmin..." />
                    </div>

                    <div className="input-group">
                        <label>Catégorie</label>
                        <div className="type-chips">
                            <button type="button" className={`chip ${formData.category === 'textile' ? 'active' : ''}`} onClick={() => setFormData({...formData, category: 'textile'})}>Textile</button>
                            <button type="button" className={`chip ${formData.category === 'tech' ? 'active' : ''}`} onClick={() => setFormData({...formData, category: 'tech'})}>Tech</button>
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h3>État</h3>
                    <div className="input-group">
                        <label>État actuel</label>
                        <select name="state" value={formData.state} onChange={handleChange}>
                            <option value="new">Neuf</option>
                            <option value="good">Bon état</option>
                            <option value="worn">Usé (Entrainement)</option>
                        </select>
                    </div>
                </section>

            <div className="form-actions">
                <button type="submit" className="save-btn">
                    <FaSave /> {initialData ? 'Mettre à jour' : 'Ajouter'}
                </button>
            </div>
        </form>
    </div>
    );
};
export default EquipmentForm;