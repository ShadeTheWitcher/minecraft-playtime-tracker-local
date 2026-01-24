import '../App.css'
import type { AppState } from '../types'

interface DashboardViewProps {
    state: AppState;
    formatTime: (seconds: number) => string;
}

export function DashboardView({ state, formatTime }: DashboardViewProps) {
    return (
        <>
            {/* Hero Status Card */}
            <div className={`pixel-card status-card ${state.isPlaying ? 'active' : 'inactive'}`}>
                {state.isPlaying
                    ? `${(state.gameName || 'Unknown').toUpperCase()} RUNNING`
                    : `WAITING FOR ${(state.gameName || 'Game').toUpperCase()}...`}
            </div>

            {/* Main Dashboard Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="pixel-card">
                    <div className="stats-grid">
                        {/* Current Session - Big */}
                        <div className="stat-item full-width">
                            <span className="stat-label">Current Session</span>
                            <span className="stat-value big">{formatTime(state.sessionTime)}</span>
                        </div>

                        {/* Last Session */}
                        <div className="stat-item">
                            <span className="stat-label">Last Session</span>
                            <span className="stat-value">{formatTime(state.lastSession)}</span>
                        </div>

                        {/* Total Time */}
                        <div className="stat-item">
                            <span className="stat-label">Total Time</span>
                            <span className="stat-value">{formatTime(state.totalTime)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Col: Monitored Games List */}
                <div className="pixel-card">
                    <h3 className="title" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Monitored Games</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {state.games && state.games.map(game => (
                            <div
                                key={game.id}
                                style={{
                                    padding: '10px',
                                    background: state.activeGameId === game.id ? '#55aa55' : '#222',
                                    border: '2px solid #000',
                                    color: state.activeGameId === game.id ? '#fff' : '#aaa',
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>{game.name}</span>
                                {state.activeGameId === game.id && <span>★</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
