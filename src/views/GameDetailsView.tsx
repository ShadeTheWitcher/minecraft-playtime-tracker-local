import '../App.css'
import { HistoryView } from './HistoryView'
import type { HistoryItem } from '../types'

interface GameDetailsProps {
    gameId: string;
    gameName: string;
    totalTime: number;
    isRunning: boolean;
    sessionTime: number;
    lastSession: number;
    history: HistoryItem[];
    formatTime: (seconds: number) => string;
    onEdit: () => void;
}

export function GameDetailsView({
    gameName,
    totalTime,
    isRunning,
    sessionTime,
    lastSession,
    history,
    formatTime,
    onEdit
}: GameDetailsProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
            {/* Header Banner */}
            <div style={{
                padding: '2rem',
                background: isRunning ? '#1f2e1f' : '#222',
                borderBottom: `4px solid ${isRunning ? '#4cd964' : '#000'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative' // For absolute positioning if needed
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ fontSize: '1.5rem', color: '#fff', textShadow: '2px 2px #000', margin: 0 }}>
                            {gameName}
                        </h1>
                        <button
                            onClick={onEdit}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                opacity: 0.7
                            }}
                            title="Edit Game"
                        >
                            ✏️
                        </button>
                    </div>
                    {isRunning && <span style={{ color: '#4cd964', fontSize: '0.8rem', marginTop: '10px', display: 'block' }}>• RUNNING NOW</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#aaa' }}>TOTAL PLAYTIME</div>
                    <div style={{ fontSize: '1.5rem', color: '#fff' }}>{formatTime(totalTime)}</div>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="pixel-card">
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '10px' }}>CURRENT SESSION</div>
                    <div style={{ fontSize: '1.2rem', color: isRunning ? '#4cd964' : '#666' }}>
                        {formatTime(sessionTime)}
                    </div>
                </div>
                <div className="pixel-card">
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '10px' }}>LAST SESSION</div>
                    <div style={{ fontSize: '1.2rem', color: '#fff' }}>
                        {formatTime(lastSession)}
                    </div>
                </div>
            </div>

            {/* History Section */}
            <HistoryView history={history} formatTime={formatTime} gameName={gameName} />
        </div>
    )
}
