import React, { useEffect, useState } from 'react';
// On garde FaTrash ici car il est parfois utilisé pour d'autres actions ou styles
import { FaTrash } from 'react-icons/fa'; 
import { authService } from '../../services/api';
import './ProfileSelection.css';

// Définition de la carte de profil (à adapter si tu as un fichier ProfileCard.jsx séparé)
const ProfileCard = ({ profile, onSelectProfile }) => {
    return (
        <div key={profile.id} className="profile-card" onClick={() => onSelectProfile && onSelectProfile(profile)}>
            {/* On ne garde que l'affichage et la sélection */}
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
            // authService.getProfiles récupère désormais tous les profils de la famille (RLS)
            const data = await authService.getProfiles();
            setProfiles(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <p className="profile-selection-screen">Chargement des profils...</p>;

    // Si vous arrivez ici et qu'il n'y a qu'un seul profil, il n'y a rien à sélectionner,
    // mais App.jsx est censé gérer ça. Ici on affiche la liste des choix.
    
    return (
        <div className="profile-selection-screen">
            <h1>Qui roule aujourd'hui ?</h1>
            
            <div className="profiles-grid">
                {profiles.map(profile => (
                    <ProfileCard 
                        key={profile.id} 
                        profile={profile} 
                        onClick={onSelectProfile} 
                        // Suppression de toute logique de suppression ici
                    />
                ))}

                {/* SUPPRESSION DU BOUTON AJOUTER (Ajouter devient Inscription) */}
            </div>
        </div>
    );
};

export default ProfileSelection;