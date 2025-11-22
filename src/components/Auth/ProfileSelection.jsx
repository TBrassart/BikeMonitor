import React, { useEffect, useState } from 'react';
// On garde les icônes nécessaires (même si on ne crée/supprime plus ici)
import { FaTrash } from 'react-icons/fa'; 
import { authService } from '../../services/api';
import './ProfileSelection.css';

// Composant ProfileCard interne pour la clarté
const ProfileCard = ({ profile, onSelect }) => {
    return (
        <div key={profile.id} className="profile-card" onClick={() => onSelect(profile)}>
            <div className="profile-avatar">
                {profile.avatar}
            </div>
            <span className="profile-name">{profile.name}</span>
        </div>
    );
};

const ProfileSelection = ({ onSelectProfile }) => {
    const [profiles, setProfiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        setIsLoading(true);
        try {
            // On charge tous les profils que l'utilisateur est autorisé à voir (RLS)
            const data = await authService.getProfiles();
            setProfiles(data || []);
        } catch (e) {
            console.error("Erreur chargement profils", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <p className="profile-selection-screen">Chargement des profils...</p>;

    // La logique de la grille reste simple et propre
    return (
        <div className="profile-selection-screen">
            <h1>Qui roule aujourd'hui ?</h1>
            
            <div className="profiles-grid">
                {profiles.map(profile => (
                    <ProfileCard 
                        key={profile.id} 
                        profile={profile} 
                        onSelect={onSelectProfile} // La fonction est passée ici
                    />
                ))}
                
                {/* On retire le bouton "Ajouter" pour forcer le flux d'invitation/inscription */}
            </div>
        </div>
    );
};

export default ProfileSelection;