import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import util from 'util'
import { randomUUID } from 'crypto'
import Store from 'electron-store'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import https from 'https'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')
const CURRENT_VERSION = pkg.version
const REPO_OWNER = 'ShadeTheWitcher'
const REPO_NAME = 'minecraft-playtime-tracker-local'

const execAsync = util.promisify(exec)

function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0
        const p2 = parts2[i] || 0
        if (p1 > p2) return 1
        if (p1 < p2) return -1
    }
    return 0
}

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
    'minecraft-java': {
        id: 'minecraft-java',
        name: 'Minecraft (Java)',
        processNames: ['javaw.exe', 'java.exe', 'Minecraft.exe']
    },
    'minecraft-bedrock': {
        id: 'minecraft-bedrock',
        name: 'Minecraft (Bedrock)',
        processNames: ['bedrock_server.exe', 'Minecraft.Windows.exe']
    },
    hytale: {
        id: 'hytale',
        name: 'Hytale',
        processNames: ['Hytale.exe', 'HytaleClient.exe']
    }
}

const additionalPresets: Record<string, GameConfig> = {
    'terraria': {
        id: 'terraria',
        name: 'Terraria',
        processNames: ['Terraria.exe']
    },
    'roblox': {
        id: 'roblox',
        name: 'Roblox',
        processNames: ['RobloxPlayerBeta.exe']
    },
    'stardew-valley': {
        id: 'stardew-valley',
        name: 'Stardew Valley',
        processNames: ['Stardew Valley.exe']
    },
    'league-of-legends': {
        id: 'league-of-legends',
        name: 'League of Legends',
        processNames: ['LeagueClient.exe', 'League of Legends.exe']
    },
    'valorant': {
        id: 'valorant',
        name: 'Valorant',
        processNames: ['VALORANT-Win64-Shipping.exe']
    }
}

// Store setup
const store = new Store({
    defaults: {
        activeGameId: 'minecraft-java',
        activeUserId: 'guest',
        users: {
            guest: {
                games: {
                    'minecraft-java': { totalPlaytime: 0, lastSession: 0, history: [] },
                    'minecraft-bedrock': { totalPlaytime: 0, lastSession: 0, history: [] },
                    hytale: { totalPlaytime: 0, lastSession: 0, history: [] }
                },
                settings: {
                    autoSync: true,
                    displayName: 'Guest',
                    language: 'es',
                    runAtStartup: false,
                    minimizeToTray: true
                }
            }
        },
        gameDefinitions: defaultGames
    }
})

// MIGRATION: Move root-level 'games' and 'settings' to 'users.guest' if they exist
// MIGRATION: Move root-level 'games' and 'settings' to 'users.guest' if they exist
if (store.has('games' as any) && !store.has('users')) {
    console.log('[Migration] Moving legacy data to guest user...')
    const oldGames = store.get('games' as any)
    const oldSettings = store.get('settings' as any)

    store.set('users.guest.games', oldGames)
    store.set('users.guest.settings', oldSettings)
    store.set('activeUserId', 'guest')

    // Clean up roots
    store.delete('games' as any)
    store.delete('settings' as any)
}

// Load definitions into memory
let GAMES: Record<string, GameConfig> = (store.get('gameDefinitions') as Record<string, GameConfig>) || defaultGames

