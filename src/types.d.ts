export interface AppState {
    isPlaying: boolean
    sessionTime: number
    totalTime: number
}

declare global {
    interface Window {
        ipcRenderer: {
            on(channel: string, func: (...args: any[]) => void): () => void
            off(channel: string, func: (...args: any[]) => void): void
            send(channel: string, ...args: any[]): void
            invoke(channel: string, ...args: any[]): Promise<any>
        }
    }
}
