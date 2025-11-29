import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaBarcode, FaSearch } from 'react-icons/fa';
import { authService, nutritionService } from '../../services/api';
import './NutritionPage.css';

// NOTE : On a retiré l'import de nutritionService ici.
// C'est le parent (NutritionPage) qui gère l'appel API.

const NutritionForm = ({ onClose, onSave, initialData }) => {
    const [turlags, setTurlags] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const [formData, setFormData] = useState({
        name: '', brand: '', category_type: 'bar', 
        quantity: 0, min_quantity: 2,
        carbs: 0, proteins: 0, fat: 0,
        caffeine: false, 
        expiration_date: '',
        turlag_id: '',
        tags: [], timing: [], recipe: ''
    });

    useEffect(() => {
        authService.getMyTurlags().then(data => setTurlags(data || []));
        if (initialData) {
            setFormData({
                ...initialData,
                tags: initialData.tags || [],
                timing: initialData.timing || []
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleScan = async (e) => {
        e.preventDefault(); // Empêcher submit formulaire global
        if (!barcode) return;
        
        setIsScanning(true);
        const result = await nutritionService.fetchOpenFoodFacts(barcode);
        setIsScanning(false);

        if (result.found) {
            setFormData(prev => ({
                ...prev,
                name: result.name,
                brand: result.brand,
                category_type: result.category_type,
                carbs: result.carbs || 0,
                proteins: result.proteins || 0,
                fat: result.fat || 0,
            }));
            alert(`Produit trouvé !\nValeurs importées pour : ${result.serving_size || '100g'}.\nVérifiez les macros.`);
        } else {
            alert("Produit non trouvé sur OpenFoodFacts ou code invalide.");
        }
    };

    const toggleArrayItem = (field, value) => {
        setFormData(prev => {
            const list = prev[field].includes(value)
                ? prev[field].filter(i => i !== value)
                : [...prev[field], value];
            return { ...prev, [field]: list };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            id: initialData ? initialData.id : undefined,
            carbs: parseFloat(formData.carbs) || 0,
            proteins: parseFloat(formData.proteins) || 0,
            fat: parseFloat(formData.fat) || 0,
            quantity: parseInt(formData.quantity) || 0,
            min_quantity: parseInt(formData.min_quantity) || 0,
            turlag_id: formData.turlag_id || null,
            expiration_date: formData.expiration_date || null,
            tags: formData.tags || [],
            timing: formData.timing || []
        };
        
        if (onSave) onSave(dataToSave);
    };

    return (
        <div className="modal-overlay">
            <div className="glass-panel modal-content nutri-form-modal">
                
                {/* 1. HEADER FIXE */}
                <div className="form-header">
                    <h3 style={{margin:0}}>{initialData ? 'Modifier' : 'Ajouter'} Nutrition</h3>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>

                {/* 2. ZONE SCROLLABLE (Contenu) */}
                <form onSubmit={handleSubmit} className="nutri-form-scroll-area">
                    
                    {/* ZONE DE SCAN (Seulement si création) */}
                    {!initialData && (
                        <div className="scan-section glass-panel" style={{padding: '10px', display:'flex', gap:'10px', alignItems:'center'}}>
                            <div style={{color:'var(--neon-blue)', fontSize:'1.2rem'}}><FaBarcode /></div>
                            <input 
                                type="text" 
                                placeholder="Scanner EAN..." 
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className="admin-input"
                                style={{flex: 1, padding:'6px', fontSize:'0.9rem'}}
                                autoFocus
                            />
                            <button type="button" onClick={handleScan} disabled={isScanning} className="primary-btn small">
                                {isScanning ? '...' : <FaSearch />}
                            </button>
                        </div>
                    )}

                    {/* LIGNE 1 : Nom (Grand), Marque, Type -> Tout sur une ligne */}
                    <div className="form-grid-3-tight">
                        <div className="form-group">
                            <label>Nom</label>
                            <input name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Gel" />
                        </div>
                        <div className="form-group">
                            <label>Marque</label>
                            <input name="brand" value={formData.brand} onChange={handleChange} placeholder="Ex: Maurten" />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select name="category_type" value={formData.category_type} onChange={handleChange} className="neon-select">
                                <option value="bar">Barre</option>
                                <option value="gel">Gel</option>
                                <option value="drink">Boisson</option>
                                <option value="compote">Compote</option>
                                <option value="meal">Repas</option>
                                <option value="other">Autre</option>
                            </select>
                        </div>
                    </div>

                    {/* LIGNE 2 : Macros (Compacté dans une boite) */}
                    <div className="macros-row">
                        <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginRight:'5px'}}>MACROS</div>
                        <div className="form-group">
                            <label>Glucides</label>
                            <input type="number" name="carbs" step="0.1" value={formData.carbs} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Protéines</label>
                            <input type="number" name="proteins" step="0.1" value={formData.proteins} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Lipides</label>
                            <input type="number" name="fat" step="0.1" value={formData.fat} onChange={handleChange} />
                        </div>
                    </div>

                    {/* LIGNE 3 : Stock & Dates */}
                    <div className="form-grid-3-tight">
                         <div className="form-group">
                            <label>Stock</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Alerte Min.</label>
                            <input type="number" name="min_quantity" value={formData.min_quantity} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Péremption</label>
                            <input type="date" name="expiration_date" value={formData.expiration_date} onChange={handleChange} style={{fontSize:'0.8rem'}}/>
                        </div>
                    </div>

                    {/* LIGNES COMPACTES POUR TAGS & MOMENT */}
                    <div className="form-section-compact">
                        <h4>Propriétés</h4>
                        <div className="compact-tags">
                            <button type="button" className={`chip ${formData.caffeine ? 'active' : ''}`} onClick={() => setFormData(p => ({...p, caffeine: !p.caffeine}))}>☕ Caféine</button>
                            <button type="button" className={`chip ${formData.tags.includes('vegan') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'vegan')}>🌱 Vegan</button>
                            <button type="button" className={`chip ${formData.tags.includes('homemade') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'homemade')}>🏠 Maison</button>
                        </div>
                    </div>

                    <div className="form-section-compact">
                        <h4>Moment</h4>
                        <div className="compact-tags">
                            <button type="button" className={`chip blue ${formData.timing.includes('pre') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'pre')}>Avant</button>
                            <button type="button" className={`chip orange ${formData.timing.includes('during') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'during')}>Pendant</button>
                            <button type="button" className={`chip green ${formData.timing.includes('post') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'post')}>Après</button>
                        </div>
                    </div>
                    
                    <div className="form-group" style={{marginTop:'5px'}}>
                        <label>Visibilité</label>
                        <select name="turlag_id" value={formData.turlag_id} onChange={handleChange} className="neon-select">
                            <option value="">🔒 Privé (Moi uniquement)</option>
                            {turlags.map(t => (
                                <option key={t.id} value={t.id}>👥 {t.name}</option>
                            ))}
                        </select>
                    </div>

                </form>

                {/* 3. FOOTER FIXE (Bouton Sauvegarder) */}
                <div className="form-footer">
                    <button type="button" onClick={handleSubmit} className="primary-btn full-width">
                        <FaSave /> {initialData ? 'Mettre à jour' : 'Enregistrer'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default NutritionForm;