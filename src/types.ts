export interface HistoryItem {
    date: string;
    duration: number;
}

export interface AppState {
    isOnline: boolean
    isPlaying: boolean
    sessionTime: number
    displayName: string
    language: 'en' | 'es'
    runAtStartup: boolean
    minimizeToTray: boolean
    totalTime: number
    lastSession: number
    history: HistoryItem[]
    activeGameId: string
    gameName: string
    games: {
        id: string;
        name: string;
        processNames: string[];
        totalTime: number;
        lastSession: number;
        history: HistoryItem[];
    }[]
}
