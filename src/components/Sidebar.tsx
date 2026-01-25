import { useState } from 'react';
import './Sidebar.css'
import ConfirmationModal from './ConfirmationModal';
import { getTranslation, type Language } from '../lib/translations';

interface SidebarProps {
    games: { id: string; name: string; totalTime: number }[];
    activeGameId: string;
    isPlaying: boolean;
    selectedGameId: string;
    onSelectGame: (id: string) => void;
    onAddGame: () => void;
    onLogin: () => void;
    onLogout: () => void;
    onSettings: () => void;
    userEmail: string | null;
    displayName: string;
    isOnline?: boolean;
    isConfigured?: boolean;
    language: Language;
}

export function Sidebar({
    games,
    activeGameId,
    isPlaying,
    selectedGameId,
    onSelectGame,
    onAddGame,
    onLogin,
    onLogout,
    onSettings,
    userEmail,
    displayName,
    isOnline = true,
    isConfigured = true,
    language
}: SidebarProps) {
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const t = getTranslation(language);

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        onLogout();
        setShowLogoutConfirm(false);
    };

    const getInitials = () => {
        if (displayName) return displayName.slice(0, 2).toUpperCase();
        if (userEmail) return userEmail.slice(0, 2).toUpperCase();
        return '?';
    };

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-header">
                    {t.library}
                </div>

                <div className="game-list">
                    {games.map(game => (
                        <div
                            key={game.id}
                            className={`game-item ${selectedGameId === game.id ? 'selected' : ''}`}
                            onClick={() => onSelectGame(game.id)}
                        >
                            <div className="game-name">
                                {game.name}
                            </div>
                            {activeGameId === game.id && isPlaying && <span className="running-indicator">{t.running}</span>}
                        </div>
                    ))}
                </div>

                <div className="sidebar-actions">
                    <button className="add-game-btn" onClick={onAddGame}>
                        {t.add_game}
                    </button>
                </div>

                <div className="sidebar-footer">
                    {userEmail ? (
                        <div className="user-profile">
                            <div className="profile-info">
                                <div className="avatar">{getInitials()}</div>
                                <div className="user-details">
                                    <span className="display-name">{displayName || userEmail.split('@')[0]}</span>
                                    <span
                                        className="user-status"
                                        style={{ color: isOnline ? '#4caf50' : '#757575' }}
                                    >
                                        {isOnline ? t.online : t.offline}
                                    </span>
                                </div>
                            </div>
                            <div className="profile-controls">
                                <button className="icon-btn settings-btn" onClick={onSettings} title={t.settings}>
                                    ⚙️
                                </button>
                                <button className="icon-btn logout-btn" onClick={handleLogoutClick} title={t.logout}>
                                    🚪
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                            <button
                                className={`login-btn ${!isConfigured ? 'disabled' : ''}`}
                                onClick={isConfigured ? onLogin : undefined}
                                title={!isConfigured ? t.setup_desc : t.login_sync}
                                style={{ flex: 1, ...(!isConfigured ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#555' } : {}) }}
                            >
                                {!isConfigured ? t.setup_required : t.login_sync}
                            </button>
                            <button
                                className="icon-btn settings-btn"
                                onClick={onSettings}
                                title={t.settings}
                                style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', border: 'none', cursor: 'pointer', color: '#aaa' }}
                            >
                                ⚙️
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            <ConfirmationModal
                isOpen={showLogoutConfirm}
                title={t.logout_confirm_title}
                message={t.logout_confirm_msg}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutConfirm(false)}
                confirmLabel={t.confirm}
                cancelLabel={t.cancel_btn}
            />
        </>
    )
}
