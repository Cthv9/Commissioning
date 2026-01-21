const { contextBridge, ipcRenderer } = require('electron');

/**
 * API minimale esposta al renderer (pagine HTML) in modo sicuro.
 * Nota: le pagine continuano a parlare con il server via fetch,
 * ma usiamo questa API per scegliere cartelle con dialog nativo.
 */
contextBridge.exposeInMainWorld('DF', {
  selectDirectory: async () => {
    const dir = await ipcRenderer.invoke('df:select-directory');
    return dir || null;
  }
});
