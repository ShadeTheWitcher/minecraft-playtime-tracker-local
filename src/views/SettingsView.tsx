import React, { useState, useEffect } from 'react';
import './SettingsView.css';
import { getTranslation, type Language } from '../lib/translations';

interface SettingsViewProps {
    userEmail: string | undefined;
    currentLanguage: Language;
    version?: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ userEmail, currentLanguage, version }) => {
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
                setLanguage((settings.language as Language) || 'es');
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

    const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'updates'>('profile');
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<{ isNew: boolean, version: string, url: string, current: string } | null>(null);

    const handleCheckUpdates = async () => {
        setIsCheckingUpdates(true);
        setUpdateInfo(null);
        try {
            const result = await (window as any).electronAPI.checkUpdates();
            if (result && !result.error) {
                setUpdateInfo(result);
            } else {
                setStatusMessage(t.update_error);
                setTimeout(() => setStatusMessage(''), 3000);
            }
        } catch (e) {
            setStatusMessage(t.update_error);
            setTimeout(() => setStatusMessage(''), 3000);
        } finally {
            setIsCheckingUpdates(false);
        }
    };

    const handleDownload = () => {
        if (updateInfo?.url) {
            (window as any).electronAPI.openExternal(updateInfo.url);
        }
    };

    return (
        <div className="settings-container">
            <h1>{t.settings_title}</h1>

            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t.profile_section}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preferences')}
                >
                    {t.preferences_section}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('updates')}
                >
                    {t.updates_section}
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'profile' && (
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
                )}

                {activeTab === 'preferences' && (
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
                )}

                {activeTab === 'updates' && (
                    <div className="settings-section update-section">
                        <h2>{t.updates_section}</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                    <p style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                                        Version {version || 'v0.0.0'}
                                    </p>
                                    {updateInfo && !updateInfo.isNew && (
                                        <span style={{ fontSize: '0.9rem', color: '#4cd964', fontWeight: 'bold' }}>
                                            ✓ {t.up_to_date}
                                        </span>
                                    )}
                                </div>
                                {updateInfo?.isNew && (
                                    <p style={{ margin: '12px 0 0 0', fontSize: '1rem', color: '#ffcc00', fontWeight: 'bold' }}>
                                        ⚠ {t.new_version_available(updateInfo.version)}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="save-btn"
                                    style={{ background: '#444', minWidth: '150px', fontSize: '0.9rem', padding: '10px 20px' }}
                                    onClick={handleCheckUpdates}
                                    disabled={isCheckingUpdates}
                                >
                                    {isCheckingUpdates ? t.checking_updates : t.check_updates}
                                </button>
                            </div>
                        </div>

                        {updateInfo?.isNew && (
                            <button
                                className="save-btn"
                                style={{ width: '100%', marginTop: '20px', background: '#4cd964', color: '#000' }}
                                onClick={handleDownload}
                            >
                                {t.visit_github}
                            </button>
                        )}
                    </div>
                )}
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
