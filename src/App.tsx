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
    activeGameId: 'minecraft',
    gameName: 'Minecraft',
    games: []
  })

  const [selectedGameId, setSelectedGameId] = useState<string>('minecraft')
  const [viewMode, setViewMode] = useState<'details' | 'add'>('details')

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-state', (_event: any, newState: AppState) => {
        setState(prev => ({ ...prev, ...newState }));
      })
    }
  }, [])

  // Find metadata for the selected game
  const selectedGameMeta = state.games.find(g => g.id === selectedGameId)

  // Debug Log
  useEffect(() => {
    console.log('Selected Game Meta:', selectedGameMeta)
    console.log('Full Games List:', state.games)
  }, [selectedGameMeta, state.games])

  // Check if the selected game is ALSO the one currently running
  const isSelectedGameRunning = state.isPlaying && state.activeGameId === selectedGameId

  const handleSelectGame = (id: string) => {
    setSelectedGameId(id)
    setViewMode('details')
  }

  const handleAddGame = () => {
    setViewMode('add')
  }

  return (
    <div className="app-layout">
      <Sidebar
        games={state.games}
        activeGameId={state.activeGameId}
        isPlaying={state.isPlaying}
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
