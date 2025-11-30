import React, { useState, useEffect } from 'react';
import { shopService, authService, activityService } from '../../services/api';
import { FaLock, FaCheck, FaBolt, FaGift, FaTasks, FaMedal, FaSearch, FaTrophy, FaGlobeEurope } from 'react-icons/fa';
import './BattlePassPage.css';

function BattlePassPage() {
    const [activeTab, setActiveTab] = useState('pass'); // 'pass' | 'ranking'
    
    const [levels, setLevels] = useState([]);
    const [claimed, setClaimed] = useState([]);
    const [xp, setXp] = useState(0);
    const [seasonName, setSeasonName] = useState('Saison en cours');
    const [convertedWatts, setConvertedWatts] = useState(0);
    
    // Classement
    const [leaderboard, setLeaderboard] = useState([]);

    // Missions
    const [missions, setMissions] = useState([]);
    const [completedMissions, setCompletedMissions] = useState([]);
    const [activities, setActivities] = useState([]); 

    const [loading, setLoading] = useState(true);
    const [isClaimingAll, setIsClaimingAll] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. On lance la synchro serveur pour calculer l'XP précise et la saison
            const syncData = await shopService.syncStats();
            
            const [lvls, myClaimed, profile, allMissions, myMissions, acts, rankData] = await Promise.all([
                shopService.getSeason(),
                shopService.getClaimed(),
                authService.getMyProfile(),
                shopService.getMissions(),
                shopService.getCompletedMissions(),
                activityService.getAll(),
                shopService.getGlobalLeaderboard() // Chargement classement
            ]);

            setLevels(lvls || []);
            setClaimed(myClaimed || []);
            
            // Données synchronisées
            setXp(syncData?.xp || profile?.season_xp || 0);
            setSeasonName(syncData?.season || 'Saison');
            setConvertedWatts(profile?.season_watts_converted || 0);
            
            setMissions(allMissions || []);
            setCompletedMissions(myMissions || []);
            setActivities(acts || []);
            setLeaderboard(rankData || []);

        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const verifyMission = async (mission) => {
        if (completedMissions.includes(mission.id)) return;
        const criteria = mission.criteria || {}; 
        let isSuccess = false;

        if (criteria.type === 'min_dist_single') {
            const match = activities.find(a => (a.distance / 1000) >= criteria.value);
            if (match) isSuccess = true;
        } else if (criteria.type === 'total_elevation') {
            const totalElev = activities.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
            if (totalElev >= criteria.value) isSuccess = true;
        } else if (criteria.type === 'ride_count') {
            if (activities.length >= criteria.value) isSuccess = true;
        } else {
            if(window.confirm(`Valider manuellement "${mission.title}" ?`)) isSuccess = true;
        }

        if (isSuccess) {
            try {
                await shopService.completeMission(mission.id);
                alert(`🎯 Mission accomplie ! +${mission.xp_reward} XP`);
                loadData();
            } catch (e) { alert("Erreur validation"); }
        } else {
            alert(`Condition non remplie : ${criteria.type} requis ${criteria.value}`);
        }
    };

    const handleClaim = async (lvl) => {
        try {
            await shopService.claim(lvl);
            setClaimed([...claimed, lvl]);
        } catch(e) { alert("Erreur : " + e.message); }
    };
    
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
        } catch (e) { alert("Erreur."); } 
        finally { setIsClaimingAll(false); }
    };

    if (loading) return <div className="loading">Chargement Saison...</div>;

    const currentLevelIdx = levels.findIndex(l => l.xp_required > xp);
    const displayLevel = currentLevelIdx === -1 ? levels.length : levels[currentLevelIdx].level - 1;
    const isMaxLevel = currentLevelIdx === -1;
    
    const nextLevelXp = isMaxLevel ? xp : levels[currentLevelIdx].xp_required;
    const prevLevelXp = currentLevelIdx > 0 ? levels[currentLevelIdx - 1].xp_required : 0;
    const progressPct = isMaxLevel ? 100 : ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

    return (
        <div className="battlepass-page">
            {/* HEADER */}
            <div className="bp-header">
                <div className="bp-title">
                    <h1>{seasonName}</h1>
                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                         <p style={{margin:0}}>
                             {xp.toLocaleString()} XP 
                             {convertedWatts > 0 && <span style={{color:'var(--neon-blue)', marginLeft:'10px', fontSize:'0.8rem'}}>({convertedWatts}W convertis)</span>}
                         </p>
                         
                         {levels.some(l => xp >= l.xp_required && !claimed.includes(l.level)) && (
                             <button onClick={handleClaimAll} disabled={isClaimingAll} className="claim-btn small">
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

            {/* TABS NAVIGATION */}
            <div className="turlag-tabs" style={{margin:'0 20px', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                <button className={`tab-btn ${activeTab === 'pass' ? 'active' : ''}`} onClick={() => setActiveTab('pass')}>
                    <FaMedal /> Progression
                </button>
                <button className={`tab-btn ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>
                    <FaGlobeEurope /> Classement Général
                </button>
            </div>

            <div className="bp-content-grid">
                
                {/* --- ONGLET PASS --- */}
                {activeTab === 'pass' && (
                    <>
                        {/* COLONNE GAUCHE : TIMELINE */}
                        <div className="bp-timeline-section">
                            <div className="bp-levels-scroll">
                                <div className="bp-track-line"></div>
                                {levels.map((lvl) => {
                                    const isUnlocked = xp >= lvl.xp_required;
                                    const isClaimed = claimed.includes(lvl.level);
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
                                
                                {/* CARTE PRESTIGE FINALE */}
                                {isMaxLevel && (
                                    <div className="bp-level-card glass-panel milestone unlocked" style={{borderColor:'var(--neon-purple)', minWidth:'200px'}}>
                                        <div className="level-number" style={{background:'var(--neon-purple)'}}>∞</div>
                                        <div className="xp-req">Prestige</div>
                                        <div className="reward-box" style={{flexDirection:'column', fontSize:'0.8rem'}}>
                                            <div style={{color:'var(--neon-blue)', fontWeight:'bold'}}>CONVERSION ACTIVE</div>
                                            <div>100 XP = 10 Watts</div>
                                        </div>
                                        <div className="status-action"><FaBolt /></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COLONNE DROITE : MISSIONS */}
                        <div className="bp-missions-section glass-panel">
                            <div className="section-header">
                                <h3><FaTasks /> Missions</h3>
                                <small>Objectifs de la saison</small>
                            </div>
                            <div className="missions-list">
                                {missions.map(m => {
                                    const isDone = completedMissions.includes(m.id);
                                    return (
                                        <div key={m.id} className={`mission-card ${isDone ? 'done' : ''}`} onClick={() => !isDone && verifyMission(m)}>
                                            <div className="mission-icon">{m.icon}</div>
                                            <div className="mission-info">
                                                <h4>{m.title}</h4>
                                                <p>{m.description}</p>
                                                {m.criteria && !isDone && (
                                                    <div style={{fontSize:'0.7rem', color:'var(--neon-blue)', marginTop:'2px'}}>
                                                        <FaSearch style={{marginRight:'4px'}}/> Auto : {m.criteria.type}
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
                    </>
                )}

                {/* --- ONGLET CLASSEMENT --- */}
                {activeTab === 'ranking' && (
                    <div className="ranking-section glass-panel full-width">
                        <h3>🏆 Top 50 - {seasonName}</h3>
                        <div className="users-table-container">
                            <table className="users-table">
                                <thead><tr><th>Rang</th><th>Pilote</th><th>XP Saison</th></tr></thead>
                                <tbody>
                                    {leaderboard.map((user) => (
                                        <tr key={user.name}>
                                            <td style={{fontSize:'1.2rem', fontWeight:'bold'}}>
                                                {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                                            </td>
                                            <td>
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span className="user-avatar small">{user.avatar}</span>
                                                    <span>{user.name}</span>
                                                </div>
                                            </td>
                                            <td style={{fontWeight:'bold', color:'var(--neon-purple)'}}>{user.season_xp.toLocaleString()} XP</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default BattlePassPage;