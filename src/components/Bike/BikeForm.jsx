import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bikeService } from '../../services/api';
import { FaSave, FaTimes, FaCamera, FaCalendarAlt } from 'react-icons/fa';
import './BikeForm.css';

function BikeForm() {
    const navigate = useNavigate();
    const { bikeId } = useParams();
    const isEditMode = Boolean(bikeId);
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);

    // Initialisation avec des valeurs par défaut sûres
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        model: '',
        model_year: new Date().getFullYear(), // Année par défaut
        type: 'Route',
        total_km: 0,
        weight: '',
        size: ''
    });

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
                    model: data.model || '',
                    // CORRECTION ICI : On s'assure que l'année est bien prise
                    model_year: data.model_year || new Date().getFullYear(),
                    type: data.type || 'Route',
                    total_km: data.total_km || 0,
                    weight: data.weight || '',
                    size: data.size || ''
                });
                if (data.photo_url) setPreview(data.photo_url);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Nettoyage des types pour PostgreSQL
            const cleanedData = {
                ...formData,
                // On force l'année en entier (int)
                model_year: formData.model_year ? parseInt(formData.model_year, 10) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                // On n'envoie pas total_km si c'est une mise à jour pour ne pas écraser le calcul Strava
                // Sauf si c'est une création
                total_km: isEditMode ? undefined : (formData.total_km ? parseInt(formData.total_km) : 0)
            };

            // Si c'est une update, on retire total_km de l'objet pour ne pas le toucher
            if (isEditMode) delete cleanedData.total_km;

            let idToUse = bikeId;

            if (isEditMode) {
                await bikeService.update(bikeId, cleanedData);
            } else {
                const newBike = await bikeService.add(cleanedData);
                if (newBike && newBike[0]) idToUse = newBike[0].id;
            }

            if (photoFile && idToUse) {
                const url = await bikeService.uploadPhoto(photoFile);
                await bikeService.update(idToUse, { photo_url: url });
            }

            navigate('/app/garage');
        } catch (error) {
            console.error("Erreur:", error);
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
                </div>

                {/* PHOTO */}
                <div className="photo-upload-section" onClick={() => fileInputRef.current.click()}>
                    {preview ? (
                        <img src={preview} alt="Aperçu" className="photo-preview" />
                    ) : (
                        <div className="photo-placeholder">
                            <FaCamera className="camera-icon" />
                            <span>Photo du vélo</span>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display:'none'}} accept="image/*" />
                </div>

                <div className="form-grid">
                    <div className="form-group full-width">
                        <label>Surnom du vélo</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: La Fusée" />
                    </div>

                    <div className="form-group">
                        <label>Marque</label>
                        <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Ex: Polygon" />
                    </div>

                    <div className="form-group">
                        <label>Modèle commercial</label>
                        <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="Ex: Helios A8" />
                    </div>

                    {/* CHAMP ANNÉE CORRIGÉ */}
                    <div className="form-group">
                        <label>Année (Millésime)</label>
                        <div className="input-icon-wrapper">
                            <input 
                                type="number" 
                                name="model_year" 
                                value={formData.model_year} 
                                onChange={handleChange} 
                                min="1990" 
                                max="2030"
                                placeholder="2023"
                            />
                        </div>
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
                        <label>Poids (kg)</label>
                        <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
                    </div>
                    
                    {/* Le kilométrage est affiché en lecture seule en mode édition */}
                    <div className="form-group full-width">
                        <label>Kilométrage Total</label>
                        <input 
                            type="number" 
                            value={formData.total_km} 
                            readOnly={isEditMode}
                            onChange={isEditMode ? undefined : handleChange}
                            name="total_km"
                            className={isEditMode ? "input-readonly" : ""}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={() => navigate(-1)} className="secondary-btn cancel-btn">
                        <FaTimes /> Annuler
                    </button>
                    <button type="submit" className="primary-btn save-btn" disabled={loading}>
                        <FaSave /> {loading ? '...' : 'Enregistrer'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default BikeForm;