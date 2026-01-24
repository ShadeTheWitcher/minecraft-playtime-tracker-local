import { useState } from 'react'
import '../App.css'

export function AddGameView() {
    const [name, setName] = useState('')
    const [processName, setProcessName] = useState('')
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!name || !processName) return

        if (window.ipcRenderer) {
            window.ipcRenderer.send('add-game', { name, processName })
            setStatus('success')
            setName('')
            setProcessName('')

            setTimeout(() => setStatus('idle'), 3000)
        } else {
            setStatus('error')
        }
    }

    return (
        <div className="pixel-card">
            <h2 className="title" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Add New Game</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="stat-label">Game Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Terraria"
                        style={{
                            background: '#222',
                            border: '2px solid #000',
                            color: '#fff',
                            padding: '10px',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="stat-label">Process Name (.exe)</label>
                    <input
                        type="text"
                        value={processName}
                        onChange={(e) => setProcessName(e.target.value)}
                        placeholder="e.g. Terraria.exe"
                        style={{
                            background: '#222',
                            border: '2px solid #000',
                            color: '#fff',
                            padding: '10px',
                            fontFamily: 'inherit'
                        }}
                    />
                    <small style={{ color: '#666', fontSize: '0.6rem' }}>
                        Open Task Manager to find the exact process name details.
                    </small>
                </div>

                <button
                    type="submit"
                    className="nav-btn"
                    style={{ marginTop: '1rem', background: '#4cd964', color: '#000' }}
                >
                    ADD GAME
                </button>

                {status === 'success' && (
                    <div style={{ color: '#4cd964', textAlign: 'center', fontSize: '0.8rem' }}>
                        Game Added! Detection started.
                    </div>
                )}
            </form>
        </div>
    )
}