// MIGRATION: Split 'minecraft' into 'minecraft-java' and 'minecraft-bedrock'
if (GAMES.minecraft && !GAMES['minecraft-java']) {
    console.log('[Migration] Splitting legacy Minecraft into Java and Bedrock...')

    // 1. Add new definitions to Memory
    GAMES['minecraft-java'] = defaultGames['minecraft-java']
    GAMES['minecraft-bedrock'] = defaultGames['minecraft-bedrock']
    delete GAMES.minecraft

    // 2. Persist updated definitions
    store.set('gameDefinitions', GAMES)

    // 3. Migrate data for ALL users in the store
    const users = store.get('users') as Record<string, any> || {}
    for (const userId in users) {
        const userGames = users[userId].games || {}
        if (userGames.minecraft) {
            console.log(`[Migration] Moving data for user ${userId}`)
            // We move history/time to Java as it's the most likely one they used
            userGames['minecraft-java'] = JSON.parse(JSON.stringify(userGames.minecraft))
            userGames['minecraft-bedrock'] = { totalPlaytime: 0, lastSession: 0, history: [] }
            delete userGames.minecraft
        }
    }
    store.set('users', users)

    // 4. Update activeGameId if it was the old one
    if (store.get('activeGameId') === 'minecraft') {
        store.set('activeGameId', 'minecraft-java')
    }
}

// FIX: Update Bedrock process name if it exists with the old wrong name
if (GAMES.minecraft && GAMES.minecraft.processNames) {
    GAMES.minecraft.processNames = GAMES.minecraft.processNames.map(p =>
        p === 'MinecraftWindows.exe' ? 'Minecraft.Windows.exe' : p
    );
    store.set('gameDefinitions', GAMES);
}

// Helpers for User-Scoped Data
let activeUserId = store.get('activeUserId') as string || 'guest'

function getStorePath(key: string): string {
    return `users.${activeUserId}.${key}`
}

function getUserSettings(): any {
    return store.get(getStorePath('settings')) || { autoSync: true, displayName: '' }
}

function getUserGames(): Record<string, any> {
    return store.get(getStorePath('games')) as Record<string, any> || {}
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
let currentUser: { id: string; email?: string } | null = null
let isOnline = true

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC as string, 'app_icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
        width: 1200,
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
            const settings = getUserSettings()
            if (settings.minimizeToTray !== false) {
                event.preventDefault()
                win?.hide()
                return false
            }
        }
        return true
    })

    win.on('closed', () => {
        win = null
    })
}

function setActiveUser(userId: string, email?: string) {
    console.log(`[User] Switching context to: ${userId}`)
    activeUserId = userId
    store.set('activeUserId', userId)

    // Ensure user bucket exists
    if (!store.has(`users.${userId}` as any)) {
        console.log(`[User] Initializing new bucket for ${userId}`)

        let initialGames = {
            'minecraft-java': { totalPlaytime: 0, lastSession: 0, history: [] },
            'minecraft-bedrock': { totalPlaytime: 0, lastSession: 0, history: [] },
            hytale: { totalPlaytime: 0, lastSession: 0, history: [] }
        }

        // ADOPTION: If new user, try to copy Guest data if it exists and has playtime
        if (userId !== 'guest') {
            const guestGames = store.get('users.guest.games' as any) as any
            const hasData = guestGames && Object.values(guestGames).some((g: any) => (g.totalPlaytime || 0) > 0)

            if (hasData) {
                console.log('[User] Adopting Guest data for new user account...')
                initialGames = JSON.parse(JSON.stringify(guestGames))
            }
        }

        const defaultName = email ? email.split('@')[0] : (userId === 'guest' ? 'Guest' : '')

        store.set(`users.${userId}` as any, {
            games: initialGames,
            settings: {
                autoSync: true,
                displayName: defaultName,
                language: 'es',
                runAtStartup: false,
                minimizeToTray: true
            }
        })
    } else {
        // Bucket exists. Check if we need to auto-correct "Guest" name for logged-in user
        if (email) {
            const currentSettings = store.get(`users.${userId}.settings` as any) as any
            if (currentSettings && currentSettings.displayName === 'Guest') {
                console.log(`[User] Auto-correcting 'Guest' name to ${email}`)
                currentSettings.displayName = email.split('@')[0]
                store.set(`users.${userId}.settings` as any, currentSettings)
            }
        }
    }

    sendStateUpdate()
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC as string, 'app_icon.png'))
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
                // Persistent Storage for Main Process Supabase
                const mainStorage = {
                    getItem: (key: string) => store.get(`supabase_auth_${key}`) as string,
                    setItem: (key: string, value: string) => store.set(`supabase_auth_${key}`, value),
                    removeItem: (key: string) => store.delete(`supabase_auth_${key}` as any),
                }

                supabase = createClient(url, key, {
                    auth: {
                        storage: mainStorage,
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: false
                    }
                })
                console.log('[Auth] Supabase client initialized with Persistent Storage in Main')

                // Try to restore session immediately
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        console.log('[Auth] Restored session from storage for:', session.user.email)
                        currentUser = session.user
                        setActiveUser(session.user.id, session.user.email)
                        syncWithSupabase()
                    }
                })
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
        console.log('[Auth] Received/Updated session for:', session.user.email)
        currentUser = session.user

        try {
            // Check if Main Process already has a valid session to avoid redundant calls
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            // Only set if different or expired
            if (!currentSession || currentSession.access_token !== session.access_token) {
                const { error } = await supabase.auth.setSession({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token
                })

                if (error) {
                    // Suppress scary "fetch failed" logs if it's just offline
                    if (error.message && (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('Failed to fetch'))) {
                        console.log('[Auth] Offline mode: Could not sync session at this moment.')
                        isOnline = false
                    } else {
                        console.error('[Auth] Failed to set session in Main:', error)
                        // If it's a "token expired" or similar, maybe the frontend will refresh it. 
                        // We avoid calling force-logout unless it's a truly unrecoverable error.
                        if (error.status === 400 && error.message.includes('refresh_token_not_found')) {
                            console.log('[Auth] Unrecoverable session error. Requesting logout.')
                            _event.sender.send('auth:force-logout')
                        }
                    }
                } else {
                    console.log('[Auth] Main process session updated and persisted')
                    isOnline = true
                    setActiveUser(session.user.id, session.user.email)
                    await syncWithSupabase()
                }
            } else {
                // Session is already matched, just ensure user context is set
                setActiveUser(session.user.id, session.user.email)
                isOnline = true
            }
        } catch (e: any) {
            console.error('[Auth] Unexpected error during session sync:', e)
        }
    }
})

