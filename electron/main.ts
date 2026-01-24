import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
// import psList from 'ps-list' // Removed due to packaging issues
import { exec } from 'child_process'
import util from 'util'
import Store from 'electron-store'

const execAsync = util.promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Defines
const POLL_INTERVAL = 1000 // 1 second
const MINECRAFT_PROCESS_NAMES = ['javaw.exe', 'java.exe', 'Minecraft.exe', 'bedrock_server.exe', 'MinecraftWindows.exe']

// Store setup
const store = new Store({
    defaults: {
        totalPlaytime: 0,
        lastSession: 0,
        history: []
    }
})

// State
let isMinecraftRunning = false
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
        width: 600,
        height: 600, // Adjusted height for DevTools visibility
        autoHideMenuBar: true,
        backgroundColor: '#2c2c2c',
        resizable: true, // Allow resizing for debugging
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

    // Minimize to tray behavior
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

async function checkProcess() {
    try {
        // Use tasklist command on Windows which is built-in
        const { stdout } = await execAsync('tasklist /FO CSV /NH')
        // stdout contains "Process Name","PID",...
        // Parse CSV-like output
        const processes = stdout.split('\r\n')
            .map((line: string) => {
                const parts = line.split(',')
                if (parts.length > 0) {
                    // Remove quotes
                    return parts[0].replace(/^"|"$/g, '')
                }
                return ''
            })
            .filter((p: string) => p)

        const uniqueNames = new Set(processes)
        const found = MINECRAFT_PROCESS_NAMES.some(name => uniqueNames.has(name))

        if (found && !isMinecraftRunning) {
            // Game started
            isMinecraftRunning = true
            sessionStartTime = Date.now()
            console.log('Minecraft started')
        } else if (!found && isMinecraftRunning) {
            // Game stopped
            isMinecraftRunning = false
            if (sessionStartTime) {
                const duration = Date.now() - sessionStartTime
                const seconds = Math.floor(duration / 1000)

                const currentTotal = store.get('totalPlaytime') as number
                store.set('totalPlaytime', currentTotal + seconds)
                store.set('lastSession', seconds)

                const history = store.get('history') as any[]
                history.push({ date: new Date().toISOString(), duration: seconds })
                store.set('history', history)

                sessionStartTime = null
                sessionPlaytime = 0
                console.log(`Minecraft stopped. Session: ${seconds}s`)
            }
        }

        if (isMinecraftRunning && sessionStartTime) {
            sessionPlaytime = Math.floor((Date.now() - sessionStartTime) / 1000)
        }

        sendStateUpdate()

    } catch (error) {
        console.error('Error checking processes:', error)
    }
}

function sendStateUpdate() {
    if (win) {
        win.webContents.send('app-state', {
            isPlaying: isMinecraftRunning,
            sessionTime: sessionPlaytime,
            totalTime: store.get('totalPlaytime')
        })
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Do not quit, as we have tray support
        // app.quit() 
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
    isQuitting = true // Ensure close event allows quit
    if (pollInterval) clearInterval(pollInterval)
})
