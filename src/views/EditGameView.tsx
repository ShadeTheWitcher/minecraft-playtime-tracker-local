import React, { useState } from 'react';
import '../App.css';
import ConfirmationModal from '../components/ConfirmationModal';
import { getTranslation, type Language } from '../lib/translations';

interface EditGameProps {
    gameId: string;
    initialName: string;
    initialProcessNames: string[];
    onSave: (id: string, name: string, processNames: string[]) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
    language: Language;
}

export function EditGameView({ gameId, initialName, initialProcessNames, onSave, onDelete, onCancel, language }: EditGameProps) {
    const [name, setName] = useState(initialName);
    const [processNames, setProcessNames] = useState(initialProcessNames.join(', '));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const t = getTranslation(language);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Split by comma and clean up
        const processes = processNames.split(',').map(p => p.trim()).filter(p => p.length > 0);
        onSave(gameId, name, processes);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', color: '#fff' }}>
            <h1>{t.edit_game_title}</h1>
            <form onSubmit={handleSubmit} className="add-game-form">
                <div className="form-group">
                    <label>{t.game_name}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Minecraft"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>{t.process_names_label}</label>
                    <input
                        type="text"
                        value={processNames}
                        onChange={(e) => setProcessNames(e.target.value)}
                        placeholder="e.g. javaw.exe, minecraft.exe"
                        required
                    />
                    <small style={{ color: '#aaa', display: 'block', marginTop: '5px' }}>
                        {t.process_names_hint}
                    </small>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="submit" className="save-btn" style={{ flex: 1 }}>{t.save_changes}</button>
                    <button type="button" onClick={onCancel} className="cancel-btn" style={{ flex: 1, background: '#444' }}>{t.cancel}</button>
                </div>
            </form>

            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #444' }}>
                <h3 style={{ color: '#ff4444', marginBottom: '1rem' }}>{t.danger_zone}</h3>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="cancel-btn"
                    style={{ background: '#442222', border: '1px solid #ff4444', color: '#ff4444', width: '100%', cursor: 'pointer' }}
                >
                    {t.delete_game_btn}
                </button>
                <small style={{ color: '#888', display: 'block', marginTop: '10px' }}>
                    {t.delete_game_hint}
                </small>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={t.delete_confirm_title(initialName)}
                message={t.delete_confirm_msg(initialName)}
                onConfirm={() => onDelete(gameId)}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmLabel={t.confirm}
                cancelLabel={t.cancel_btn}
            />
        </div>
    );
}