ipcMain.on('auth:logout', async () => {
    console.log('[Auth] User logged out')
    currentUser = null

    // SWITCH TO GUEST CONTEXT
    setActiveUser('guest')

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
    // STORE UPDATE: Scoped to user
    store.set(getStorePath(`games.${id}`), gameStats)

    console.log(`[IPC] Game saved: ${name}`)
    sendStateUpdate()
})

ipcMain.on('edit-game', (_event, { id, name, processNames }: { id: string; name: string; processNames: string[] }) => {
    console.log(`[IPC] Received edit-game request: ${id} -> ${name}`)

    if (!GAMES[id]) {
        console.error(`[IPC] Edit failed: Game ${id} not found`)
        return
    }

    // Update Memory
    GAMES[id].name = name
    GAMES[id].processNames = processNames

    // Update Store
    store.set('gameDefinitions', GAMES)

    // Trigger Sync to push changes to cloud (if logged in)
    if (currentUser) {
        syncWithSupabase().catch(err => console.error('[IPC] Sync after edit failed:', err))
    }

    sendStateUpdate()
})

ipcMain.handle('game:pick-file', async () => {
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
            { name: 'Executable Files', extensions: ['exe'] }
        ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        const fileName = path.basename(filePath)

        // Return both name (for label) and basename (for process tracking)
        return {
            path: filePath,
            basename: fileName,
            nameSuggestion: path.parse(fileName).name
        }
    }
    return null
})

