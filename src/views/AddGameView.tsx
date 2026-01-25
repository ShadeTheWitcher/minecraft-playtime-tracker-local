import { useState } from 'react'
import '../App.css'
import { getTranslation, type Language } from '../lib/translations'

interface AddGameViewProps {
    availablePresets?: { id: string; name: string; processNames: string[] }[];
    language: Language;
}

export function AddGameView({ availablePresets, language }: AddGameViewProps) {
    const [name, setName] = useState('')
    const [processName, setProcessName] = useState('')
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [showPresetsModal, setShowPresetsModal] = useState(false)
    const t = getTranslation(language);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!name || !processName) return

        if (window.ipcRenderer) {
            console.log('Sending add-game IPC:', { name, processName })
            window.ipcRenderer.send('add-game', { name, processName })
            setStatus('success')
            setName('')
            setProcessName('')

            // Allow adding another one quickly
            setTimeout(() => setStatus('idle'), 2000)
        } else {
            console.error('IPC not available')
            setStatus('error')
        }
    }

    const handlePickFile = async () => {
        if (window.ipcRenderer) {
            const result = await window.ipcRenderer.invoke('game:pick-file')
            if (result) {
                setProcessName(result.basename)
                if (!name) {
                    setName(result.nameSuggestion)
                }
            }
        }
    }

    const handleAddPreset = (id: string) => {
        if (window.ipcRenderer) {
            window.ipcRenderer.send('add-preset-game', id)
            setShowPresetsModal(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>

            {/* Presets Modal Overlay */}
            {showPresetsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setShowPresetsModal(false)}>
                    <div className="pixel-card" style={{
                        maxWidth: '500px',
                        width: '90%',
                        background: '#1a1a1a',
                        border: '2px solid #55aa55'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#55aa55', textAlign: 'center' }}>
                            {t.preset_lib_title}
                        </h2>

                        {availablePresets && availablePresets.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {availablePresets.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleAddPreset(preset.id)}
                                        className="nav-btn"
                                        style={{
                                            background: '#222',
                                            padding: '12px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            fontSize: '0.85rem',
                                            border: '2px solid #333'
                                        }}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                                {t.all_presets_added}
                            </p>
                        )}

                        <button
                            className="nav-btn"
                            style={{ marginTop: '20px', width: '100%', background: '#444' }}
                            onClick={() => setShowPresetsModal(false)}
                        >
                            {t.close}
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="title" style={{ fontSize: '1.2rem', margin: 0 }}>{t.add_new_game}</h2>
            </div>

            {/* Form Section */}
            <div className="pixel-card">
                <h3 className="title" style={{ fontSize: '0.8rem', marginBottom: '1.5rem', opacity: 0.7 }}>{t.create_custom_game}</h3>
                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ color: '#4cd964' }}>{t.success}</h3>
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>{t.game_added}</p>
                        <button
                            className="nav-btn"
                            onClick={() => setStatus('idle')}
                            style={{ marginTop: '10px', fontSize: '0.6rem' }}
                        >
                            {t.add_another}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="stat-label">{t.game_name}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Terraria"
                                style={{ background: '#222', border: '2px solid #000', color: '#fff', padding: '10px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="stat-label">{t.process_name}</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={processName}
                                    onChange={(e) => setProcessName(e.target.value)}
                                    placeholder="e.g. Terraria.exe"
                                    style={{ flex: 1, background: '#222', border: '2px solid #000', color: '#fff', padding: '10px', fontFamily: 'inherit' }}
                                />
                                <button
                                    type="button"
                                    onClick={handlePickFile}
                                    className="nav-btn"
                                    style={{ background: '#444', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                                >
                                    {t.search_exe}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.6rem', color: '#666', margin: '2px 0 0 0' }}>
                                {t.hint_exe}
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="nav-btn"
                            style={{ marginTop: '1rem', background: '#4cd964', color: '#000' }}
                        >
                            {t.add_custom_btn}
                        </button>
                    </form>
                )}
            </div>

            {/* Recommendations Trigger Section (Replacing 'Configured Games') */}
            <div className="pixel-card" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'center',
                background: 'rgba(85, 170, 85, 0.05)',
                border: '2px dashed rgba(85, 170, 85, 0.3)'
            }}>
                <div>
                    <h3 className="title" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#55aa55' }}>{t.dont_want_type}</h3>
                    <p style={{ fontSize: '0.7rem', color: '#aaa', margin: 0 }}>
                        {t.presets_desc}
                    </p>
                </div>
                <button
                    onClick={() => setShowPresetsModal(true)}
                    className="nav-btn"
                    style={{
                        background: '#55aa55',
                        color: '#fff',
                        fontSize: '0.8rem',
                        padding: '12px 25px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {t.open_preset_lib}
                </button>
            </div>
        </div>
    )
}
