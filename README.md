# 3D Mystery Game — Manor of Whispers

An immersive first-person 3D detective mystery game running entirely in a single HTML file.
Built with [Three.js](https://threejs.org/) + React (Babel standalone), with an LLM backend via [Ollama](https://ollama.com/).

---

## Quick Start (Automatic)

Just double-click **start.bat** in this folder!

It will:
1. Check if Ollama is running (and launch ollama serve in the background if not).
2. Host the game on http://localhost:8000.
3. Automatically launch your default browser right into the game.

---

## Manual Start

If you prefer starting manually:
1. Ensure Ollama is running:
   `ash
   ollama serve
   `
2. Serve and open:
   `ash
   python -m http.server 8000
   `
   Then open http://localhost:8000/fps01.html in your browser.

---

## Controls

| Action | Key / Input |
|---|---|
| Move | WASD or Arrow Keys |
| Look | Mouse (pointer locked) |
| Interact / Open door | Click |
| Close panel | ESC |

---

## Architecture

- **Rendering**: Three.js r128 — FPS camera, shadow maps, canvas-generated textures (wood floors, stone ceilings)
- **UI**: React 18 via Babel standalone — dynamic model dropdown fetching available models directly from Ollama
- **LLM**: Ollama local API (/api/tags and /api/chat)
- **Map**: Multi-room manor with Entrance Hall, Main Corridor, Interrogation Wing, Forensic Lab, and Commissioner's Office
