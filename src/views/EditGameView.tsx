import React, { useState } from 'react';
import '../App.css';
import ConfirmationModal from '../components/ConfirmationModal';

interface EditGameProps {
    gameId: string;
    initialName: string;
    initialProcessNames: string[];
    onSave: (id: string, name: string, processNames: string[]) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
}

export function EditGameView({ gameId, initialName, initialProcessNames, onSave, onDelete, onCancel }: EditGameProps) {
    const [name, setName] = useState(initialName);
    const [processNames, setProcessNames] = useState(initialProcessNames.join(', '));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Split by comma and clean up
        const processes = processNames.split(',').map(p => p.trim()).filter(p => p.length > 0);
        onSave(gameId, name, processes);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', color: '#fff' }}>
            <h1>Edit Game</h1>
            <form onSubmit={handleSubmit} className="add-game-form">
                <div className="form-group">
                    <label>Game Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Minecraft"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Process Names (comma separated)</label>
                    <input
                        type="text"
                        value={processNames}
                        onChange={(e) => setProcessNames(e.target.value)}
                        placeholder="e.g. javaw.exe, minecraft.exe"
                        required
                    />
                    <small style={{ color: '#aaa', display: 'block', marginTop: '5px' }}>
                        Add multiple .exe names if the game has different launchers.
                    </small>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="submit" className="save-btn" style={{ flex: 1 }}>Save Changes</button>
                    <button type="button" onClick={onCancel} className="cancel-btn" style={{ flex: 1, background: '#444' }}>Cancel</button>
                </div>
            </form>

            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #444' }}>
                <h3 style={{ color: '#ff4444', marginBottom: '1rem' }}>Danger Zone</h3>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="cancel-btn"
                    style={{ background: '#442222', border: '1px solid #ff4444', color: '#ff4444', width: '100%', cursor: 'pointer' }}
                >
                    Delete Game
                </button>
                <small style={{ color: '#888', display: 'block', marginTop: '10px' }}>
                    This will permanently remove the game definition and its playtime history.
                </small>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={`Delete ${initialName}?`}
                message={`Are you sure you want to delete ${initialName}? All playtime history will be lost forever.`}
                onConfirm={() => onDelete(gameId)}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
}
