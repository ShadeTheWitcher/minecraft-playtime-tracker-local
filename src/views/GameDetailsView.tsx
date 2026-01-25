import '../App.css'
import { HistoryView } from './HistoryView'
import type { HistoryItem } from '../types'
import { getTranslation, type Language } from '../lib/translations'

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
    language: Language;
}

export function GameDetailsView({
    gameName,
    totalTime,
    isRunning,
    sessionTime,
    lastSession,
    history,
    formatTime,
    onEdit,
    language
}: GameDetailsProps) {
    const t = getTranslation(language);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', paddingRight: '20px' }}>
            {/* Header Banner */}
            <div style={{
                padding: '3rem',
                background: isRunning ? 'linear-gradient(90deg, #1f2e1f 0%, #222 100%)' : '#222',
                borderBottom: `4px solid ${isRunning ? '#4cd964' : '#000'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        onClick={onEdit}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.5rem', // Slightly larger
                            opacity: 0.5,
                            padding: '0', // No padding
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            color: '#aaa',
                            marginTop: '2px' // Visual alignment
                        }}
                        title={t.edit_settings}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.color = '#fff'
                            e.currentTarget.style.transform = 'rotate(45deg)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.5'
                            e.currentTarget.style.color = '#aaa'
                            e.currentTarget.style.transform = 'rotate(0deg)'
                        }}
                    >
                        ⚙️
                    </button>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', color: '#fff', textShadow: '2px 2px #000', margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>
                            {gameName}
                        </h1>
                        {isRunning && <span style={{ color: '#4cd964', fontSize: '0.9rem', marginTop: '8px', display: 'block', fontWeight: 'bold', letterSpacing: '1px' }}>
                            {t.running_now}
                        </span>}
                    </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                        {t.total_playtime}
                    </div>
                    <div style={{ fontSize: '2rem', color: '#fff' }}>{formatTime(totalTime)}</div>
                    <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '5px', textTransform: 'uppercase' }}>
                        {(() => {
                            const hours = Math.floor(totalTime / 3600)
                            const minutes = Math.floor((totalTime % 3600) / 60)

                            if (hours > 0) {
                                return t.played_hours_mins(hours, minutes)
                            }
                            return t.played_mins(minutes)
                        })()}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="pixel-card">
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '10px' }}>{t.current_session}</div>
                    <div style={{ fontSize: '1.2rem', color: isRunning ? '#4cd964' : '#666' }}>
                        {formatTime(sessionTime)}
                    </div>
                </div>
                <div className="pixel-card">
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '10px' }}>{t.last_session}</div>
                    <div style={{ fontSize: '1.2rem', color: '#fff' }}>
                        {formatTime(lastSession)}
                    </div>
                </div>
            </div>

            {/* History Section */}
            <HistoryView history={history} formatTime={formatTime} gameName={gameName} language={language} />
        </div>
    )
}
