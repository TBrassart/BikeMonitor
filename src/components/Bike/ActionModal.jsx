import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ActionModal = ({ isOpen, onClose, title, children, actions }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, 
            background: 'rgba(0,0,0,0.8)', zIndex: 4000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ 
                width: '100%', maxWidth: '450px', padding: '0',
                border: '1px solid var(--border-color)', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                
                {/* En-tête */}
                <div style={{ 
                    padding: '15px 20px', 
                    borderBottom: '1px solid rgba(255,255,255,0.1)', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <h3 style={{margin:0, fontSize:'1.1rem', color:'white'}}>{title}</h3>
                    <button onClick={onClose} style={{background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:'1.1rem'}}>
                        <FaTimes />
                    </button>
                </div>

                {/* Contenu */}
                <div style={{ padding: '25px 20px', fontSize:'1rem', lineHeight:'1.5', color:'#e2e8f0' }}>
                    {children}
                </div>

                {/* Actions (Boutons) */}
                <div style={{ 
                    padding: '15px 20px', 
                    background: 'rgba(0,0,0,0.2)', 
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }}>
                    {actions.map((action, index) => (
                        <button 
                            key={index}
                            onClick={action.onClick}
                            className={action.className || 'secondary-btn'}
                            style={action.style || {}}
                        >
                            {action.icon && <span style={{marginRight:'8px'}}>{action.icon}</span>}
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActionModal;