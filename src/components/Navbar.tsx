import './Navbar.css'

interface NavbarProps {
    activeTab: 'dashboard' | 'history';
    onTabChange: (tab: 'dashboard' | 'history') => void;
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
        </nav>
    )
}
