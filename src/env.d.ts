/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        getSettings: () => Promise<{ displayName?: string; autoSync?: boolean }>
        setSettings: (settings: { displayName?: string; autoSync?: boolean }) => Promise<void>
    }
    ipcRenderer: {
        on(channel: string, func: (...args: any[]) => void): () => void
        off(channel: string, func: (...args: any[]) => void): void
        send(channel: string, ...args: any[]): void
        invoke(channel: string, ...args: any[]): Promise<any>
    }
}
