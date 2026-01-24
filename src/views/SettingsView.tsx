import React, { useState, useEffect } from 'react';
import './SettingsView.css';

interface SettingsViewProps {
    userEmail: string | undefined;
}

const SettingsView: React.FC<SettingsViewProps> = ({ userEmail }) => {
    const [displayName, setDisplayName] = useState('');
    const [autoSync, setAutoSync] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        // Load settings on mount
        const loadSettings = async () => {
            const settings = await window.electronAPI.getSettings();
            if (settings) {
                setDisplayName(settings.displayName || '');
                setAutoSync(settings.autoSync !== undefined ? settings.autoSync : true);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        await window.electronAPI.setSettings({ displayName, autoSync });
        setStatusMessage('Settings saved!');
        setTimeout(() => setStatusMessage(''), 3000);
    };

    return (
        <div className="settings-container">
            <h1>Settings</h1>

            <div className="settings-section">
                <h2>Profile</h2>
                <div className="form-group">
                    <label>Email</label>
                    <input type="text" value={userEmail || 'Not logged in'} disabled className="readonly-input" />
                </div>
                <div className="form-group">
                    <label>Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your username"
                    />
                </div>
            </div>

            <div className="settings-section">
                <h2>Priorities</h2>
                <div className="toggle-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={autoSync}
                            onChange={(e) => setAutoSync(e.target.checked)}
                        />
                        <span className="toggle-label">Auto-Sync Data</span>
                    </label>
                    <p className="description">
                        If enabled, your playtime will be automatically uploaded to the cloud when you stop playing.
                        If disabled, you must manually click "Sync" to upload.
                    </p>
                </div>
            </div>

            <div className="settings-actions">
                <button className="save-btn" onClick={handleSave}>Save Changes</button>
                {statusMessage && <span className="status-msg">{statusMessage}</span>}
            </div>
        </div>
    );
};

export default SettingsView;
