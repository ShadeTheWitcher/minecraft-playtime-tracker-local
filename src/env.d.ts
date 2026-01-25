/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        getSettings: () => Promise<{ displayName?: string; autoSync?: boolean; language?: string; runAtStartup?: boolean; minimizeToTray?: boolean }>
        setSettings: (settings: { displayName?: string; autoSync?: boolean; language?: string; runAtStartup?: boolean; minimizeToTray?: boolean }) => Promise<void>
        checkUpdates: () => Promise<{ isNew: boolean; version: string; url: string; current: string; error?: string }>
        openExternal: (url: string) => void
    }
    ipcRenderer: {
        on(channel: string, func: (...args: any[]) => void): () => void
        off(channel: string, func: (...args: any[]) => void): void
        send(channel: string, ...args: any[]): void
        invoke(channel: string, ...args: any[]): Promise<any>
    }
}
