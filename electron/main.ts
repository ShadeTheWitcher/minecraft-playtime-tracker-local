import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import util from 'util'
import Store from 'electron-store'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

const defaultGames: Record<string, GameConfig> = {
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
        },
        gameDefinitions: defaultGames
    }
})

// DEBUG: Inject test data if empty
const mcData = store.get('games.minecraft') as any || {}
if (!mcData.history || mcData.history.length === 0) {
    console.log('[DEBUG] Injecting test history for Minecraft')
    store.set('games.minecraft', {
        totalPlaytime: 120,
        lastSession: 60,
        history: [
            { date: new Date().toISOString(), duration: 60 },
            { date: new Date(Date.now() - 86400000).toISOString(), duration: 60 }
        ]
    })
}

// State

// Load definitions into memory
let GAMES: Record<string, GameConfig> = (store.get('gameDefinitions') as Record<string, GameConfig>) || defaultGames

// Ensure store has them if they were missing (migration)
if (!store.get('gameDefinitions')) {
    store.set('gameDefinitions', GAMES)
}

// State
let activeGameId = store.get('activeGameId') as string || 'minecraft'
let isGameRunning = false
let sessionStartTime: number | null = null
let pollInterval: NodeJS.Timeout | null = null
let sessionPlaytime = 0
let tray: Tray | null = null
let isQuitting = false

// Supabase State
let supabase: SupabaseClient | null = null
let currentUser: { id: string; email: string } | null = null

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
        width: 1100,
        height: 750,
        minWidth: 900,
        minHeight: 600,
        autoHideMenuBar: true,
        backgroundColor: '#2c2c2c',
        resizable: true,
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
ipcMain.on('auth:init', (_event, { url, key }) => {
    if (url && key && !supabase) {
        try {
            supabase = createClient(url, key)
            console.log('[Auth] Supabase client initialized in Main process')
        } catch (e) {
            console.error('[Auth] Failed to init Supabase:', e)
        }
    }
})

ipcMain.on('auth:user-login', async (_event, user) => {
    console.log('[Auth] User logged in:', user.email)
    currentUser = user
    // Trigger sync
    await syncWithSupabase()
})

ipcMain.on('auth:user-logout', () => {
    console.log('[Auth] User logged out')
    currentUser = null
})

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

