import { useState, useEffect } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { AddGameView } from './views/AddGameView'
import { GameDetailsView } from './views/GameDetailsView'
import { EditGameView } from './views/EditGameView'
import SettingsView from './views/SettingsView'
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
  console.log('App Component Rendering')
  const [state, setState] = useState<AppState>({
    isOnline: true,
    isPlaying: false,
    sessionTime: 0,
    totalTime: 0,
    language: 'es', // Default
    runAtStartup: false,
    minimizeToTray: true,
    lastSession: 0,
    history: [],
    activeGameId: 'minecraft-java',
    gameName: 'Minecraft (Java)',
    displayName: '',
    games: [],
    availablePresets: []
  })

  // UI State
  const [selectedGameId, setSelectedGameId] = useState<string>('minecraft-java')
  const [viewMode, setViewMode] = useState<'details' | 'add' | 'settings' | 'edit'>('details')
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

    // Note: We don't need to fetch settings manually anymore,
    // because main process sends them in app-state via sendStateUpdate()

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session && window.ipcRenderer) {
        window.ipcRenderer.send('auth:session', {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user: session.user
        })
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session && window.ipcRenderer) {
        window.ipcRenderer.send('auth:session', {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user: session.user
        })
      } else if (!session && window.ipcRenderer) {
        window.ipcRenderer.send('auth:logout')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-state', (_event: any, newState: AppState) => {
        setState(prev => ({ ...prev, ...newState }));
      })

      // FORCE LOGOUT HANDLER
      window.ipcRenderer.on('auth:force-logout', async () => {
        console.warn('Backend requested force logout due to invalid session.')

        await supabase.auth.signOut()
        localStorage.clear()
        setUser(null)
        // Resetting state happens via reload mostly, but let's clear local ref too if needed
        window.location.reload()
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

  const handleSettings = () => {
    setViewMode('settings')
  }

  const handleLoginClick = () => {
    if (user) {
      supabase.auth.signOut()
    } else {
      setShowAuthModal(true)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    setUser(null)
    window.location.reload()
  }

  const handleEditGame = (id: string, name: string, processNames: string[]) => {
    // Send update to Backend
    if (window.ipcRenderer) {
      window.ipcRenderer.send('edit-game', { id, name, processNames })
    }
    setViewMode('details')
  }

  const handleDeleteGame = (id: string) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('delete-game', id)
    }
    setViewMode('details')
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
        onLogout={handleLogout}
        onSettings={handleSettings}
        userEmail={user?.email}
        displayName={state.displayName} // USE STATE.DISPLAYNAME
        isOnline={state.isOnline}
        isConfigured={!!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY}
      />

      <main className="content-area">
        {/* Conditional Rendering for Main Content */}
        {viewMode === 'add' ? (
          <AddGameView availablePresets={state.availablePresets} />
        ) : viewMode === 'settings' ? (
          <SettingsView userEmail={user?.email} currentLanguage={state.language} />
        ) : viewMode === 'edit' && selectedGameMeta ? (
          <EditGameView
            gameId={selectedGameMeta.id}
            initialName={selectedGameMeta.name}
            initialProcessNames={selectedGameMeta.processNames || []}
            onSave={handleEditGame}
            onDelete={handleDeleteGame}
            onCancel={() => setViewMode('details')}
          />
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
              onEdit={() => setViewMode('edit')}
              language={state.language}
            />
          ) : (
            <div style={{ padding: '20px', color: '#888' }}>
              <h2>Select a game to view stats</h2>
            </div>
          )
        )}
      </main>
      <div className="brand-watermark">
        createdBy ShadeTheWitcher
      </div>
    </div>
  )
}

export default App
