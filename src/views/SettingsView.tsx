import React, { useState, useEffect } from 'react';
import './SettingsView.css';

interface SettingsViewProps {
    userEmail: string | undefined;
    currentLanguage: 'en' | 'es';
}

const SettingsView: React.FC<SettingsViewProps> = ({ userEmail, currentLanguage }) => {
    const [displayName, setDisplayName] = useState('');
    const [autoSync, setAutoSync] = useState(true);
    const [language, setLanguage] = useState<'en' | 'es'>(currentLanguage);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        // Load settings on mount
        const loadSettings = async () => {
            const settings = await window.electronAPI.getSettings();
            if (settings) {
                setDisplayName(settings.displayName || '');
                setAutoSync(settings.autoSync !== undefined ? settings.autoSync : true);
                setLanguage(settings.language || 'es');
            }
        };
        loadSettings();
    }, []);

    // Also update local state if prop changes (e.g. from main process event)
    useEffect(() => {
        setLanguage(currentLanguage);
    }, [currentLanguage]);

    const handleSave = async () => {
        await window.electronAPI.setSettings({ displayName, autoSync, language });
        setStatusMessage(language === 'es' ? '¡Configuración guardada!' : 'Settings saved!');
        setTimeout(() => setStatusMessage(''), 3000);
    };

    return (
        <div className="settings-container">
            <h1>{language === 'es' ? 'Ajustes' : 'Settings'}</h1>

            <div className="settings-section">
                <h2>{language === 'es' ? 'Perfil' : 'Profile'}</h2>
                <div className="form-group">
                    <label>Email</label>
                    <input type="text" value={userEmail || 'Not logged in'} disabled className="readonly-input" />
                </div>
                <div className="form-group">
                    <label>{language === 'es' ? 'Nombre Visible' : 'Display Name'}</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={userEmail ? (language === 'es' ? "Ingresa tu nombre" : "Enter your username") : (language === 'es' ? "Inicia sesión para cambiar" : "Login to change")}
                        disabled={!userEmail}
                        style={!userEmail ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                    />
                </div>
            </div>

            <div className="settings-section">
                <h2>{language === 'es' ? 'Preferencias' : 'Preferences'}</h2>
                <div className="form-group">
                    <label>{language === 'es' ? 'Idioma' : 'Language'}</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
                        style={{ padding: '8px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #444', width: '100%' }}
                    >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <div className="toggle-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={autoSync}
                            onChange={(e) => setAutoSync(e.target.checked)}
                        />
                        <span className="toggle-label">{language === 'es' ? 'Sincronizar Automáticamente' : 'Auto-Sync Data'}</span>
                    </label>
                    <p className="description">
                        {language === 'es'
                            ? 'Si se activa, tu tiempo de juego se subirá a la nube al cerrar el juego.'
                            : 'If enabled, your playtime will be automatically uploaded to the cloud when you stop playing.'}
                    </p>
                </div>
            </div>

            <div className="settings-actions">
                <button className="save-btn" onClick={handleSave}>{language === 'es' ? 'Guardar Cambios' : 'Save Changes'}</button>
                {statusMessage && <span className="status-msg">{statusMessage}</span>}
            </div>
        </div>
    );
};

export default SettingsView;