ipcMain.on('add-preset-game', (_event, presetId: string) => {
    console.log(`[IPC] Received add-preset-game request: ${presetId}`)
    const allAvailable = { ...defaultGames, ...additionalPresets }
    const preset = allAvailable[presetId]

    if (!preset) {
        console.error(`[IPC] Preset ${presetId} not found`)
        return
    }

    if (GAMES[presetId]) {
        console.log(`[IPC] Game ${presetId} already exists`)
        return
    }

    // Update Memory
    GAMES[presetId] = JSON.parse(JSON.stringify(preset))

    // Update Store
    store.set('gameDefinitions', GAMES)

    // Initialize stats for new game (if not exists in user scoped data)
    const userPath = getStorePath(`games.${presetId}`)
    if (!store.has(userPath as any)) {
        store.set(userPath as any, { totalPlaytime: 0, lastSession: 0, history: [] })
    }

    console.log(`[IPC] Preset restored: ${preset.name}`)
    sendStateUpdate()
})

ipcMain.on('delete-game', async (_event, gameId: string) => {
    console.log(`[IPC] Received delete-game request: ${gameId}`)

    if (!GAMES[gameId]) {
        console.error(`[IPC] Delete failed: Game ${gameId} not found`)
        return
    }

    // 1. Remove from Memory
    delete GAMES[gameId]
    store.set('gameDefinitions', GAMES)

    // 2. Remove from Local Store (Scoped to current user)
    const userPath = getStorePath(`games.${gameId}`)
    store.delete(userPath as any)

    // 3. Delete from Supabase (if logged in)
    if (currentUser && supabase) {
        try {
            // Delete entries first (if any)
            const { error: historyError } = await supabase
                .from('playtime_entries')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('game_identifier', gameId)

            if (historyError) console.error('[Sync] Failed to delete history:', historyError)

            const { error: gameError } = await supabase
                .from('games')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('identifier', gameId)

            if (gameError) console.error('[Sync] Failed to delete game from cloud:', gameError)
            else console.log('[Sync] Game deleted from Supabase')
        } catch (e) {
            console.error('[Sync] Exception during remote delete:', e)
        }
    }

    // 4. Reset active game if we just deleted the running/active one
    if (activeGameId === gameId) {
        activeGameId = Object.keys(GAMES)[0] || ''
        store.set('activeGameId', activeGameId)
        isGameRunning = false
        sessionStartTime = null
        sessionPlaytime = 0
    }

    sendStateUpdate()
})

ipcMain.on('sync:trigger', async () => {
    console.log('[IPC] Manual sync triggered')
    await syncWithSupabase()
})

ipcMain.handle('settings:get', () => {
    return getUserSettings()
})

ipcMain.handle('settings:set', (_event, newSettings) => {
    // Check if updating displayName, sync to Supabase if logged in
    const current = getUserSettings()
    const updated = { ...current, ...newSettings }

    store.set(getStorePath('settings'), updated)
    console.log('[Settings] Updated:', updated)

    // Attempt profile sync
    // Attempt profile sync
    if (currentUser && newSettings.displayName && supabase) {
        supabase.from('profiles').upsert({
            id: currentUser.id,
            display_name: newSettings.displayName,
            updated_at: new Date().toISOString()
        }).then(({ error }) => {
            if (error) console.error('[Profile] Failed to sync display name:', error)
            else console.log('[Profile] Display name synced to Supabase')
        })
    }

    // Handle Startup Setting
    if (newSettings.runAtStartup !== undefined) {
        console.log(`[Settings] Setting openAtLogin to: ${newSettings.runAtStartup}`)
        app.setLoginItemSettings({
            openAtLogin: newSettings.runAtStartup,
            path: app.getPath('exe')
        })
    }
})

ipcMain.handle('app:check-updates', async () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'MinecraftPlaytimeTracker'
            }
        }

        https.get(options, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const release = JSON.parse(data)
                        const latestVersion = release.tag_name.replace('v', '')

                        // Proper semver comparison
                        const isNew = compareVersions(latestVersion, CURRENT_VERSION) > 0

                        resolve({
                            isNew,
                            version: latestVersion,
                            url: release.html_url,
                            current: CURRENT_VERSION
                        })
                    } else if (res.statusCode === 404) {
                        console.log('[Update] No releases found for this repository.')
                        resolve({ isNew: false, current: CURRENT_VERSION })
                    } else {
                        console.error('[Update] GitHub API returned status:', res.statusCode)
                        resolve({ error: 'GitHub API error' })
                    }
                } catch (e) {
                    console.error('[Update] Failed to parse GitHub API response:', e)
                    resolve({ error: 'Parse error' })
                }
            })
        }).on('error', (err) => {
            console.error('[Update] Network error while checking for updates:', err)
            resolve({ error: 'Network error' })
        })
    })
})

