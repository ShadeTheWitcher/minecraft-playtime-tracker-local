import './Navbar.css'

interface NavbarProps {
    activeTab: 'dashboard' | 'history' | 'games';
    onTabChange: (tab: 'dashboard' | 'history' | 'games') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
    return (
        <nav className="navbar">
            <button
                className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('dashboard')}
            >
                ACTIVITY
            </button>
            <button
                className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => onTabChange('history')}
            >
                HISTORY
            </button>
            <button
                className={`nav-btn ${activeTab === 'games' ? 'active' : ''}`}
                onClick={() => onTabChange('games')}
            >
                GAMES
            </button>
        </nav>
    )
}
