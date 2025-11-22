import React, { useEffect, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { authService } from '../../services/api';
import './ProfileSelection.css';

const avatars = ['🚲', '👑', '👶', '👩', '👨', '👽', '🦄', '🚀', '⚡', '🧢'];

const ProfileSelection = ({ onSelectProfile }) => {
    const [profiles, setProfiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileAvatar, setNewProfileAvatar] = useState('🚲');

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        setIsLoading(true);
        try {
            const data = await authService.getProfiles();
            setProfiles(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProfile = async (e) => {
        e.preventDefault();
        if (!newProfileName) return;

        try {
            const newProfile = await authService.createProfile(newProfileName, newProfileAvatar);
            setProfiles([...profiles, newProfile]);
            setIsAdding(false);
            setNewProfileName('');
        } catch (e) {
            alert("Erreur création profil");
        }
    };

    const handleDeleteProfile = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Supprimer ce profil ?")) {
            try {
                await authService.deleteProfile(id);
                setProfiles(profiles.filter(p => p.id !== id));
            } catch (error) {
                alert("Erreur suppression");
            }
        }
    };

    return (
        <div className="profile-selection-screen">
            <h1>Qui roule aujourd'hui ?</h1>
            
            <div className="profiles-grid">
                {isLoading ? <p>Chargement...</p> : profiles.map(profile => (
                    <div key={profile.id} className="profile-card" onClick={() => onSelectProfile(profile)}>
                        <div className="profile-avatar">
                            {profile.avatar}
                        </div>
                        <span className="profile-name">{profile.name}</span>
                        
                        {profile.role !== 'admin' && (
                            <button className="delete-profile-btn" onClick={(e) => handleDeleteProfile(e, profile.id)}>
                                <FaTrash />
                            </button>
                        )}
                    </div>
                ))}

                {!isAdding ? (
                    <div className="profile-card add-profile" onClick={() => setIsAdding(true)}>
                        <div className="profile-avatar add"><FaPlus /></div>
                        <span className="profile-name">Ajouter</span>
                    </div>
                ) : (
                    <div className="profile-card form-card">
                        <form onSubmit={handleCreateProfile} onClick={e => e.stopPropagation()}>
                            <div className="avatar-selector">
                                {avatars.map(av => (
                                    <span 
                                        key={av} 
                                        className={`av-option ${newProfileAvatar === av ? 'selected' : ''}`}
                                        onClick={() => setNewProfileAvatar(av)}
                                    >
                                        {av}
                                    </span>
                                ))}
                            </div>
                            <input 
                                type="text" 
                                placeholder="Prénom" 
                                value={newProfileName} 
                                onChange={e => setNewProfileName(e.target.value)}
                                autoFocus
                            />
                            <div className="form-buttons">
                                <button type="submit" className="confirm-btn">OK</button>
                                <button type="button" className="cancel-btn-profile" onClick={() => setIsAdding(false)}>X</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSelection;