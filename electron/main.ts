import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import util from 'util'
import { randomUUID } from 'crypto'
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
        gameDefinitions: defaultGames,
        settings: {
            autoSync: true,
            displayName: ''
        }
    }
})

// State

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
let isOnline = true

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
    if (url && key) {
        if (!supabase) {
            try {
                supabase = createClient(url, key)
                console.log('[Auth] Supabase client initialized in Main process')
            } catch (e) {
                console.error('[Auth] Failed to init Supabase:', e)
            }
        }
    } else {
        console.warn('[Auth] Received empty Supabase URL or Key via IPC')
    }
})

ipcMain.on('auth:session', async (_event, session) => {
    if (supabase && session) {
        console.log('[Auth] Received session for:', session.user.email)
        currentUser = session.user

        // Authenticate the Main Process Client!
        try {
            const { error } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token
            })

            if (error) {
                // Suppress scary "fetch failed" logs if it's just offline
                if (error.message && (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND'))) {
                    console.log('[Auth] Offline mode: Could not authenticate with Supabase.')
                    isOnline = false
                } else {
                    console.error('[Auth] Failed to set session in Main:', error)
                    isOnline = false
                }
            } else {
                console.log('[Auth] Main process authenticated successfully')
                isOnline = true
                // Trigger sync now that we are authenticated
                await syncWithSupabase()
            }
        } catch (e: any) {
            if (e.cause && e.cause.code === 'ENOTFOUND') {
                console.log('[Auth] Offline mode: Network unavailable.')
            } else {
                console.error('[Auth] Unexpected error setting session:', e)
            }
        }
    }
})

