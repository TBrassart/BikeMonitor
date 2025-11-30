import React, { useState, useEffect } from 'react';
import { helpService } from '../../services/api';
import { FaChevronDown, FaChevronUp, FaBug, FaLightbulb, FaCommentDots, FaPaperPlane } from 'react-icons/fa';
import './HelpPage.css';

function HelpPage() {
    const [activeTab, setActiveTab] = useState('faq'); // 'faq' | 'contact'
    const [faqs, setFaqs] = useState([]);
    const [openFaqId, setOpenFaqId] = useState(null);
    
    // Formulaire Feedback
    const [feedbackType, setFeedbackType] = useState('feature');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadFaqs();
    }, []);

    const loadFaqs = async () => {
        try {
            const data = await helpService.getFaqs();
            setFaqs(data || []);
        } catch (e) { console.error(e); }
    };

    const toggleFaq = (id) => {
        setOpenFaqId(openFaqId === id ? null : id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        try {
            await helpService.sendFeedback(feedbackType, message);
            alert("Merci ! Ton message a été bien reçu. 📨");
            setMessage('');
            setActiveTab('faq'); // Retour à l'accueil
        } catch (e) {
            alert("Erreur lors de l'envoi.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="help-page">
            <h2 className="gradient-text" style={{marginBottom:'20px'}}>Aide & Support</h2>

            {/* TABS NAVIGATION */}
            <div className="turlag-tabs">
                <button className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`} onClick={() => setActiveTab('faq')}>
                    ❓ FAQ
                </button>
                <button className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => setActiveTab('contact')}>
                    💡 Suggérer / Signaler
                </button>
            </div>

            {/* --- CONTENU FAQ --- */}
            {activeTab === 'faq' && (
                <div className="faq-list">
                    {faqs.map(item => (
                        <div key={item.id} className="glass-panel faq-item" onClick={() => toggleFaq(item.id)}>
                            <div className="faq-question">
                                <span>{item.question}</span>
                                {openFaqId === item.id ? <FaChevronUp style={{color:'var(--neon-blue)'}}/> : <FaChevronDown style={{color:'#666'}}/>}
                            </div>
                            {openFaqId === item.id && (
                                <div className="faq-answer">
                                    {item.answer}
                                </div>
                            )}
                        </div>
                    ))}
                    {faqs.length === 0 && <p style={{color:'#888', textAlign:'center'}}>Chargement des questions...</p>}
                </div>
            )}

            {/* --- CONTENU CONTACT --- */}
            {activeTab === 'contact' && (
                <div className="glass-panel" style={{padding:'30px'}}>
                    <div className="feedback-intro">
                        <p>Une idée de génie pour la V3 ? Un bug qui t'empêche de rouler ?</p>
                        <p>Dis-nous tout, on lit chaque message.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <label style={{display:'block', marginBottom:'10px', color:'white'}}>C'est à quel sujet ?</label>
                        <div className="feedback-types">
                            <div className={`type-card ${feedbackType === 'feature' ? 'active' : ''}`} onClick={() => setFeedbackType('feature')}>
                                <FaLightbulb style={{fontSize:'1.5rem', marginBottom:'5px'}} /><br/>Idée
                            </div>
                            <div className={`type-card ${feedbackType === 'bug' ? 'active' : ''}`} onClick={() => setFeedbackType('bug')}>
                                <FaBug style={{fontSize:'1.5rem', marginBottom:'5px'}} /><br/>Bug
                            </div>
                            <div className={`type-card ${feedbackType === 'other' ? 'active' : ''}`} onClick={() => setFeedbackType('other')}>
                                <FaCommentDots style={{fontSize:'1.5rem', marginBottom:'5px'}} /><br/>Autre
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Ton message</label>
                            <textarea 
                                rows="5" 
                                placeholder="Décris ta suggestion ou le bug rencontré..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                                style={{width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid var(--border-color)', color:'white', padding:'15px', borderRadius:'10px', fontSize:'1rem'}}
                            />
                        </div>

                        <button type="submit" className="primary-btn full-width" disabled={sending}>
                            {sending ? 'Envoi en cours...' : <><FaPaperPlane /> Envoyer le feedback</>}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default HelpPage;