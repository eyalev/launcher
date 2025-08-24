const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, shell, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const WindowManager = require('./window-manager');
const ChromeTabManager = require('./chrome-tabs');

let tray = null;
let mainWindow = null;
let windowManager = null;
let chromeTabManager = null;

// Cache for windows and tabs
let dataCache = {
  windows: [],
  chromeTabs: [],
  lastUpdated: 0,
  isRefreshing: false
};

const CACHE_REFRESH_INTERVAL = 2000; // 2 seconds

// Cache management functions
async function refreshCache() {
  if (dataCache.isRefreshing) {
    return; // Already refreshing
  }
  
  dataCache.isRefreshing = true;
  
  try {
    console.log('Refreshing cache...');
    
    // Get windows and tabs in parallel
    const [windows, chromeTabs] = await Promise.allSettled([
      windowManager.getWindows(),
      chromeTabManager.getTabs().catch(() => []) // Chrome tabs might not be available
    ]);
    
    dataCache.windows = windows.status === 'fulfilled' ? windows.value : [];
    dataCache.chromeTabs = chromeTabs.status === 'fulfilled' ? chromeTabs.value : [];
    dataCache.lastUpdated = Date.now();
    
    console.log(`Cache refreshed: ${dataCache.windows.length} windows, ${dataCache.chromeTabs.length} Chrome tabs`);
  } catch (error) {
    console.error('Error refreshing cache:', error);
  } finally {
    dataCache.isRefreshing = false;
  }
}

function shouldRefreshCache() {
  return Date.now() - dataCache.lastUpdated > CACHE_REFRESH_INTERVAL;
}

async function getCachedData() {
  if (shouldRefreshCache()) {
    await refreshCache();
  }
  return dataCache;
}

// Simple file-based store for window bounds
const configPath = path.join(app.getPath('userData'), 'launcher-config.json');

const store = {
  get: (key) => {
    try {
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return data[key] || getDefaults()[key];
      }
      return getDefaults()[key];
    } catch (error) {
      console.log('Error reading config:', error.message);
      return getDefaults()[key];
    }
  },
  
  set: (key, value) => {
    try {
      let data = {};
      if (fs.existsSync(configPath)) {
        data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      data[key] = value;
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('Error writing config:', error.message);
    }
  }
};

const getDefaults = () => ({
  windowBounds: {
    x: undefined,
    y: undefined,
    width: 800,
    height: 600
  }
});

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // Get saved window bounds
  const savedBounds = store.get('windowBounds');
  
  // Validate bounds are within screen area
  const validateBounds = (bounds) => {
    const displays = screen.getAllDisplays();
    
    // Check if window is within any display
    for (const display of displays) {
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
      
      // Window should be at least partially visible
      if (bounds.x < dx + dw && bounds.x + bounds.width > dx &&
          bounds.y < dy + dh && bounds.y + bounds.height > dy) {
        return bounds;
      }
    }
    
    // If not visible, return centered on primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    return {
      width: bounds.width,
      height: bounds.height,
      x: Math.round((screenWidth - bounds.width) / 2),
      y: Math.round((screenHeight - bounds.height) / 2)
    };
  };
  
  const bounds = validateBounds(savedBounds);
  
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    show: true, // Show window on creation for debugging
    frame: true, // Add frame for debugging
    alwaysOnTop: true,
    skipTaskbar: false, // Show in taskbar for debugging
    resizable: true, // Allow resize for debugging
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  console.log('Window created and should be visible');

  // Save window bounds when moved or resized
  const saveBounds = () => {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  };

  mainWindow.on('moved', saveBounds);
  mainWindow.on('resized', saveBounds);

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:3004');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }

  // Hide window when it loses focus (disabled for debugging)
  // mainWindow.on('blur', () => {
  //   mainWindow.hide();
  // });

  // Center window when shown
  mainWindow.on('show', () => {
    mainWindow.center();
    mainWindow.focus();
    // Clear search when window is shown
    mainWindow.webContents.send('clear-search');
    // Refresh cache when window is shown for fresh data
    refreshCache();
  });
}

function createTray() {
  // Create a simple tray icon (you can replace with a proper icon file)
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  
  // For now, create without icon if file doesn't exist
  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.log('Could not load tray icon, using empty icon:', error.message);
    tray = new Tray(nativeImage.createEmpty());
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Launcher',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Launcher');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}

// IPC handlers
ipcMain.handle('search-items', async (event, query) => {
  try {
    console.log('Searching for:', query || '(all items)');
    
    const results = [];
    
    // Get cached data instead of fetching fresh
    const cached = await getCachedData();
    const windows = cached.windows;
    const chromeTabs = cached.chromeTabs;
    
    console.log(`Using cached data: ${windows.length} windows, ${chromeTabs.length} Chrome tabs`);
    
    // If empty query, return all items (for initial load)
    let filteredWindows, filteredTabs;
    
    if (!query || !query.trim()) {
      filteredWindows = windows;
      filteredTabs = chromeTabs;
    } else {
      const lowerQuery = query.toLowerCase();
      
      // Filter windows based on query
      filteredWindows = windows.filter(window => 
        window.title.toLowerCase().includes(lowerQuery) ||
        window.owner.name.toLowerCase().includes(lowerQuery)
      );

      // Filter Chrome tabs based on query
      filteredTabs = chromeTabs.filter(tab =>
        tab.title.toLowerCase().includes(lowerQuery) ||
        tab.url.toLowerCase().includes(lowerQuery)
      );
    }

    for (const window of filteredWindows) {
      results.push({
        id: window.id.toString(),
        title: window.title || 'Untitled',
        subtitle: `${window.owner.name} - PID: ${window.owner.pid}`,
        type: 'window',
        data: window
      });
    }

    for (const tab of filteredTabs) {
      results.push({
        id: `chrome-${tab.id}`,
        title: tab.title,
        subtitle: tab.url,
        type: 'chrome_tab',
        data: tab
      });
    }

    console.log(`Returning ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
});

ipcMain.handle('activate-window', async (event, windowId) => {
  try {
    await windowManager.activateWindow(parseInt(windowId));
    mainWindow.hide();
  } catch (error) {
    console.error('Window activation error:', error);
    throw error;
  }
});

ipcMain.handle('activate-chrome-tab', async (event, tabId) => {
  try {
    const cleanTabId = tabId.replace('chrome-', '');
    const success = await chromeTabManager.activateTab(cleanTabId);
    if (success) {
      mainWindow.hide();
    }
    return success;
  } catch (error) {
    console.error('Chrome tab activation error:', error);
    return false;
  }
});

// Manual cache refresh handler
ipcMain.handle('refresh-cache', async () => {
  try {
    await refreshCache();
    return { success: true, timestamp: dataCache.lastUpdated };
  } catch (error) {
    console.error('Manual cache refresh error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  // Initialize managers
  windowManager = new WindowManager();
  chromeTabManager = new ChromeTabManager();

  // Initial cache load
  await refreshCache();

  createWindow();
  createTray();

  // Register global shortcuts
  const altP = globalShortcut.register('Alt+P', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  const altR = globalShortcut.register('Alt+R', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  if (!altP) {
    console.log('Alt+P global shortcut registration failed');
  }
  
  if (!altR) {
    console.log('Alt+R global shortcut registration failed');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
});

app.on('window-all-closed', () => {
  // Keep app running in background
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}