ipcMain.on('app:open-external', (_event, url: string) => {
    shell.openExternal(url)
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
                    // STORE: Scoped
                    const gameData = store.get(getStorePath(`games.${activeGameId}`)) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
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

                    store.set(getStorePath(`games.${activeGameId}`), gameData)

                    // Attempt Sync (Check Auto-Sync Preference)
                    const settings = getUserSettings()
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

    console.log('[Sync] Starting Delta Sync (Total Time Only)...')

    const localGames = getUserGames()

    // Ensure session is fresh before syncing
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
        console.warn('[Sync] Session invalid or expired during sync attempt.')
        isSyncing = false
        return
    }

    for (const [gameId, data] of Object.entries(localGames) as [string, any][]) {
        try {
            // 1. Calculate Local Delta (Unsynced Time)
            const history = data.history || []
            // Fix: Check for !h.synced to catch both FALSE and UNDEFINED (legacy data)
            const unsyncedSessions = history.filter((h: any) => !h.synced)
            const deltaSeconds = unsyncedSessions.reduce((acc: number, curr: any) => acc + curr.duration, 0)

            console.log(`[Sync] ${gameId}: Found ${unsyncedSessions.length} unsynced sessions. Delta: +${deltaSeconds}s`)

            // 2. Fetch Remote State
            const { data: remoteGame, error: fetchError } = await supabase!
                .from('games')
                .select('*')
                .eq('user_id', currentUser!.id)
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

            // 3. PUSH: If we have new data or local is ahead (e.g. after migration), update Remote
            if (deltaSeconds > 0 || data.totalPlaytime > remoteTotal) {
                const newTotal = Math.max(remoteTotal + deltaSeconds, data.totalPlaytime)

                const { error: upsertError } = await supabase
                    .from('games')
                    .upsert({
                        user_id: currentUser.id,
                        identifier: gameId,
                        name: GAMES[gameId]?.name || gameId,
                        process_names: GAMES[gameId]?.processNames || [],
                        total_time: newTotal,
                        last_session: data.lastSession
                    }, { onConflict: 'user_id, identifier' })

                if (upsertError) {
                    console.error(`[Sync] Failed to push update for ${gameId}:`, upsertError)
                } else {
                    console.log(`[Sync] Pushed update for ${gameId}. New Remote Total: ${newTotal}`)

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
                    store.set(getStorePath(`games.${gameId}`), data)

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
                store.set(getStorePath(`games.${gameId}`), data)
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
                    store.set(getStorePath(`games.${gameId}`), data)
                }
            }
        } catch (err) {
            console.error(`[Sync] Error processing game ${gameId}:`, err)
        }
    }

    // 6. DISCOVERY: Pull new games from Cloud that we don't have locally
    try {
        const { data: allRemoteGames, error: discoveryError } = await supabase!
            .from('games')
            .select('*')
            .eq('user_id', currentUser!.id)

        if (!discoveryError && allRemoteGames) {
            let discoveredCount = 0
            for (const remoteGame of allRemoteGames) {
                // LEGACY CLEANUP: If we find the old 'minecraft' ID in the cloud
                if (remoteGame.identifier === 'minecraft') {
                    console.log('[Sync] Found legacy minecraft in cloud. Migrating and cleaning up...')

                    // 1. Move time to Java
                    const javaData = store.get(getStorePath('games.minecraft-java')) as any
                    if (javaData) {
                        // Aggressive Merge: If remote legacy has more time, we take it.
                        if (remoteGame.total_time > javaData.totalPlaytime) {
                            javaData.totalPlaytime = remoteGame.total_time
                            store.set(getStorePath('games.minecraft-java'), javaData)

                            // FORCE PUSH to 'minecraft-java' right now so the user sees it immediately
                            supabase!.from('games').upsert({
                                user_id: currentUser!.id,
                                identifier: 'minecraft-java',
                                name: GAMES['minecraft-java'].name,
                                process_names: GAMES['minecraft-java'].processNames,
                                total_time: javaData.totalPlaytime,
                                last_session: javaData.lastSession
                            }, { onConflict: 'user_id, identifier' }).then(() => console.log('[Sync] Aggressive migration: Time pushed to Minecraft (Java)'))
                        }
                    }

                    // 2. Delete the legacy 'minecraft' from cloud definitively
                    supabase!.from('games').delete()
                        .eq('user_id', currentUser!.id)
                        .eq('identifier', 'minecraft')
                        .then(({ error }) => {
                            if (!error) console.log('[Sync] Legacy minecraft deleted from cloud')
                            else console.error('[Sync] Failed to delete legacy minecraft from cloud:', error)
                        })
                    continue
                }

                if (!GAMES[remoteGame.identifier]) {
                    console.log(`[Sync] Discovered new game from cloud: ${remoteGame.name} (${remoteGame.identifier})`)

                    // Create Definition
                    const newGameConfig: GameConfig = {
                        id: remoteGame.identifier,
                        name: remoteGame.name,
                        processNames: remoteGame.process_names || [] // PULL: Restore process names
                    }

                    // Update Memory & Store
                    GAMES[remoteGame.identifier] = newGameConfig

                    // Initialize Stats with remote values
                    const initialStats = {
                        totalPlaytime: remoteGame.total_time || 0,
                        lastSession: remoteGame.last_session || 0,
                        history: [] // We'll let the history puller fill this later if needed, or leave empty
                    }
                    store.set(getStorePath(`games.${remoteGame.identifier}`), initialStats)

                    discoveredCount++
                } else {
                    // Game exists locally. Check if we should update its metadata in the cloud if needed
                    // (This ensures that new games like 'minecraft-java' get their names PUSHED even if 0 playtime)
                    if (remoteGame.name !== GAMES[remoteGame.identifier].name) {
                        supabase!.from('games').upsert({
                            user_id: currentUser!.id,
                            identifier: remoteGame.identifier,
                            name: GAMES[remoteGame.identifier].name,
                            process_names: GAMES[remoteGame.identifier].processNames,
                            total_time: remoteGame.total_time,
                            last_session: remoteGame.last_session
                        }, { onConflict: 'user_id, identifier' }).then(() => console.log(`[Sync] Updated cloud name for ${remoteGame.identifier}`))
                    }
                }
            }

            if (discoveredCount > 0) {
                store.set('gameDefinitions', GAMES) // Save new definitions
                console.log(`[Sync] Added ${discoveredCount} new games from cloud.`)
                sendStateUpdate() // Refresh UI immediately
            }
        }
    } catch (e) {
        console.error('[Sync] Discovery failed:', e)
    }

    isSyncing = false
    console.log('[Sync] Hybrid Sync complete (Delta + History)')
    sendStateUpdate()
}

