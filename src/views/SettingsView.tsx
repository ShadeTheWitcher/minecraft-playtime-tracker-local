import React, { useState, useEffect } from 'react';
import './SettingsView.css';
import { getTranslation, type Language } from '../lib/translations';

interface SettingsViewProps {
    userEmail: string | undefined;
    currentLanguage: Language;
}

const SettingsView: React.FC<SettingsViewProps> = ({ userEmail, currentLanguage }) => {
    const [displayName, setDisplayName] = useState('');
    const [autoSync, setAutoSync] = useState(true);
    const [runAtStartup, setRunAtStartup] = useState(false);
    const [minimizeToTray, setMinimizeToTray] = useState(true);
    const [language, setLanguage] = useState<Language>(currentLanguage);
    const [statusMessage, setStatusMessage] = useState('');
    const t = getTranslation(language);

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
        setStatusMessage(t.settings_saved);
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleSync = () => {
        if (window.ipcRenderer) {
            window.ipcRenderer.send('sync:trigger');
            setStatusMessage(t.sync_started);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    return (
        <div className="settings-container">
            <h1>{t.settings_title}</h1>

            <div className="settings-grid">
                <div className="settings-section">
                    <h2>{t.profile_section}</h2>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="text" value={userEmail || 'Not logged in'} disabled className="readonly-input" />
                    </div>
                    <div className="form-group">
                        <label>{t.display_name}</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={userEmail ? t.enter_name_placeholder : t.login_to_change}
                            disabled={!userEmail}
                            style={!userEmail ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h2>{t.preferences_section}</h2>
                    <div className="form-group">
                        <label>{t.language_label}</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as Language)}
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
                            <span className="toggle-label">{t.run_at_startup}</span>
                        </label>
                        <p className="description">
                            {t.run_at_startup_desc}
                        </p>
                    </div>

                    <div className="toggle-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={minimizeToTray}
                                onChange={(e) => setMinimizeToTray(e.target.checked)}
                            />
                            <span className="toggle-label">{t.minimize_tray}</span>
                        </label>
                        <p className="description">
                            {t.minimize_tray_desc}
                        </p>
                    </div>

                    <div className="toggle-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={autoSync}
                                onChange={(e) => setAutoSync(e.target.checked)}
                            />
                            <span className="toggle-label">{t.auto_sync}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="save-btn" onClick={handleSave}>{t.save_changes}</button>
                <button
                    className="save-btn"
                    onClick={handleSync}
                    style={{ background: '#444', color: '#fff' }}
                    disabled={!userEmail}
                >
                    {t.sync_now}
                </button>
                {statusMessage && <span className="status-msg">{statusMessage}</span>}
            </div>
        </div>
    );
};

export default SettingsView;
