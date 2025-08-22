const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  searchItems: (query) => ipcRenderer.invoke('search-items', query),
  activateWindow: (windowId) => ipcRenderer.invoke('activate-window', windowId),
  activateChromeTab: (tabId) => ipcRenderer.invoke('activate-chrome-tab', tabId),
  
  // Window controls
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  
  // Events
  onWindowShow: (callback) => ipcRenderer.on('window-show', callback),
  onWindowHide: (callback) => ipcRenderer.on('window-hide', callback),
  onClearSearch: (callback) => ipcRenderer.on('clear-search', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});