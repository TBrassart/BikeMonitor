import React, { useState, useEffect, useRef } from 'react';
import { FaSave, FaTimes, FaWeightHanging, FaRulerVertical, FaTag, FaCalendarDay, FaSignature, FaRoad, FaMountain, FaLeaf, FaCity, FaCamera } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import './BikeForm.css'; 

// Ajout de la prop 'initialData'
const BikeForm = ({ onClose, onSave, currentUser, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Route',
        owner: currentUser?.name || '',
        brand: '',
        model_year: '',
        size: '',
        weight: ''
    });
    
    const [photoFile, setPhotoFile] = useState(null);
    // Si on édite, on affiche la photo existante par défaut
    const [photoPreview, setPhotoPreview] = useState(null);
    
    const fileInputRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);

    // EFFET : Pré-remplissage si modification
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                type: initialData.type || 'Route',
                owner: initialData.owner || '',
                brand: initialData.brand || '',
                model_year: initialData.model_year || '',
                size: initialData.size || '',
                weight: initialData.weight || ''
            });
            if (initialData.photo_url) {
                setPhotoPreview(initialData.photo_url);
            }
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.type) return;

        setIsSaving(true);
        try {
            const cleanData = {
                ...formData,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                model_year: formData.model_year ? parseInt(formData.model_year) : null
            };
            
            // onSave renvoie le vélo mis à jour ou créé
            const savedBike = await onSave(cleanData);

            // Gestion de l'upload image (si nouvelle image sélectionnée)
            if (photoFile && savedBike?.id) {
                try {
                    const publicUrl = await bikeService.uploadBikePhoto(savedBike.id, photoFile);
                    // Petite mise à jour silencieuse de l'URL
                    await bikeService.updateBike(savedBike.id, { photo_url: publicUrl });
                } catch (uploadError) {
                    console.error("Erreur upload image", uploadError);
                }
            }

            onClose();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const bikeTypes = [
        { id: 'Route', label: 'Route', icon: <FaRoad /> },
        { id: 'VTT', label: 'VTT', icon: <FaMountain /> },
        { id: 'Gravel', label: 'Gravel', icon: <FaLeaf /> },
        { id: 'Ville', label: 'Ville', icon: <FaCity /> }
    ];

    return (
        <div className="bike-form-container">
            <header className="form-header">
                {/* Titre dynamique */}
                <h2>{initialData ? 'Modifier le vélo' : 'Nouveau Vélo'}</h2>
                <button onClick={onClose} className="close-btn"><FaTimes /></button>
            </header>

            <form onSubmit={handleSubmit} className="bike-form">
                
                {/* ZONE PHOTO */}
                <div className="photo-upload-section">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{display: 'none'}} 
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <div className="photo-dropzone" onClick={() => fileInputRef.current.click()}>
                        {photoPreview ? (
                            <img src={photoPreview} alt="Aperçu" />
                        ) : (
                            <>
                                <FaCamera className="photo-placeholder" />
                                <span className="photo-label">Ajouter photo</span>
                            </>
                        )}
                    </div>
                </div>

                {/* SECTION GAUCHE */}
                <section className="form-section">
                    <h3>Informations</h3>
                    <div className="input-group">
                        <label>Nom du vélo *</label>
                        <div className="input-wrapper">
                            <FaSignature className="input-icon" />
                            <input name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Type</label>
                        <div className="type-grid">
                            {bikeTypes.map(type => (
                                <div 
                                    key={type.id} 
                                    className={`type-card ${formData.type === type.id ? 'active' : ''}`}
                                    onClick={() => setFormData({...formData, type: type.id})}
                                >
                                    <span style={{fontSize: '1.5rem'}}>{type.icon}</span>
                                    <span>{type.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION DROITE */}
                <section className="form-section">
                    <h3>Caractéristiques</h3>
                    <div className="input-group">
                        <label>Marque</label>
                        <div className="input-wrapper">
                            <FaTag className="input-icon" />
                            <input name="brand" value={formData.brand} onChange={handleChange} placeholder="Specialized" />
                        </div>
                    </div>
                    <div className="details-grid">
                        <div className="input-group">
                            <label>Année</label>
                            <div className="input-wrapper">
                                <FaCalendarDay className="input-icon" />
                                <input name="model_year" type="number" value={formData.model_year} onChange={handleChange} placeholder="2024" />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Taille</label>
                            <div className="input-wrapper">
                                <FaRulerVertical className="input-icon" />
                                <input name="size" value={formData.size} onChange={handleChange} placeholder="56 / L" />
                            </div>
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Poids (kg)</label>
                        <div className="input-wrapper">
                            <FaWeightHanging className="input-icon" />
                            <input name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} placeholder="7.5" />
                        </div>
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" className="close-btn" style={{borderRadius: '8px', width: 'auto', padding: '0 20px', marginRight:'auto'}} onClick={onClose}>
                        Annuler
                    </button>
                    <button type="submit" className="save-btn" disabled={isSaving}>
                        {isSaving ? '...' : <><FaSave /> {initialData ? 'Mettre à jour' : 'Créer'}</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BikeForm;