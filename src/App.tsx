import { useState, useEffect } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { AddGameView } from './views/AddGameView'
import { GameDetailsView } from './views/GameDetailsView'
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
    activeGameId: 'minecraft', // The one physically passing time (backend)
    gameName: 'Minecraft',
    games: []
  })

  // UI Selection State (Independent of what's running)
  const [selectedGameId, setSelectedGameId] = useState<string>('minecraft')
  const [viewMode, setViewMode] = useState<'details' | 'add'>('details')

  useEffect(() => {
    // Safety check for IPC
    if (!window.ipcRenderer) {
      console.warn('ipcRenderer Not Found - Running in Offline/Browser Mode');
    }

    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-state', (_event: any, newState: AppState) => {
        // If the backend says a game started, we might want to switch view to it?
        // For now, let's keep view independent unless it's the first load
        setState(prev => ({ ...prev, ...newState }));
      })
    }

    return () => {
      // clean up
    }
  }, [])

  // Derive data for the SELECTED game
  // Note: 'state' only holds the ACTIVE game's live stats (sessionTime).
  // 'state.games' holds the summary (totalTime).
  // History is currently only sent for the ACTIVE game. 
  // TODO: We need to fetch history for the selected game if it's not active.
  // For MVP: We will show live stats only if selected == active. 
  // Static stats (Total Time) come from state.games.

  const selectedGameMeta = state.games.find(g => g.id === selectedGameId)
  const isSelectedGameRunning = state.isPlaying && state.activeGameId === selectedGameId

  const handleSelectGame = (id: string) => {
    setSelectedGameId(id)
    setViewMode('details')
    // Optional: Request full history for this game from backend if needed
  }

  const handleAddGame = () => {
    setViewMode('add')
  }

  return (
    <div className="app-layout">
      <Sidebar
        games={state.games}
        activeGameId={state.activeGameId}
        selectedGameId={viewMode === 'add' ? '' : selectedGameId}
        onSelectGame={handleSelectGame}
        onAddGame={handleAddGame}
      />

      <main className="main-content">
        {viewMode === 'add' ? (
          <AddGameView games={state.games} />
        ) : (
          selectedGameMeta ? (
            <GameDetailsView
              gameId={selectedGameMeta.id}
              gameName={selectedGameMeta.name}
              totalTime={selectedGameMeta.totalTime}
              isRunning={isSelectedGameRunning}
              sessionTime={isSelectedGameRunning ? state.sessionTime : 0}
              lastSession={isSelectedGameRunning ? state.lastSession : 0} // Last session logic needs improvement for non-active games
              history={isSelectedGameRunning ? state.history : []} // History needs improvement
              formatTime={formatTime}
            />
          ) : (
            <div>Select a game</div>
          )
        )}
      </main>
    </div>
  )
}

export default App
