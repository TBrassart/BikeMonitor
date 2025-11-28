import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaCheckSquare, FaSquare, FaPaperPlane, FaArrowLeft, FaGoogle, FaShieldAlt } from 'react-icons/fa';
import { authService, supabase } from '../../services/api'; // Besoin de supabase direct pour certaines vérifs
import './AuthScreen.css';
import Logo from '../Layout/Logo';

const AuthScreen = ({ onLogin, isInviteFlow = false, inviteToken = null, forceSignUp = false }) => {
    const [isLoginMode, setIsLoginMode] = useState(!forceSignUp);
    const [isForgotMode, setIsForgotMode] = useState(false);
    
    // États Formulaire
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    
    // États 2FA
    const [needsMfa, setNeedsMfa] = useState(false);
    const [mfaCode, setMfaCode] = useState('');

    const [isPending, setIsPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Anti-spam timer
    useEffect(() => {
        let timer;
        if (cooldown > 0) timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleSocialLogin = async (provider) => {
        setIsPending(true);
        try {
            await authService.signInWithProvider(provider);
        } catch (e) {
            setErrorMsg(`Erreur connexion ${provider}.`);
            setIsPending(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            // --- CAS 1 : VALIDATION CODE 2FA ---
            if (needsMfa) {
                // Récupérer les facteurs disponibles
                const factors = await authService.listMfaFactors();
                const totpFactor = factors.find(f => f.factor_type === 'totp');
                
                if (!totpFactor) throw new Error("Erreur technique MFA.");

                // Tenter de valider le code
                await authService.challengeAndVerifyMfa(totpFactor.id, mfaCode);
                
                // Si ça passe, on finalise la connexion
                if (onLogin) await onLogin();
                return;
            }

            // --- CAS 2 : MOT DE PASSE OUBLIÉ ---
            if (isForgotMode) {
                if (cooldown > 0) return;
                await authService.resetPasswordForEmail(email);
                setSuccessMsg("Email envoyé ! Vérifie tes spams.");
                setCooldown(60);
            } 
            // --- CAS 3 : CONNEXION CLASSIQUE ---
            else if (isLoginMode) {
                // 1. Connexion Email/MDP
                const { error } = await authService.signInWithEmail(email, password);
                if (error) throw error;

                // 2. Vérification : Est-ce que la 2FA est active ?
                const mfaLevel = await authService.getMfaAssuranceLevel();
                
                // Si le niveau actuel (aal1) est inférieur au niveau suivant (aal2), 
                // c'est qu'une 2FA est configurée et requise.
                if (mfaLevel && mfaLevel.nextLevel === 'aal2' && mfaLevel.currentLevel !== 'aal2') {
                    setNeedsMfa(true); // On bascule l'interface
                    setIsPending(false);
                    return; // On s'arrête là, on attend le code
                }

                // Sinon, connexion directe
                if (onLogin) await onLogin();
            } 
            // --- CAS 4 : INSCRIPTION ---
            else {
                if (password.length < 6) throw new Error("Le mot de passe doit faire au moins 6 caractères.");
                if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas.");

                const redirectUrl = inviteToken ? `${window.location.origin}/join/${inviteToken}` : undefined;
                const { data, error } = await authService.signUp(email, password, '', redirectUrl, inviteToken);
                if (error) throw error;

                if (data.user && !data.session) {
                    setSuccessMsg("Compte créé ! 📧 Vérifie tes emails pour valider.");
                    setIsLoginMode(true);
                    setPassword(''); setConfirmPassword('');
                } else if (data.user && data.session) {
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error(error);
            let msg = error.message || "Une erreur est survenue.";
            if (msg.includes("User already registered")) msg = "Cet email est déjà utilisé.";
            if (msg.includes("Invalid login")) msg = "Identifiants incorrects.";
            if (msg.includes("Invalid code")) msg = "Code de sécurité incorrect.";
            setErrorMsg(msg);
        } finally {
            // On ne coupe le loading que si on n'a pas basculé en mode MFA
            if (!needsMfa || errorMsg) setIsPending(false);
        }
    };

    let title = "Heureux de vous revoir";
    if (needsMfa) title = "Sécurité requise"; // Titre mode 2FA
    else if (!isLoginMode) title = "Créez votre écurie";
    else if (isForgotMode) title = "Récupération";

    return (
        <div className="auth-screen">
            <div className="bg-glow glow-1"></div>
            <div className="bg-glow glow-2"></div>

            <div className="auth-card glass-panel">
                <div className="auth-brand">
                    <div className="logo-wrapper"><Logo width={60} height={60} /></div>
                    <h1>BikeMonitor</h1>
                    <p className="subtitle">{isInviteFlow ? "Rejoignez votre équipe !" : title}</p>
                </div>
                
                {successMsg && <div className="auth-message success">{successMsg}</div>}
                {errorMsg && <div className="auth-message error">{errorMsg}</div>}

                {/* SECTION SOCIALE (Masquée en MFA ou Forgot) */}
                {!isForgotMode && !needsMfa && (
                    <div className="social-login-section">
                        <button className="social-btn google" onClick={() => handleSocialLogin('google')} title="Continuer avec Google">
                            <FaGoogle /> Google
                        </button>
                    </div>
                )}

                {!isForgotMode && !needsMfa && <div className="divider"><span>OU</span></div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    
                    {/* --- VUE SAISIE CODE 2FA --- */}
                    {needsMfa ? (
                        <div className="mfa-input-container slide-in">
                            <p style={{color:'#ccc', fontSize:'0.9rem', marginBottom:'15px'}}>
                                Entrez le code à 6 chiffres de votre application d'authentification.
                            </p>
                            <div className="input-group">
                                <div className="input-icon"><FaShieldAlt /></div>
                                <input 
                                    type="text" 
                                    placeholder="000 000" 
                                    value={mfaCode} 
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                                    autoFocus
                                    className="code-input"
                                    required 
                                    disabled={isPending}
                                />
                            </div>
                        </div>
                    ) : (
                        /* --- VUE NORMALE EMAIL/MDP --- */
                        <>
                            <div className="input-group">
                                <div className="input-icon"><FaEnvelope /></div>
                                <input 
                                    type="email" placeholder="Email" 
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    required disabled={isPending}
                                />
                            </div>

                            {!isForgotMode && (
                                <div className="input-group slide-in">
                                    <div className="input-icon"><FaLock /></div>
                                    <input 
                                        type="password" placeholder="Mot de passe" 
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        required disabled={isPending} minLength={6}
                                    />
                                </div>
                            )}

                            {!isLoginMode && !isForgotMode && (
                                <div className="input-group slide-in">
                                    <div className="input-icon"><FaLock /></div>
                                    <input 
                                        type="password" placeholder="Confirmer le mot de passe" 
                                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        required disabled={isPending}
                                    />
                                </div>
                            )}

                            {isLoginMode && !isForgotMode && (
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'5px'}}>
                                    <div className="remember-me" onClick={() => setRememberMe(!rememberMe)}>
                                        {rememberMe ? <FaCheckSquare className="check-icon active" /> : <FaSquare className="check-icon" />}
                                        <span>Se souvenir</span>
                                    </div>
                                    <button type="button" className="forgot-link" onClick={() => {setIsForgotMode(true); setErrorMsg(''); setSuccessMsg('');}}>
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <button type="submit" className="login-btn" disabled={isPending}>
                        {isPending ? <span className="loader"></span> : (
                            needsMfa ? "Vérifier le code" :
                            isForgotMode ? (cooldown > 0 ? `Attendre ${cooldown}s` : <><FaPaperPlane /> Envoyer le lien</>) :
                            isLoginMode ? <><FaSignInAlt /> Se connecter</> : 
                            <><FaUserPlus /> {isInviteFlow ? "Rejoindre" : "S'inscrire"}</>
                        )}
                    </button>

                    {/* BOUTONS RETOUR */}
                    {(isForgotMode || needsMfa) && (
                        <button 
                            type="button" 
                            className="switch-btn" 
                            style={{marginTop:'15px'}} 
                            onClick={() => {
                                if(needsMfa) { setNeedsMfa(false); setMfaCode(''); }
                                else setIsForgotMode(false);
                            }}
                        >
                            <FaArrowLeft /> Retour
                        </button>
                    )}
                </form>

                {!forceSignUp && !isForgotMode && !needsMfa && (
                    <p className="signup-link">
                        {isLoginMode ? "Pas encore de compte ?" : "Déjà un compte ?"}
                        <button 
                            className="switch-btn" 
                            onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); setSuccessMsg(''); }}
                        >
                            {isLoginMode ? "Créer un compte" : "Se connecter"}
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
};

export default AuthScreen;