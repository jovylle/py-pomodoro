# Pomodoro Timer ⏰

A simple, desktop-based Pomodoro timer built with Electron.

![screenshot](./screenshot.png) <!-- optional -->

---

## 🧠 Features

- 🕒 Focus & break sessions with sound alerts
- ⏸ Pause and resume support
- 🔊 Loud notifications with system popups
- 🪟 Tray icon with controls
- ⚙️ Custom timer durations via UI
- 🧩 Built with Electron

---

## 🚀 Download

➡️ [Download latest release](https://github.com/jovylle/py-pomodoro/releases/latest)

> Mac `.dmg` installer available

---

## 🛠 Run from source

```bash
git clone https://github.com/jovylle/py-pomodoro.git
cd py-pomodoro
npm install
npm start



### 📦 Create Dev Snapshot ZIP

To zip only the core files (`main.js`, `renderer.js`, `package.json`, `index.html`) with today’s date:

```bash
zip -r "py-pomodoro-$(date +%Y-%m-%d-%H-%M).zip" main.js renderer.js package.json index.html
```

> Output: `py-pomodoro-2025-06-16.zip`
