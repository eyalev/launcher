const { windowManager } = require('node-window-manager');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WindowManager {
  constructor() {
    // Initialize the window manager
    this.manager = windowManager;
    // Request accessibility on construction
    try {
      this.manager.requestAccessibility();
    } catch (error) {
      console.log('Could not request accessibility:', error.message);
    }
  }

  async getWindows() {
    try {
      // Try node-window-manager first
      const windows = this.manager.getWindows();
      
      if (windows && windows.length > 0) {
        // Filter out invalid windows and our own launcher
        const validWindows = windows.filter(window => {
          const title = window.getTitle();
          const isVisible = window.isVisible();
          const bounds = window.getBounds();
          
          return (
            title && 
            title.trim() !== '' &&
            title !== 'Desktop' &&
            title !== 'Launcher' &&
            isVisible &&
            bounds.width > 0 && 
            bounds.height > 0
          );
        });

        return validWindows.map(window => ({
          id: window.id,
          title: window.getTitle(),
          bounds: window.getBounds(),
          isVisible: window.isVisible(),
          isMinimized: window.isMinimized(),
          owner: {
            name: window.processName || window.getTitle().split(' - ').pop() || 'Unknown',
            pid: window.processId || 0
          }
        }));
      } else {
        // Fallback to wmctrl on Linux
        return await this.getWindowsWithWmctrl();
      }
    } catch (error) {
      console.error('Error getting windows with node-window-manager, trying wmctrl:', error.message);
      return await this.getWindowsWithWmctrl();
    }
  }

  async getWindowsWithWmctrl() {
    try {
      const { stdout } = await execAsync('wmctrl -l');
      const lines = stdout.trim().split('\n');
      
      const windows = [];
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const id = parts[0];
            const desktop = parseInt(parts[1]);
            const title = parts.slice(3).join(' ');
            
            // Filter out system windows and our launcher
            if (title && 
                title.trim() !== '' &&
                title !== 'Desktop' &&
                title !== 'Launcher' &&
                !title.startsWith('@!') &&  // Ubuntu panel elements
                desktop >= 0) {  // -1 means sticky/system window
              
              windows.push({
                id: id,
                title: title,
                bounds: { x: 0, y: 0, width: 800, height: 600 }, // Default bounds
                isVisible: true,
                isMinimized: false,
                owner: {
                  name: this.extractAppName(title),
                  pid: 0
                }
              });
            }
          }
        }
      }
      
      return windows;
    } catch (error) {
      console.error('Error getting windows with wmctrl:', error);
      return [];
    }
  }

  extractAppName(title) {
    // Extract application name from window title
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      const lastPart = parts[parts.length - 1];
      
      // Common patterns
      if (lastPart.includes('Chrome')) return 'Google Chrome';
      if (lastPart.includes('Firefox')) return 'Firefox';
      if (lastPart.includes('Terminal')) return 'Terminal';
      if (lastPart.includes('Code')) return 'VS Code';
      if (lastPart.includes('Obsidian')) return 'Obsidian';
      
      return lastPart;
    }
    
    return title;
  }

  async activateWindow(windowId) {
    try {
      // Try node-window-manager first
      const window = this.manager.getWindow(windowId);
      if (window) {
        // Restore if minimized
        if (window.isMinimized()) {
          window.restore();
        }
        
        // Bring to front and focus
        window.bringToTop();
        window.show();
        
        // Additional focus attempt
        setTimeout(() => {
          try {
            window.setForeground();
          } catch (err) {
            console.log('Could not set foreground:', err.message);
          }
        }, 100);
        
        return true;
      } else {
        // Fallback to wmctrl
        return await this.activateWindowWithWmctrl(windowId);
      }
    } catch (error) {
      console.error('Error activating window with node-window-manager, trying wmctrl:', error.message);
      return await this.activateWindowWithWmctrl(windowId);
    }
  }

  async activateWindowWithWmctrl(windowId) {
    try {
      // Use wmctrl to activate the window
      await execAsync(`wmctrl -i -a ${windowId}`);
      return true;
    } catch (error) {
      console.error('Error activating window with wmctrl:', error);
      return false;
    }
  }

  async getActiveWindow() {
    try {
      return this.manager.getActiveWindow();
    } catch (error) {
      console.error('Error getting active window:', error);
      return null;
    }
  }
}

module.exports = WindowManager;