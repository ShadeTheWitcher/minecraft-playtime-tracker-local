import './Sidebar.css'

interface SidebarProps {
    games: { id: string; name: string; totalTime: number }[];
    activeGameId: string;
    isPlaying: boolean;
    selectedGameId: string;
    onSelectGame: (id: string) => void;
    onAddGame: () => void;
}

export function Sidebar({ games, activeGameId, isPlaying, selectedGameId, onSelectGame, onAddGame }: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                LIBRARY
            </div>

            <div className="game-list">
                {games.map(game => (
                    <div
                        key={game.id}
                        className={`game-item ${selectedGameId === game.id ? 'selected' : ''}`}
                        onClick={() => onSelectGame(game.id)}
                    >
                        <div className="game-name">
                            {game.name}
                        </div>
                        {activeGameId === game.id && isPlaying && <span className="running-indicator">RUNNING</span>}
                    </div>
                ))}
            </div>

            <button className="add-game-btn" onClick={onAddGame}>
                + ADD GAME
            </button>
        </aside>
    )
}