function sendStateUpdate() {
    try {
        if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
            // STORE: Scoped
            const bedrockData = store.get(getStorePath('games.minecraft-bedrock')) as any || { totalPlaytime: 0 }
            const hasPlayedBedrock = (bedrockData.totalPlaytime || 0) > 0
            const isCurrentlyPlayingBedrock = isGameRunning && activeGameId === 'minecraft-bedrock'
            const gameData = store.get(getStorePath(`games.${activeGameId}`)) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
            const settings = getUserSettings()

            const gamesList = Object.values(GAMES)
                .filter(g => {
                    // HIDE: If it's Bedrock and hasn't been played yet AND is not currently running
                    if (g.id === 'minecraft-bedrock' && !hasPlayedBedrock && !isCurrentlyPlayingBedrock) return false
                    return true
                })
                .map(g => {
                    const gData = store.get(getStorePath(`games.${g.id}`)) as any || { totalPlaytime: 0, lastSession: 0, history: [] }

                    // RENAME: If Java and Bedrock hasn't been played (or is not running), call it just "Minecraft"
                    let displayName = g.name
                    if (g.id === 'minecraft-java' && !hasPlayedBedrock && !isCurrentlyPlayingBedrock) {
                        displayName = 'Minecraft'
                    }

                    return {
                        id: g.id,
                        name: displayName,
                        totalTime: gData.totalPlaytime || 0,
                        lastSession: gData.lastSession || 0,
                        history: (gData.history || []).slice(-50).reverse(),
                        processNames: g.processNames
                    }
                })

            // Find active game name for display
            const activeG = GAMES[activeGameId]
            let activeDisplayName = activeG?.name || 'Unknown'
            if (activeGameId === 'minecraft-java' && !hasPlayedBedrock && !isCurrentlyPlayingBedrock) {
                activeDisplayName = 'Minecraft'
            }

            win.webContents.send('app-state', {
                activeGameId: activeGameId,
                gameName: activeDisplayName,
                isPlaying: isGameRunning,
                sessionTime: sessionPlaytime,
                totalTime: gameData.totalPlaytime || 0,
                lastSession: gameData.lastSession || 0,
                history: (gameData.history || []).slice(-50).reverse(),
                displayName: settings.displayName || '',
                language: settings.language || 'es',
                runAtStartup: settings.runAtStartup || false,
                minimizeToTray: settings.minimizeToTray !== undefined ? settings.minimizeToTray : true,
                games: gamesList,
                isOnline: isOnline,
                availablePresets: Object.values({ ...defaultGames, ...additionalPresets })
                    .filter(pg => !GAMES[pg.id]),
                version: CURRENT_VERSION
            })
        }
    } catch (e) { }
}

