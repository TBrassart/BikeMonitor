import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Ajout de useParams
import { bikeService } from '../../services/api';
import { FaSave, FaTimes, FaBicycle } from 'react-icons/fa';
import './BikeForm.css';

function BikeForm() {
    const navigate = useNavigate();
    const { bikeId } = useParams(); // Récupère l'ID si on est en mode édition
    const isEditMode = Boolean(bikeId);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        model_year: new Date().getFullYear(),
        type: 'Route',
        total_km: 0,
        weight: '',
        size: ''
    });

    // CHARGEMENT DES DONNÉES (Si édition)
    useEffect(() => {
        if (isEditMode) {
            loadBikeData();
        }
    }, [bikeId]);

    const loadBikeData = async () => {
        try {
            setLoading(true);
            const data = await bikeService.getById(bikeId);
            if (data) {
                setFormData({
                    name: data.name || '',
                    brand: data.brand || '',
                    model_year: data.model_year || '',
                    type: data.type || 'Route',
                    total_km: data.total_km || 0,
                    weight: data.weight || '',
                    size: data.size || ''
                });
            }
        } catch (e) {
            console.error("Erreur chargement vélo:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await bikeService.update(bikeId, formData);
            } else {
                await bikeService.add(formData);
            }
            navigate('/app/garage'); // Retour au garage après succès
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bike-form-page">
            <form className="bike-form glass-panel" onSubmit={handleSubmit}>
                <div className="form-header">
                    <h3>{isEditMode ? 'Modifier le vélo' : 'Ajouter un vélo'}</h3>
                    <FaBicycle className="header-icon" />
                </div>

                <div className="form-grid">
                    <div className="form-group full-width">
                        <label>Nom du vélo (Surnom)</label>
                        <input 
                            type="text" name="name" 
                            value={formData.name} onChange={handleChange} 
                            placeholder="Ex: Le Grimpeur" required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Marque</label>
                        <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Giant, Trek..." />
                    </div>

                    <div className="form-group">
                        <label>Année</label>
                        <input type="number" name="model_year" value={formData.model_year} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <select name="type" value={formData.type} onChange={handleChange}>
                            <option value="Route">Route</option>
                            <option value="VTT">VTT</option>
                            <option value="Gravel">Gravel</option>
                            <option value="Ville">Ville</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Kilométrage initial</label>
                        <input type="number" name="total_km" value={formData.total_km} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label>Poids (kg)</label>
                        <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-actions">
                    {/* Bouton Annuler qui fonctionne (retour en arrière) */}
                    <button type="button" onClick={() => navigate(-1)} className="secondary-btn">
                        <FaTimes /> Annuler
                    </button>
                    <button type="submit" className="primary-btn" disabled={loading}>
                        <FaSave /> {loading ? '...' : 'Enregistrer'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default BikeForm;