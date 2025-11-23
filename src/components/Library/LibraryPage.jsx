import React, { useState, useEffect } from 'react';
import { libraryService } from '../../services/api';
import { FaPlus, FaCogs } from 'react-icons/fa';
import LibraryForm from './LibraryForm'; // Assure-toi d'avoir ce formulaire ou commente-le
import './LibraryPage.css';

function LibraryPage() {
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        try {
            setLoading(true);
            const data = await libraryService.getAll();
            setComponents(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="library-page">
            <header className="page-header">
                <h2>Bibliothèque de composants</h2>
                <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                    <FaPlus />
                </button>
            </header>

            {showForm && (
                <div className="glass-panel form-panel">
                    {/* Placeholder pour le formulaire si tu ne l'as pas encore refait */}
                    <LibraryForm onSuccess={() => { setShowForm(false); loadLibrary(); }} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {loading ? (
                <p>Chargement du catalogue...</p>
            ) : (
                <div className="library-grid">
                    {components.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>La bibliothèque est vide.</p>
                        </div>
                    ) : (
                        components.map(comp => (
                            <div key={comp.id} className="library-card glass-panel">
                                <div className="card-icon">
                                    <FaCogs />
                                </div>
                                <div className="card-content">
                                    <h4>{comp.brand} {comp.model}</h4>
                                    <span className="category-tag">{comp.category}</span>
                                    <p className="lifespan">Durée estimée : {comp.lifespan_km} km</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default LibraryPage;