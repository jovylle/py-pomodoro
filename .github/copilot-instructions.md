# Copilot Instructions for AI Agents: py-pomodoro

## Project Overview
- **Type:** Desktop Pomodoro timer for macOS, built with Electron (Node.js/JavaScript)
- **Main UI:** `index.html` (renderer), `renderer.js` (UI logic)
- **Main Process:** `main.js` (Electron app lifecycle, tray, timer logic, notifications)
- **Packaging:** Uses `electron-builder` for `.dmg` installer (see `package.json`)
- **Assets:** Audio and images in `assets/` and root directory

## Architecture & Data Flow
- **Electron Main Process:**
  - Entry: `main.js` (sets up window, tray, timer state, notifications)
  - Handles timer state, session logic, and system notifications
  - Communicates with renderer via `ipcMain`/`ipcRenderer` events
- **Renderer Process:**
  - UI logic in `renderer.js` (DOM events, updates, sound playback)
  - Receives timer updates and session events from main process
  - Sends timer start/pause events to main process
- **UI:**
  - All UI is in `index.html` (no frameworks)
  - Controls: Start Focus, Start Break, Pause/Resume, Dismiss, Alt Session

## Developer Workflows
- **Run Locally:**
  - `npm install` (installs Electron)
  - `npm start` (launches app)
- **Build macOS Installer:**
  - `npm run dist` (creates `.dmg` in `dist/`)
  - Requires `electron-builder` (already in `devDependencies`)
- **Dev Snapshot ZIP:**
  - `zip -r "py-pomodoro-$(date +%Y-%m-%d-%H-%M).zip" main.js renderer.js package.json index.html`
- **No automated tests** (as of this version)

## Project Conventions & Patterns
- **No TypeScript, no React—plain JS/HTML/CSS**
- **Timer logic** is in `main.js` (not in renderer)
- **All inter-process communication** uses Electron's IPC (`ipcMain`, `ipcRenderer`)
- **Audio alerts**: Played in renderer via `Audio` API, triggered by main process
- **System notifications**: Sent from main process using Electron's `Notification`
- **Tray menu**: Built dynamically in `main.js` (`buildContextMenu`)
- **Window is hidden, not closed, on user close** (see `win.on('close', ...)`)
- **macOS only**: No Windows/Linux support or packaging

## Key Files & Directories
- `main.js` — Electron main process, timer, tray, notifications
- `renderer.js` — Renderer process, UI logic, sound
- `index.html` — UI layout and controls
- `assets/` — Audio files for alerts
- `package.json` — Scripts, build config, dependencies
- `README.md` — Developer and user instructions

## Integration Points
- **No external APIs or cloud services**
- **No Python integration in production** (ignore `pomodoro_ToDelete.py`)
- **No database or persistent storage**

## Special Notes
- **All timer/session state is in-memory** (reset on app restart)
- **App is designed for simplicity and minimal dependencies**
- **If adding features, follow the IPC pattern for main/renderer communication**

---

For more, see `README.md` and `package.json` for build/run details. When in doubt, check `main.js` for app logic and `renderer.js` for UI event handling.
