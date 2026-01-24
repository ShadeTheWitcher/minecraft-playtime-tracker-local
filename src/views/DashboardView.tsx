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
        </>
    )
}
