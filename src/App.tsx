import { useState, useEffect } from 'react'
import './App.css'
import { Navbar } from './components/Navbar'
import { DashboardView } from './views/DashboardView'
import { HistoryView } from './views/HistoryView'
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
    gameName: 'Minecraft'
  })
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard')

  useEffect(() => {
    // Safety check for IPC
    if (!window.ipcRenderer) {
      console.warn('ipcRenderer Not Found - Running in Offline/Browser Mode');
    }

    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-state', (_event: any, newState: AppState) => {
        const safeState = {
          isPlaying: newState.isPlaying || false,
          sessionTime: newState.sessionTime || 0,
          totalTime: newState.totalTime || 0,
          lastSession: newState.lastSession || 0,
          history: newState.history || [],
          activeGameId: newState.activeGameId || 'minecraft',
          gameName: newState.gameName || 'Minecraft'
        }
        setState(safeState)
      })
    }

    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.off('app-state', (_event: any, newState: AppState) => { setState(newState) })
      }
    }
  }, [])

  // Pre-render check to ensure components don't crash on mounting
  if (!state) return <div>Loading State...</div>

  return (
    <div className="container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <DashboardView state={state} formatTime={formatTime} />
      )}

      {activeTab === 'history' && (
        <HistoryView history={state.history} formatTime={formatTime} />
      )}
    </div>
  )
}

export default App