app.on('window-all-closed', () => {
    const settings = getUserSettings()
    // If user prefers NOT to stay in tray, quit the app when window closes
    if (settings.minimizeToTray === false) {
        console.log('[App] Tray disabled and window closed. Quitting app...')
        app.quit()
    } else if (process.platform !== 'darwin') {
        console.log('[App] Window closed. Staying active in tray.')
        // Keep running in tray (standard behavior)
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    // Ensure the active user's bucket exists
    setActiveUser(activeUserId)

    createWindow()
    createTray()

    // Detect if app was started by the system (Startup)
    const loginItemSettings = app.getLoginItemSettings()
    const settings = getUserSettings()

    // If opened at login AND the user has startup/tray enabled, hide the window
    if (loginItemSettings.wasOpenedAtLogin && settings.runAtStartup) {
        console.log('[Startup] App started by system. Hiding window...')
        win?.hide()
    }

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
        const gameData = store.get(getStorePath(`games.${activeGameId}`)) as any || { totalPlaytime: 0, lastSession: 0, history: [] }
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

        store.set(getStorePath(`games.${activeGameId}`), gameData)

        // Final Sync (Fire and forget-ish, but syncWithSupabase is async)
        if (currentUser && supabase) {
            syncWithSupabase()
        }

        console.log(`Saved final session for ${activeGameId}: ${seconds}s`)
    }
})

// Periodic Session Refresh (Every 20 minutes) to prevent accidental logout
setInterval(async () => {
    if (supabase && currentUser) {
        try {
            const { data, error } = await supabase.auth.getSession()
            if (error) {
                console.error('[Auth] Periodic keep-alive check failed:', error.message)
            } else if (data.session) {
                // console.log('[Auth] Session keep-alive: OK')
            }
        } catch (e) {
            // Silently ignore network errors during keep-alive
        }
    }
}, 1000 * 60 * 20)
