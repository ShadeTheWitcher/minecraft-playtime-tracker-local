import React, { useState, useEffect } from 'react';
import './Sidebar.css'
import ConfirmationModal from './ConfirmationModal';

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
    isOnline = true
}: SidebarProps & { isOnline?: boolean }) {
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
                    LIBRARY
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
                            {activeGameId === game.id && isPlaying && <span className="running-indicator">RUNNING</span>}
                        </div>
                    ))}
                </div>

                <div className="sidebar-actions">
                    <button className="add-game-btn" onClick={onAddGame}>
                        + ADD GAME
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
                                        {isOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className="profile-controls">
                                <button className="icon-btn settings-btn" onClick={onSettings} title="Settings">
                                    ⚙️
                                </button>
                                <button className="icon-btn logout-btn" onClick={handleLogoutClick} title="Log Out">
                                    🚪
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="login-btn" onClick={onLogin}>
                            LOGIN / SYNC
                        </button>
                    )}
                </div>
            </aside>

            <ConfirmationModal
                isOpen={showLogoutConfirm}
                title="Log Out"
                message="Are you sure you want to log out? Syncing will stop."
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </>
    )
}
