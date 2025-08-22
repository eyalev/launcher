const CDP = require('chrome-remote-interface');

class ChromeTabManager {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      if (!this.client) {
        this.client = await CDP({ port: 9222 });
      }
      return this.client;
    } catch (error) {
      console.log('Chrome DevTools not available:', error.message);
      throw new Error('Chrome not running with --remote-debugging-port=9222');
    }
  }

  async getTabs() {
    try {
      // List all available targets (tabs)
      const targets = await CDP.List({ port: 9222 });
      
      // Filter for pages (tabs)
      const tabs = targets
        .filter(target => target.type === 'page' && target.url.startsWith('http'))
        .map(target => ({
          id: target.id,
          title: target.title || 'Untitled',
          url: target.url,
          favIconUrl: target.faviconUrl
        }));

      return tabs;
    } catch (error) {
      console.log('Failed to get Chrome tabs:', error.message);
      return [];
    }
  }

  async activateTab(tabId) {
    try {
      // First try to bring Chrome window to front
      const WindowManager = require('./window-manager');
      const wm = new WindowManager();
      const windows = await wm.getWindows();
      
      const chromeWindow = windows.find(w => 
        w.title.toLowerCase().includes('chrome') || 
        w.owner.name.toLowerCase().includes('chrome')
      );
      
      if (chromeWindow) {
        await wm.activateWindow(chromeWindow.id);
        console.log('Brought Chrome window to front');
      }
      
      // Try to activate the specific tab via DevTools Protocol
      try {
        await CDP.Activate({ id: tabId, port: 9222 });
        console.log('Activated Chrome tab via DevTools');
      } catch (devToolsError) {
        console.log('DevTools activation failed, but Chrome window was focused:', devToolsError.message);
        // This is OK - at least we brought Chrome to the front
      }
      
      return true;
    } catch (error) {
      console.error('Failed to activate Chrome tab:', error);
      // Don't throw error - just focus Chrome window if possible
      return false;
    }
  }

  async closeTab(tabId) {
    try {
      await CDP.Close({ id: tabId, port: 9222 });
      return true;
    } catch (error) {
      console.error('Failed to close Chrome tab:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

module.exports = ChromeTabManager;