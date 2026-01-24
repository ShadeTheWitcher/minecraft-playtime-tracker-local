import { useState, useEffect } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { AddGameView } from './views/AddGameView'
import { GameDetailsView } from './views/GameDetailsView'
import { AuthModal } from './components/AuthModal'
import { supabase } from './lib/supabase'
import type { AppState } from './types'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function App() {
  const [state, setState] = useState<AppState>({
    isPlaying: false,
    sessionTime: 0,
    totalTime: 0,
    lastSession: 0,
    history: [],
    activeGameId: 'minecraft',
    gameName: 'Minecraft',
    games: []
  })

  // UI State
  const [selectedGameId, setSelectedGameId] = useState<string>('minecraft')
  const [viewMode, setViewMode] = useState<'details' | 'add'>('details')
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Auth State
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Initialize Supabase in Main Process
    if (window.ipcRenderer) {
      window.ipcRenderer.send('auth:init', {
        url: import.meta.env.VITE_SUPABASE_URL,
        key: import.meta.env.VITE_SUPABASE_ANON_KEY
      })
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user && window.ipcRenderer) {
        window.ipcRenderer.send('auth:user-login', {
          id: session.user.id,
          email: session.user.email
        })
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user && window.ipcRenderer) {
        window.ipcRenderer.send('auth:user-login', {
          id: session.user.id,
          email: session.user.email
        })
      } else if (!session?.user && window.ipcRenderer) {
        window.ipcRenderer.send('auth:user-logout')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-state', (_event: any, newState: AppState) => {
        setState(prev => ({ ...prev, ...newState }));
      })
    }
  }, [])

  // Find metadata for the selected game
  const selectedGameMeta = state.games.find(g => g.id === selectedGameId)

  // Check if the selected game is ALSO the one currently running
  const isSelectedGameRunning = state.isPlaying && state.activeGameId === selectedGameId

  const handleSelectGame = (id: string) => {
    setSelectedGameId(id)
    setViewMode('details')
  }

  const handleAddGame = () => {
    setViewMode('add')
  }

  const handleLoginClick = () => {
    if (user) {
      supabase.auth.signOut()
    } else {
      setShowAuthModal(true)
    }
  }

  return (
    <div className="app-layout">
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      <Sidebar
        games={state.games}
        activeGameId={state.activeGameId}
        isPlaying={state.isPlaying}
        selectedGameId={viewMode === 'add' ? '' : selectedGameId}
        onSelectGame={handleSelectGame}
        onAddGame={handleAddGame}
        onLogin={handleLoginClick}
        userEmail={user?.email}
      />

      <main className="main-content">
        {viewMode === 'add' ? (
          <AddGameView games={state.games} />
        ) : (
          selectedGameMeta ? (
            <GameDetailsView
              gameId={selectedGameMeta.id}
              gameName={selectedGameMeta.name}
              totalTime={selectedGameMeta.totalTime} // From store (persistent)
              isRunning={isSelectedGameRunning}
              sessionTime={isSelectedGameRunning ? state.sessionTime : 0} // Live session
              lastSession={selectedGameMeta.lastSession || 0} // Stored last session
              history={selectedGameMeta.history || []} // Stored history
              formatTime={formatTime}
            />
          ) : (
            <div style={{ padding: '20px', color: '#888' }}>
              <h2>Select a game to view stats</h2>
            </div>
          )
        )}
      </main>
    </div>
  )
}

export default App