ipcMain.on('auth:logout', async () => {
    console.log('[Auth] User logged out')
    currentUser = null
    if (supabase) {
        await supabase.auth.signOut()
    }
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

ipcMain.handle('settings:get', () => {
    return store.get('settings') || {}
})

ipcMain.handle('settings:set', (_event, newSettings) => {
    const current = store.get('settings') as any || {}
    const updated = { ...current, ...newSettings }
    store.set('settings', updated)
    console.log('[Settings] Updated:', updated)
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
                    const sessionId = randomUUID()
                    const gameData = store.get(`games.${activeGameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
                    gameData.totalPlaytime = (gameData.totalPlaytime || 0) + seconds
                    gameData.lastSession = seconds
                    gameData.history = gameData.history || []

                    const sessionEntry = {
                        id: sessionId,
                        date: new Date().toISOString(),
                        duration: seconds,
                        synced: false // Delta Sync Flag
                    }
                    gameData.history.push(sessionEntry)

                    store.set(`games.${activeGameId}`, gameData)

                    // Attempt Sync (Check Auto-Sync Preference)
                    const settings = store.get('settings') as any || { autoSync: true }
                    if (currentUser && supabase && settings.autoSync !== false) {
                        syncWithSupabase()
                    } else if (currentUser && settings.autoSync === false) {
                        console.log('[Sync] Skipped (Auto-Sync Disabled)')
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

let isSyncing = false

async function syncWithSupabase() {
    if (!currentUser) {
        console.log('[Sync] Skipped: No authenticated user. Please Login.')
        return
    }
    if (!supabase) {
        console.log('[Sync] Skipped: Supabase client not initialized.')
        return
    }
    if (isSyncing) {
        console.log('[Sync] Sync already in progress, skipping.')
        return
    }
    isSyncing = true
    console.log('[Sync] Starting Delta Sync (Total Time Only)...')

    const localGames = store.get('games') as Record<string, any> || {}

    for (const [gameId, data] of Object.entries(localGames)) {
        try {
            // 1. Calculate Local Delta (Unsynced Time)
            const history = data.history || []
            // Fix: Check for !h.synced to catch both FALSE and UNDEFINED (legacy data)
            const unsyncedSessions = history.filter((h: any) => !h.synced)
            const deltaSeconds = unsyncedSessions.reduce((acc: number, curr: any) => acc + curr.duration, 0)

            console.log(`[Sync] ${gameId}: Found ${unsyncedSessions.length} unsynced sessions. Delta: +${deltaSeconds}s`)

            // 2. Fetch Remote State
            const { data: remoteGame, error: fetchError } = await supabase
                .from('games')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('identifier', gameId)
                .single()

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = Not found
                console.error(`[Sync] Failed to fetch ${gameId}:`, fetchError)
                isOnline = false // Mark offline on fetch error
                continue
            }

            // If we got here, network seems OK
            isOnline = true

            let remoteTotal = remoteGame?.total_time || 0
            const remoteLastSession = remoteGame?.last_session || 0

            // 3. PUSH: If we have new data, update Remote
            if (deltaSeconds > 0) {
                const newTotal = remoteTotal + deltaSeconds

                const { error: upsertError } = await supabase
                    .from('games')
                    .upsert({
                        user_id: currentUser.id,
                        identifier: gameId,
                        name: GAMES[gameId]?.name || gameId,
                        total_time: newTotal,
                        last_session: data.lastSession // Update last session to latest local
                    }, { onConflict: 'user_id, identifier' })

                if (upsertError) {
                    console.error(`[Sync] Failed to push update for ${gameId}:`, upsertError)
                } else {
                    console.log(`[Sync] Pushed +${deltaSeconds}s to ${gameId}. New Remote Total: ${newTotal}`)

                    // 3b. NEW: Sync History (Batch Push)
                    const entriesToPush = unsyncedSessions.map((h: any) => ({
                        id: h.id, // Local UUID
                        user_id: currentUser!.id,
                        game_identifier: gameId,
                        start_time: h.date,
                        duration: h.duration
                    }))

                    if (entriesToPush.length > 0) {
                        const { error: historyError } = await supabase
                            .from('playtime_entries')
                            .upsert(entriesToPush, { onConflict: 'id' })

                        if (historyError) console.error(`[Sync] Failed to push history for ${gameId}:`, historyError)
                        else console.log(`[Sync] Pushed ${entriesToPush.length} history entries for ${gameId}`)
                    }

                    // Mark as synced locally
                    unsyncedSessions.forEach((h: any) => h.synced = true)
                    store.set(`games.${gameId}`, data)

                    // Update our view of remoteTotal to avoid double-add or confusion below
                    remoteTotal = newTotal
                }
            }

            // 4. PULL: If Remote is somehow ahead (played on another PC), update Local Total
            // Logic: Trust the larger total.
            // CAUTION: If we just pushed, remoteTotal IS equal to local total (conceptually).
            // But if we came in with 0 delta, and remote has 1000, and we have 500, we promote to 1000.

            if (remoteTotal > data.totalPlaytime) {
                console.log(`[Sync] Remote (${remoteTotal}) > Local (${data.totalPlaytime}). Updating Local.`)
                data.totalPlaytime = remoteTotal
                // Optional: Update last session if remote seems newer? 
                // Hard to know "when" remote happened without timestamps, but total time is what matters most.
                store.set(`games.${gameId}`, data)
            }

            // 5. PULL HISTORY: Fetch recent sessions (Cross-device sync)
            // Limit to last 50 to keep it lightweight as requested.
            const { data: recentHistory, error: recentError } = await supabase
                .from('playtime_entries')
                .select('*')
                .eq('game_identifier', gameId)
                .order('start_time', { ascending: false })
                .limit(50)

            if (!recentError && recentHistory && recentHistory.length > 0) {
                const localHistory = data.history || []
                const localIds = new Set(localHistory.map((h: any) => h.id))
                let addedCount = 0

                // Merge (Remote -> Local)
                for (const remote of recentHistory) {
                    if (!localIds.has(remote.id)) {
                        localHistory.push({
                            id: remote.id,
                            date: remote.start_time,
                            duration: remote.duration,
                            synced: true // Coming from cloud, so it is synced
                        })
                        localIds.add(remote.id)
                        addedCount++
                    }
                }

                if (addedCount > 0) {
                    console.log(`[Sync] Downloaded ${addedCount} recent sessions for ${gameId}`)
                    // Re-sort
                    data.history = localHistory.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    // Limit local history too? optional. Let's keep it growing for now unless it gets huge.
                    store.set(`games.${gameId}`, data)
                }
            }


        } catch (e) {
            console.error(`[Sync] Error processing ${gameId}:`, e)
        }
    }

    isSyncing = false
    console.log('[Sync] Hybrid Sync complete (Delta + History)')
    sendStateUpdate()
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
            games: gamesList,
            isOnline: isOnline
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

        const sessionId = randomUUID()
        const gameData = store.get(`games.${activeGameId}`) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
        gameData.totalPlaytime = (gameData.totalPlaytime || 0) + seconds
        gameData.lastSession = seconds
        gameData.history = gameData.history || []

        const sessionEntry = {
            id: sessionId,
            date: new Date().toISOString(),
            duration: seconds,
            synced: false
        }
        gameData.history.push(sessionEntry)

        store.set(`games.${activeGameId}`, gameData)

        // Final Sync (Fire and forget-ish, but syncWithSupabase is async)
        if (currentUser && supabase) {
            syncWithSupabase()
        }

        console.log(`Saved final session for ${activeGameId}: ${seconds}s`)
    }
})
