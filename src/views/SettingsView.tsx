import React, { useState, useEffect } from 'react';
import './SettingsView.css';

interface SettingsViewProps {
    userEmail: string | undefined;
    currentLanguage: 'en' | 'es';
}

const SettingsView: React.FC<SettingsViewProps> = ({ userEmail, currentLanguage }) => {
    const [displayName, setDisplayName] = useState('');
    const [autoSync, setAutoSync] = useState(true);
    const [runAtStartup, setRunAtStartup] = useState(false);
    const [minimizeToTray, setMinimizeToTray] = useState(true);
    const [language, setLanguage] = useState<'en' | 'es'>(currentLanguage);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        // Load settings on mount
        const loadSettings = async () => {
            const settings = await window.electronAPI.getSettings();
            if (settings) {
                setDisplayName(settings.displayName || '');
                setAutoSync(settings.autoSync !== undefined ? settings.autoSync : true);
                setRunAtStartup(settings.runAtStartup || false);
                setMinimizeToTray(settings.minimizeToTray !== undefined ? settings.minimizeToTray : true);
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
        await window.electronAPI.setSettings({ displayName, autoSync, language, runAtStartup, minimizeToTray });
        setStatusMessage(language === 'es' ? '¡Configuración guardada!' : 'Settings saved!');
        setTimeout(() => setStatusMessage(''), 3000);
    };

    return (
        <div className="settings-container">
            <h1>{language === 'es' ? 'Ajustes' : 'Settings'}</h1>

            <div className="settings-grid">
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
                    <div className="toggle-group" style={{ marginTop: '20px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={runAtStartup}
                                onChange={(e) => setRunAtStartup(e.target.checked)}
                            />
                            <span className="toggle-label">{language === 'es' ? 'Ejecutar al iniciar PC' : 'Run at Startup'}</span>
                        </label>
                        <p className="description">
                            {language === 'es'
                                ? 'Lanza la aplicación automáticamente cuando inicias sesión.'
                                : 'Launch the app automatically when you log in.'}
                        </p>
                    </div>

                    <div className="toggle-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={minimizeToTray}
                                onChange={(e) => setMinimizeToTray(e.target.checked)}
                            />
                            <span className="toggle-label">{language === 'es' ? 'Minimizar a la bandeja' : 'Minimize to Tray'}</span>
                        </label>
                        <p className="description">
                            {language === 'es'
                                ? 'Seguir funcionando en segundo plano al cerrar.'
                                : 'Keep running in background when closed.'}
                        </p>
                    </div>

                    <div className="toggle-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={autoSync}
                                onChange={(e) => setAutoSync(e.target.checked)}
                            />
                            <span className="toggle-label">{language === 'es' ? 'Sincronización' : 'Auto-Sync Data'}</span>
                        </label>
                    </div>
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
