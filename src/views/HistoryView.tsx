import '../App.css'
import type { HistoryItem } from '../types'
import { getTranslation, type Language } from '../lib/translations'

interface HistoryViewProps {
    history: HistoryItem[];
    formatTime: (seconds: number) => string;
    gameName: string;
    language: Language;
}

export function HistoryView({ history, formatTime, gameName, language }: HistoryViewProps) {
    const t = getTranslation(language);

    return (
        <div className="pixel-card" style={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}>
            <h2 className="title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                {language === 'es' ? `HISTORIAL DE ${gameName.toUpperCase()}` : `${gameName} History`}
            </h2>

            {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    <p>{t.no_history}</p>
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #444', color: '#888' }}>
                            <th style={{ textAlign: 'left', padding: '10px' }}>{language === 'es' ? 'FECHA' : 'DATE'}</th>
                            <th style={{ textAlign: 'right', padding: '10px' }}>{language === 'es' ? 'DURACIÓN' : 'DURATION'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '10px', textAlign: 'left' }}>
                                    {new Date(item.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')} {new Date(item.date).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right', color: '#55aa55' }}>
                                    {formatTime(item.duration)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
