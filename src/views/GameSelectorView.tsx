import '../App.css'

interface GameSelectorViewProps {
    activeGameId: string;
    onSelectGame: (gameId: string) => void;
}

export function GameSelectorView({ activeGameId, onSelectGame }: GameSelectorViewProps) {
    const games = [
        { id: 'minecraft', name: 'Minecraft', icon: '⛏️' },
        { id: 'hytale', name: 'Hytale', icon: '🗡️' }
    ]

    return (
        <div className="pixel-card" style={{ width: '100%' }}>
            <h2 className="title" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Select Game</h2>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                {games.map(game => (
                    <button
                        key={game.id}
                        onClick={() => onSelectGame(game.id)}
                        className={`pixel-card`}
                        style={{
                            cursor: 'pointer',
                            backgroundColor: activeGameId === game.id ? '#55aa55' : '#333',
                            border: activeGameId === game.id ? '2px solid #fff' : '2px solid #000',
                            color: activeGameId === game.id ? '#fff' : '#aaa',
                            textAlign: 'center',
                            padding: '1.5rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>{game.icon}</span>
                        <span style={{ fontSize: '0.8rem' }}>{game.name}</span>
                        {activeGameId === game.id && <span style={{ fontSize: '0.6rem', marginTop: '5px' }}>[ACTIVE]</span>}
                    </button>
                ))}
            </div>
        </div>
    )
}
