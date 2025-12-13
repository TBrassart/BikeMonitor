import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/api.js'; // Ou votre service API
import { FaSave, FaTimes } from 'react-icons/fa';

const LibraryForm = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        model: '', // Optionnel si name contient tout
        category: 'chain',
        lifespan_km: 5000
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                brand: initialData.brand || '',
                model: initialData.model || '',
                category: initialData.category || 'chain',
                lifespan_km: initialData.lifespan_km || 5000
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Logique Supabase directe ou via api.js
            const payload = {
                name: formData.name,
                brand: formData.brand,
                model: formData.model,
                category: formData.category,
                lifespan_km: parseInt(formData.lifespan_km)
            };

            let error;
            if (initialData?.id) {
                // UPDATE
                const res = await supabase.from('component_library').update(payload).eq('id', initialData.id);
                error = res.error;
            } else {
                // INSERT
                const res = await supabase.from('component_library').insert([payload]);
                error = res.error;
            }

            if (error) throw error;
            onSave();
            
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{padding:'20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3 style={{margin:0}}>{initialData ? 'Modifier' : 'Nouvelle référence'}</h3>
                <button type="button" onClick={onClose} style={{background:'none', border:'none', color:'white', fontSize:'1.2rem', cursor:'pointer'}}>
                    <FaTimes />
                </button>
            </div>

            <div className="form-group">
                <label>Nom complet (pour la recherche)</label>
                <input 
                    type="text" name="name" 
                    value={formData.name} onChange={handleChange} 
                    required placeholder="Ex: Chaîne Shimano Ultegra 11v"
                    style={{width:'100%', padding:'10px', background:'rgba(255,255,255,0.1)', border:'1px solid #444', borderRadius:'6px', color:'white'}}
                />
            </div>

            <div style={{display:'flex', gap:'15px', marginTop:'15px'}}>
                <div className="form-group" style={{flex:1}}>
                    <label>Marque</label>
                    <input 
                        type="text" name="brand" 
                        value={formData.brand} onChange={handleChange}
                        style={{width:'100%', padding:'10px', background:'rgba(255,255,255,0.1)', border:'1px solid #444', borderRadius:'6px', color:'white'}}
                    />
                </div>
                <div className="form-group" style={{flex:1}}>
                    <label>Modèle (Code)</label>
                    <input 
                        type="text" name="model" 
                        value={formData.model} onChange={handleChange}
                        style={{width:'100%', padding:'10px', background:'rgba(255,255,255,0.1)', border:'1px solid #444', borderRadius:'6px', color:'white'}}
                    />
                </div>
            </div>

            <div style={{display:'flex', gap:'15px', marginTop:'15px'}}>
                <div className="form-group" style={{flex:1}}>
                    <label>Catégorie (Tech)</label>
                    <select 
                        name="category" value={formData.category} onChange={handleChange}
                        style={{width:'100%', padding:'10px', background:'rgba(255,255,255,0.1)', border:'1px solid #444', borderRadius:'6px', color:'white'}}
                    >
                        <option value="chain">Chaîne</option>
                        <option value="cassette">Cassette</option>
                        <option value="tyre">Pneu</option>
                        <option value="brake_pads">Plaquettes</option>
                        <option value="pedals">Pédales</option>
                        <option value="wheel">Roue</option>
                        <option value="other">Autre</option>
                    </select>
                </div>
                <div className="form-group" style={{flex:1}}>
                    <label>Durée vie (km)</label>
                    <input 
                        type="number" name="lifespan_km" 
                        value={formData.lifespan_km} onChange={handleChange}
                        style={{width:'100%', padding:'10px', background:'rgba(255,255,255,0.1)', border:'1px solid #444', borderRadius:'6px', color:'white'}}
                    />
                </div>
            </div>

            <div style={{marginTop:'25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button type="button" onClick={onClose} className="secondary-btn">Annuler</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                    <FaSave /> {loading ? '...' : 'Enregistrer'}
                </button>
            </div>
        </form>
    );
};

export default LibraryForm;