# Ubuntu Launcher

A fast, modern launcher for Ubuntu that helps you quickly switch between open windows and Chrome tabs using keyboard shortcuts.

## Features

- 🪟 **Window Management**: Search and switch between all open windows
- 🌐 **Chrome Tab Integration**: Find and activate Chrome tabs instantly  
- ⚡ **Lightning Fast**: Local filtering with cached data for instant results
- 🔥 **Multiple Shortcuts**: Configurable keyboard shortcuts (Alt+P, Alt+R, Alt+E by default)
- 🎯 **Smart Search**: Search by window title, app name, or URL
- 💨 **No Visual Jumping**: Stable results that don't flicker while typing

## Installation

```bash
npm install
```

## Development

```bash
# Start renderer dev server
cd renderer && npm run dev

# In another terminal, start Electron
NODE_ENV=development npx electron .
```

## Configuration

### Customizing Keyboard Shortcuts

Edit `config.json` to customize your keyboard shortcuts:

```json
{
  "shortcuts": [
    "Alt+P",
    "Alt+R", 
    "Alt+E",
    "Ctrl+Space",
    "Super+Space"
  ]
}
```

**Available Modifier Keys:**
- `Alt` - Alt key
- `Ctrl` - Control key  
- `Super` - Windows/Cmd key
- `Shift` - Shift key

**Examples:**
- `"Alt+Space"` - Alt + Space
- `"Ctrl+Shift+L"` - Ctrl + Shift + L
- `"Super+R"` - Windows key + R
- `"F1"` - Function key F1

**Notes:**
- Shortcuts are registered globally (work from any app)
- If a shortcut fails to register, it's likely in use by another app
- Restart the launcher after changing `config.json`
- You can have multiple shortcuts that do the same thing

### Other Settings

```json
{
  "window": {
    "width": 800,
    "height": 600,
    "alwaysOnTop": true,
    "skipTaskbar": false
  },
  "cache": {
    "refreshInterval": 2000
  }
}
```

## Usage

1. Press your configured shortcut (default: Alt+P, Alt+R, or Alt+E)
2. Type to search for windows or Chrome tabs
3. Use ↑/↓ arrow keys to navigate results
4. Press Enter to switch to the selected item
5. Press Escape to close the launcher

## Building for Production

```bash
npm run build
npm run dist
```

## Troubleshooting

**Shortcuts not working?**
- Check if another app is using the same shortcut
- Try different key combinations in `config.json`
- Check the console output for registration errors

**No windows/tabs found?**
- Make sure `wmctrl` is installed: `sudo apt install wmctrl`
- For Chrome tabs, ensure Chrome is running with remote debugging enabled

## System Requirements

- Ubuntu 18.04+ (or compatible Linux distribution)
- Node.js 16+
- `wmctrl` package for window management