import { useState } from 'react'
import '../App.css'

interface AddGameViewProps {
    games: { id: string; name: string; totalTime: number }[];
}

export function AddGameView({ games }: AddGameViewProps) {
    const [name, setName] = useState('')
    const [processName, setProcessName] = useState('')
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Form Section */}
            <div className="pixel-card">
                <h2 className="title" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Add New Game</h2>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ color: '#4cd964' }}>SUCCESS!</h3>
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>Request sent to core.</p>
                        <button
                            className="nav-btn"
                            onClick={() => setStatus('idle')}
                            style={{ marginTop: '10px', fontSize: '0.6rem' }}
                        >
                            Add Another
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="stat-label">Game Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Terraria"
                                style={{ background: '#222', border: '2px solid #000', color: '#fff', padding: '10px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="stat-label">Process Name (.exe)</label>
                            <input
                                type="text"
                                value={processName}
                                onChange={(e) => setProcessName(e.target.value)}
                                placeholder="e.g. Terraria.exe"
                                style={{ background: '#222', border: '2px solid #000', color: '#fff', padding: '10px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="nav-btn"
                            style={{ marginTop: '1rem', background: '#4cd964', color: '#000' }}
                        >
                            ADD GAME
                        </button>
                    </form>
                )}
            </div>

            {/* List Section */}
            <div className="pixel-card">
                <h3 className="title" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                    Configured Games ({games ? games.length : 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {games && games.map(game => (
                        <div key={game.id} style={{
                            padding: '10px',
                            background: '#222',
                            border: '2px solid #000',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.7rem'
                        }}>
                            <span style={{ color: '#fff' }}>{game.name}</span>
                            <span style={{ color: '#666', fontSize: '0.6rem', fontFamily: 'monospace' }}>{game.id}</span>
                        </div>
                    ))}
                    {(!games || games.length === 0) && (
                        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.7rem' }}>No games found.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
