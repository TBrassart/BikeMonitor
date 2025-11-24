import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bikeService } from '../../services/api';
import { FaSave, FaTimes, FaBicycle, FaCamera } from 'react-icons/fa';
import './BikeForm.css';

function BikeForm() {
    const navigate = useNavigate();
    const { bikeId } = useParams();
    const isEditMode = Boolean(bikeId);
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        model: '',
        model_year: new Date().getFullYear(),
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
                    model_year: data.model_year || '',
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
            // --- NETTOYAGE DES DONNÉES (Pour éviter l'erreur 22P02) ---
            // On convertit les chaînes vides "" en null pour les champs numériques
            const cleanedData = {
                ...formData,
                model_year: formData.model_year ? parseInt(formData.model_year) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                // total_km est généralement géré à part ou forcé à 0
                total_km: formData.total_km ? parseInt(formData.total_km) : 0
            };

            let idToUse = bikeId;

            // 1. Création ou Mise à jour
            if (isEditMode) {
                await bikeService.update(bikeId, cleanedData);
            } else {
                const newBike = await bikeService.add(cleanedData);
                // Supabase renvoie un tableau, on prend le premier élément
                if (newBike && newBike[0]) {
                    idToUse = newBike[0].id;
                }
            }

            // 2. Upload de la photo
            if (photoFile && idToUse) {
                const url = await bikeService.uploadPhoto(photoFile);
                await bikeService.update(idToUse, { photo_url: url });
            }

            navigate('/app/garage');
        } catch (error) {
            console.error("Erreur enregistrement:", error);
            alert("Erreur lors de l'enregistrement. Vérifiez que les champs numériques sont corrects.");
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

                {/* ZONE PHOTO */}
                <div className="photo-upload-section" onClick={() => fileInputRef.current.click()}>
                    {preview ? (
                        <img src={preview} alt="Aperçu" className="photo-preview" />
                    ) : (
                        <div className="photo-placeholder">
                            <FaCamera className="camera-icon" />
                            <span>Ajouter une photo</span>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        style={{display:'none'}} 
                        accept="image/*"
                    />
                </div>

                <div className="form-grid">
                    <div className="form-group full-width">
                        <label>Nom du vélo</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Marque</label>
                        <input type="text" name="brand" value={formData.brand} onChange={handleChange} />
                    </div>
                    
                    <div className="form-group">
                        <label>Modèle commercial</label>
                        <input 
                            type="text" 
                            name="model" 
                            value={formData.model} 
                            onChange={handleChange} 
                            placeholder="Ex: Attain GTC Race" 
                        />
                        <small style={{color:'var(--text-secondary)', fontSize:'0.7rem'}}>Sert à trouver les pièces d'origine</small>
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

                    {/* CHAMP READ-ONLY POUR LE KM */}
                    <div className="form-group">
                        <label>Kilométrage (Calculé)</label>
                        <input 
                            type="number" 
                            name="total_km" 
                            value={formData.total_km} 
                            readOnly 
                            className="input-readonly"
                            title="Le kilométrage est mis à jour via Strava ou l'historique"
                        />
                    </div>

                    <div className="form-group">
                        <label>Poids (kg)</label>
                        <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
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