ipcMain.on('add-game', (_event, { name, processName }: { name: string; processName: string }) => {
    console.log(`[IPC] Received add-game request: ${name} (${processName})`)
    const id = name.toLowerCase().replace(/\s+/g, '-')

    if (GAMES[id]) {
        console.log(`[IPC] Game ${name} already exists. ID: ${id}`)
        return
    }

    const newGame: GameConfig = {
        id,
        name,
        processNames: [processName]
    }

    // Update Memory
    GAMES[id] = newGame

    // Update Store
    store.set('gameDefinitions', GAMES)

    // Initialize stats for new game
    const gameStats = { totalPlaytime: 0, lastSession: 0, history: [] }
    store.set(`games.${id}`, gameStats)

    console.log(`[IPC] Game saved: ${name}`)
    sendStateUpdate()
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

                    // Sync to Cloud
                    if (currentUser && supabase) {
                        pushSessionToSupabase(activeGameId, duration, seconds)
                    }

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

async function pushSessionToSupabase(gameId: string, durationMs: number, seconds: number) {
    try {
        if (!currentUser || !supabase) return

        // 1. Ensure game exists in DB
        const { error: gameError } = await supabase
            .from('games')
            .upsert({
                user_id: currentUser.id,
                identifier: gameId,
                name: GAMES[gameId]?.name || gameId,
            }, { onConflict: 'user_id, identifier' })
            .select()

        if (gameError) {
            console.error('[Sync] Failed to upsert game:', gameError)
            return
        }

        // 2. Insert Playtime Entry
        const { error: entryError } = await supabase
            .from('playtime_entries')
            .insert({
                user_id: currentUser.id,
                game_identifier: gameId,
                start_time: new Date(Date.now() - durationMs).toISOString(),
                duration: seconds
            })

        if (entryError) console.error('[Sync] Failed to insert entry:', entryError)
        else console.log('[Sync] Session pushed to cloud')

    } catch (e) {
        console.error('[Sync] Error pushing session:', e)
    }
}

async function syncWithSupabase() {
    if (!currentUser || !supabase) return
    console.log('[Sync] Starting full sync...')

    try {
        // 1. Fetch all games from DB
        const { data: dbGames, error: gamesError } = await supabase
            .from('games')
            .select('*')

        if (gamesError) throw gamesError

        // 2. For each game, fetch history (playtime_entries)
        for (const dbGame of (dbGames || [])) {
            const gameId = dbGame.identifier

            // Ensure local definition exists
            if (!GAMES[gameId]) {
                GAMES[gameId] = {
                    id: gameId,
                    name: dbGame.name,
                    processNames: [] // We don't know the process name from DB!
                    // TODO: Store process names in DB? For now, user has to re-add manually to recover tracking
                }
                store.set('gameDefinitions', GAMES)
            }

            // Fetch entries
            const { data: entries, error: entriesError } = await supabase
                .from('playtime_entries')
                .select('*')
                .eq('game_identifier', gameId)
                .order('start_time', { ascending: true })

            if (entriesError) throw entriesError

            // Merge with local history
            const localData = store.get(`games.${gameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }

            // Map remote entries to local format
            const remoteHistory = entries.map((e: any) => ({
                date: e.start_time,
                duration: e.duration
            }))

            // Simple merge: Combine and remove exact duplicates (by time string)
            // A better approach would be to trust Remote as source of truth for past events?
            // Let's union them.

            const uniqueHistory = [...localData.history]
            const localDates = new Set(uniqueHistory.map((h: any) => h.date))

            for (const remote of remoteHistory) {
                // If we don't have this exact timestamp locally, add it
                // Note: ISO strings might differ slightly if generated differently. 
                // But generally safe-ish for this simple app.
                if (!localDates.has(remote.date)) {
                    uniqueHistory.push(remote)
                }
            }

            // Update Total Time
            const newTotal = uniqueHistory.reduce((acc: number, cur: any) => acc + cur.duration, 0)

            localData.history = uniqueHistory.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            localData.totalPlaytime = newTotal

            store.set(`games.${gameId}`, localData)
        }

        console.log('[Sync] Sync complete')
        sendStateUpdate()

    } catch (e) {
        console.error('[Sync] Failed to sync:', e)
    }
}

function sendStateUpdate() {
    if (win) {
        const gameData = store.get(`games.${activeGameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }

        const gamesList = Object.values(GAMES).map(g => {
            const gData = store.get(`games.${g.id}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
            return {
                id: g.id,
                name: g.name,
                totalTime: gData.totalPlaytime || 0,
                lastSession: gData.lastSession || 0,
                history: (gData.history || []).slice(-50).reverse()
            }
        })

        win.webContents.send('app-state', {
            activeGameId: activeGameId,
            gameName: GAMES[activeGameId]?.name || 'Unknown',
            isPlaying: isGameRunning,
            sessionTime: sessionPlaytime,
            totalTime: gameData.totalPlaytime || 0,
            lastSession: gameData.lastSession || 0,
            history: (gameData.history || []).slice(-50).reverse(),
            games: gamesList
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

    // Save current session if running
    if (isGameRunning && sessionStartTime) {
        const duration = Date.now() - sessionStartTime
        const seconds = Math.floor(duration / 1000)

        const gameData = store.get(`games.${activeGameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
        gameData.totalPlaytime = (gameData.totalPlaytime || 0) + seconds
        gameData.lastSession = seconds
        gameData.history = gameData.history || []
        gameData.history.push({ date: new Date().toISOString(), duration: seconds })

        store.set(`games.${activeGameId}`, gameData)

        // Final Sync
        if (currentUser && supabase) {
            // Use non-async here or try to await? 
            // Electron might kill process too fast. 
            // Best effort.
            pushSessionToSupabase(activeGameId, duration, seconds)
        }

        console.log(`Saved final session for ${activeGameId}: ${seconds}s`)
    }
})
