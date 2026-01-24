import { useState, useEffect } from 'react'
import './App.css'

interface AppState {
  isPlaying: boolean
  sessionTime: number
  totalTime: number
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function App() {
  const [state, setState] = useState<AppState>({ isPlaying: false, sessionTime: 0, totalTime: 0 })

  useEffect(() => {
    // Listen for state updates from main process
    window.ipcRenderer.on('app-state', (_event: any, newState: AppState) => {
      setState(newState)
    })

    // Request initial state (optional, if main sends it on load)
    return () => {
      // Cleanup
      window.ipcRenderer.off('app-state', (_event: any, newState: AppState) => { setState(newState) })
    }
  }, [])

  return (
    <div className="container">
      <h1 className="title">Minecraft Tracker</h1>

      <div className={`status-box ${state.isPlaying ? 'active' : 'inactive'}`}>
        {state.isPlaying ? 'PLAYING' : 'IDLE'}
      </div>

      <div className="timer-section">
        <h2>Session</h2>
        <div className="timer big-text">{formatTime(state.sessionTime)}</div>
      </div>

      <div className="timer-section">
        <h2>Total</h2>
        <div className="timer small-text">{formatTime(state.totalTime)}</div>
      </div>
    </div>
  )
}

export default App
