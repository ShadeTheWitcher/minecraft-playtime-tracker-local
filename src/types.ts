export interface HistoryItem {
    date: string;
    duration: number;
}

export interface AppState {
    isOnline: boolean
    isPlaying: boolean
    sessionTime: number
    displayName: string
    totalTime: number
    lastSession: number
    history: HistoryItem[]
    activeGameId: string
    gameName: string
    games: {
        id: string;
        name: string;
        totalTime: number;
        lastSession: number;
        history: HistoryItem[];
    }[]
}
