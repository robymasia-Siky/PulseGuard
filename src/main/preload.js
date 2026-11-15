const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Telemetry stream listener
    onTelemetry: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('telemetry-data', handler);
        return () => ipcRenderer.removeListener('telemetry-data', handler);
    },

    // Static system info
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // Processes info
    getProcesses: () => ipcRenderer.invoke('get-processes'),
    killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),

    // Drive & network static/dynamic refresh
    getDrives: () => ipcRenderer.invoke('get-drives'),

    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
    toggleMiniMode: (enable) => ipcRenderer.invoke('window-toggle-mini-mode', enable),
    isAlwaysOnTop: () => ipcRenderer.invoke('window-is-pinned'),
    onWindowState: (callback) => {
        const handler = (event, state) => callback(state);
        ipcRenderer.on('window-state-change', handler);
        return () => ipcRenderer.removeListener('window-state-change', handler);
    },

    // Admin elevation
    restartAsAdmin: () => ipcRenderer.invoke('restart-as-admin'),

    // Settings
    setInterval: (ms) => ipcRenderer.send('set-telemetry-interval', ms)
});
