import React, { useState, useEffect } from 'react';
import { shopService, authService, activityService } from '../../services/api';
import { FaLock, FaCheck, FaBolt, FaGift, FaTasks, FaMedal, FaSearch } from 'react-icons/fa';
import './BattlePassPage.css';

function BattlePassPage() {
    const [levels, setLevels] = useState([]);
    const [claimed, setClaimed] = useState([]);
    const [xp, setXp] = useState(0);
    
    // Missions
    const [missions, setMissions] = useState([]);
    const [completedMissions, setCompletedMissions] = useState([]);

    const [loading, setLoading] = useState(true);

    const [activities, setActivities] = useState([]); // Pour la vérif
    const [isClaimingAll, setIsClaimingAll] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [lvls, myClaimed, profile, allMissions, myMissions, acts] = await Promise.all([
                shopService.getSeason(),
                shopService.getClaimed(),
                authService.getMyProfile(),
                shopService.getMissions(),
                shopService.getCompletedMissions(),
                activityService.getAll()
            ]);
            setLevels(lvls || []);
            setClaimed(myClaimed || []);
            setXp(profile?.season_xp || 0);
            setMissions(allMissions || []);
            setCompletedMissions(myMissions || []);
            setActivities(acts || []);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleClaim = async (lvl) => {
        try {
            await shopService.claim(lvl);
            setClaimed([...claimed, lvl]);
            // Animation ou alerte
        } catch(e) { alert("Erreur : " + e.message); }
    };

    const handleCompleteMission = async (mission) => {
        if (completedMissions.includes(mission.id)) return;
        // Pour l'instant c'est du déclaratif manuel (l'utilisateur clique pour dire "J'ai fait")
        // Plus tard, on pourra automatiser ça
        if(window.confirm(`Valider la mission "${mission.title}" ?`)) {
            try {
                await shopService.completeMission(mission.id);
                await loadData(); // Refresh XP
                alert(`Mission validée ! +${mission.xp_reward} XP`);
            } catch(e) { alert("Erreur"); }
        }
    };

    if (loading) return <div className="loading">Chargement Saison...</div>;

    // --- LOGIQUE DE VÉRIFICATION INTELLIGENTE ---
    const verifyMission = async (mission) => {
        if (completedMissions.includes(mission.id)) return;

        // On suppose que mission.criteria est un JSON stocké en base
        // Ex: { "type": "distance", "value": 50 } ou { "type": "elevation", "value": 1000 }
        // Si pas de critères, on laisse la validation manuelle pour l'instant
        const criteria = mission.criteria || {}; 

        let isSuccess = false;

        // 1. Validation : Distance unique (Une sortie de X km)
        if (criteria.type === 'min_dist_single') {
            const match = activities.find(a => (a.distance / 1000) >= criteria.value);
            if (match) isSuccess = true;
        }
        // 2. Validation : Dénivelé total (Cumul sur toutes les activités)
        else if (criteria.type === 'total_elevation') {
            const totalElev = activities.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
            if (totalElev >= criteria.value) isSuccess = true;
        }
        // 3. Validation : Nombre de sorties
        else if (criteria.type === 'ride_count') {
            if (activities.length >= criteria.value) isSuccess = true;
        }
        // Fallback : Validation manuelle (si pas de critères définis en base)
        else {
            if(window.confirm(`Valider manuellement "${mission.title}" ?`)) isSuccess = true;
        }

        if (isSuccess) {
            try {
                await shopService.completeMission(mission.id);
                // Animation simple
                alert(`🎯 Mission accomplie ! +${mission.xp_reward} XP`);
                loadData();
            } catch (e) { alert("Erreur validation"); }
        } else {
            alert(`Condition non remplie : ${criteria.type} requis ${criteria.value}`);
        }
    };

    // --- LOGIQUE CLAIM ALL ---
    const handleClaimAll = async () => {
        const claimableLevels = levels
            .filter(l => xp >= l.xp_required && !claimed.includes(l.level))
            .map(l => l.level);

        if (claimableLevels.length === 0) return;

        setIsClaimingAll(true);
        try {
            await shopService.claimAll(claimableLevels);
            alert(`🎁 ${claimableLevels.length} récompenses récupérées !`);
            loadData();
        } catch (e) {
            alert("Erreur lors de la récupération.");
        } finally {
            setIsClaimingAll(false);
        }
    };
    
    const currentLevel = levels.findIndex(l => l.xp_required > xp);
    const displayLevel = currentLevel === -1 ? levels.length : currentLevel;
    const nextLevelXp = currentLevel === -1 ? xp : levels[currentLevel]?.xp_required;
    const prevLevelXp = currentLevel > 0 ? levels[currentLevel - 1].xp_required : 0;
    
    const progressPct = currentLevel === -1 ? 100 : ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

    return (
        <div className="battlepass-page">
            {/* HEADER AVEC BOUTON CLAIM ALL */}
            <div className="bp-header">
                <div className="bp-title">
                    <h1>Le Grand Tour 2025</h1>
                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                         <p style={{margin:0}}>Saison 1 • {xp.toLocaleString()} XP</p>
                         
                         {/* BOUTON TOUT RÉCUPÉRER */}
                         {levels.some(l => xp >= l.xp_required && !claimed.includes(l.level)) && (
                             <button 
                                onClick={handleClaimAll} 
                                disabled={isClaimingAll}
                                className="claim-btn"
                                style={{fontSize:'0.8rem', padding:'5px 15px', marginLeft:'10px'}}
                             >
                                {isClaimingAll ? '...' : <><FaGift /> Tout récupérer</>}
                             </button>
                         )}
                    </div>
                    <div className="bp-progress-bar-wrapper">
                        <div className="bp-progress-bar" style={{width: `${Math.min(100, progressPct)}%`}}></div>
                    </div>
                </div>
                <div className="bp-level-badge">
                    <span>Niveau</span>
                    <strong>{displayLevel}</strong>
                </div>
            </div>

            <div className="bp-content-grid">
                
                {/* COLONNE GAUCHE : TIMELINE */}
                <div className="bp-timeline-section">
                    <h3>Progression</h3>
                    <div className="bp-levels-scroll">
                        <div className="bp-track-line"></div>
                        {levels.map((lvl) => {
                            const isUnlocked = xp >= lvl.xp_required;
                            const isClaimed = claimed.includes(lvl.level);
                            // Milestone tous les 10 niveaux
                            const isMilestone = lvl.level % 10 === 0;
                            
                            return (
                                <div key={lvl.level} className={`bp-level-card glass-panel ${isUnlocked ? 'unlocked' : 'locked'} ${isClaimed ? 'claimed' : ''} ${isMilestone ? 'milestone' : ''}`}>
                                    <div className="level-number">{lvl.level}</div>
                                    <div className="xp-req">{lvl.xp_required} XP</div>
                                    
                                    <div className="reward-box">
                                        {lvl.reward_item_id ? (
                                            <div className="reward-item">🎁 {lvl.shop_items?.name}</div>
                                        ) : lvl.reward_watts > 0 ? (
                                            <div className="reward-watts">⚡ {lvl.reward_watts}</div>
                                        ) : (
                                            <div className="reward-none">-</div>
                                        )}
                                    </div>

                                    <div className="status-action">
                                        {isClaimed ? <FaCheck className="check" /> : 
                                         isUnlocked ? <button onClick={() => handleClaim(lvl.level)} className="claim-btn">Récupérer</button> : 
                                         <FaLock className="lock" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SECTION MISSIONS */}
                <div className="bp-missions-section glass-panel">
                    <div className="section-header">
                        <h3><FaTasks /> Missions</h3>
                        <small>Prouvez votre valeur</small>
                    </div>
                    <div className="missions-list">
                        {missions.map(m => {
                            const isDone = completedMissions.includes(m.id);
                            return (
                                <div 
                                    key={m.id} 
                                    className={`mission-card ${isDone ? 'done' : ''}`} 
                                    // On change le onClick pour utiliser verifyMission
                                    onClick={() => !isDone && verifyMission(m)}
                                >
                                    <div className="mission-icon">{m.icon}</div>
                                    <div className="mission-info">
                                        <h4>{m.title}</h4>
                                        <p>{m.description}</p>
                                        {/* Petit indice sur le critère si dispo */}
                                        {m.criteria && !isDone && (
                                            <div style={{fontSize:'0.7rem', color:'var(--neon-blue)', marginTop:'2px'}}>
                                                <FaSearch style={{marginRight:'4px'}}/> 
                                                Vérification auto : {m.criteria.type}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mission-reward">
                                        {isDone ? <FaCheck /> : `+${m.xp_reward} XP`}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BattlePassPage;