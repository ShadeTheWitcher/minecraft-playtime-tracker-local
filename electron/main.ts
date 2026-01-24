import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import util from 'util'
import Store from 'electron-store'

const execAsync = util.promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Defines
const POLL_INTERVAL = 1000 // 1 second

// Disable GPU Acceleration for Windows to prevent black/gray screens
app.disableHardwareAcceleration()

interface GameConfig {
    id: string;
    name: string;
    processNames: string[];
}

const GAMES: Record<string, GameConfig> = {
    minecraft: {
        id: 'minecraft',
        name: 'Minecraft',
        processNames: ['javaw.exe', 'java.exe', 'Minecraft.exe', 'bedrock_server.exe', 'MinecraftWindows.exe']
    },
    hytale: {
        id: 'hytale',
        name: 'Hytale',
        processNames: ['Hytale.exe', 'HytaleClient.exe']
    }
}

// Store setup
const store = new Store({
    defaults: {
        activeGameId: 'minecraft',
        games: {
            minecraft: { totalPlaytime: 0, lastSession: 0, history: [] },
            hytale: { totalPlaytime: 0, lastSession: 0, history: [] }
        }
    }
})

// State
let activeGameId = store.get('activeGameId') as string || 'minecraft'
let isGameRunning = false
let sessionStartTime: number | null = null
let pollInterval: NodeJS.Timeout | null = null
let sessionPlaytime = 0
let tray: Tray | null = null
let isQuitting = false

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
        width: 800,
        height: 700,
        autoHideMenuBar: true,
        backgroundColor: '#2c2c2c',
        resizable: false,
    })

    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
        sendStateUpdate()
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        win.loadFile(path.join(process.env.DIST as string, 'index.html'))
    }

    win.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault()
            win?.hide()
        }
        return false
    })
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'))
    tray = new Tray(icon)
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open Tracker', click: () => win?.show() },
        {
            label: 'Quit', click: () => {
                isQuitting = true
                app.quit()
            }
        }
    ])
    tray.setToolTip('Minecraft Tracker')
    tray.setContextMenu(contextMenu)

    tray.on('double-click', () => {
        win?.show()
    })
}

// IPC Handlers
ipcMain.on('set-active-game', (_event, gameId: string) => {
    if (GAMES[gameId]) {
        if (activeGameId !== gameId) {
            // Switch game
            activeGameId = gameId
            store.set('activeGameId', gameId)

            // Reset current session tracking
            isGameRunning = false
            sessionStartTime = null
            sessionPlaytime = 0

            console.log(`Switched to game: ${gameId}`)
            sendStateUpdate()
        }
    }
})

async function checkProcess() {
    try {
        const { stdout } = await execAsync('tasklist /FO CSV /NH')
        const processes = stdout.split('\r\n')
            .map((line: string) => {
                const parts = line.split(',')
                if (parts.length > 0) {
                    return parts[0].replace(/^"|"$/g, '')
                }
                return ''
            })
            .filter((p: string) => p)

        const uniqueNames = new Set(processes)

        // Logic:
        // 1. If game IS running, check ONLY that game to see if it stopped.
        // 2. If game IS NOT running, check ALL games to see if one started.

        if (isGameRunning) {
            const currentGame = GAMES[activeGameId]
            if (!currentGame) return

            const found = currentGame.processNames.some(name => uniqueNames.has(name))

            if (!found) {
                // Game stopped
                isGameRunning = false
                if (sessionStartTime) {
                    const duration = Date.now() - sessionStartTime
                    const seconds = Math.floor(duration / 1000)

                    // Save data
                    const gameData = store.get(`games.${activeGameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
                    gameData.totalPlaytime = (gameData.totalPlaytime || 0) + seconds
                    gameData.lastSession = seconds
                    gameData.history = gameData.history || []
                    gameData.history.push({ date: new Date().toISOString(), duration: seconds })

                    store.set(`games.${activeGameId}`, gameData)

                    sessionStartTime = null
                    sessionPlaytime = 0
                    console.log(`${currentGame.name} stopped. Session: ${seconds}s`)
                }
            } else {
                // Game still running, update session time
                if (sessionStartTime) {
                    sessionPlaytime = Math.floor((Date.now() - sessionStartTime) / 1000)
                }
            }
        } else {
            // No game running, check if ANY game started
            for (const gameId in GAMES) {
                const game = GAMES[gameId]
                const found = game.processNames.some(name => uniqueNames.has(name))

                if (found) {
                    // Found a running game! Switch to it and start tracking
                    activeGameId = gameId
                    store.set('activeGameId', gameId)

                    isGameRunning = true
                    sessionStartTime = Date.now()
                    sessionPlaytime = 0
                    console.log(`${game.name} started (Auto-Detected)`)
                    break // Stop tracking other games, one at a time
                }
            }
        }

        sendStateUpdate()

    } catch (error) {
        console.error('Error checking processes:', error)
    }
}

function sendStateUpdate() {
    if (win) {
        const gameData = store.get(`games.${activeGameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }

        win.webContents.send('app-state', {
            activeGameId: activeGameId,
            gameName: GAMES[activeGameId]?.name || 'Unknown',
            isPlaying: isGameRunning,
            sessionTime: sessionPlaytime,
            totalTime: gameData.totalPlaytime || 0,
            lastSession: gameData.lastSession || 0,
            history: (gameData.history || []).slice(-50).reverse()
        })
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    createWindow()
    createTray()
    pollInterval = setInterval(checkProcess, POLL_INTERVAL)
})

app.on('before-quit', () => {
    isQuitting = true
    if (pollInterval) clearInterval(pollInterval)
})
