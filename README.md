# 3D Mystery Game — Manor of Whispers

An immersive first-person 3D detective mystery game running entirely in a single HTML file.
Built with [Three.js](https://threejs.org/) + React (Babel standalone), with an LLM backend via [Ollama](https://ollama.com/).

---

## Gameplay

Walk through a fully rendered 3D manor, interrogate suspects, run forensic analyses, and accuse the killer.
Every case is **procedurally generated** by a local LLM — no two games are the same.

### Controls

| Action | Key / Input |
|---|---|
| Move | WASD or Arrow Keys |
| Look | Mouse (pointer locked) |
| Interact / Open door | Click |
| Close panel | ESC |

---

## File

| File | Description |
|---|---|
| `fps01.html` | The complete game — open directly in a browser or local server |

---

## Requirements

1. **Ollama running**:
   \\\ash
   ollama serve
   \\\
   *(Or keep the standard Ollama desktop app running in the background).*

2. **At least one model installed**:
   \\\ash
   ollama pull mistral:7b
   # or llama3:8b, gemma2, etc.
   \\\

3. **Open the game**:
   Open `fps01.html` directly in your browser (or serve with python -m http.server 8000) and click **Connect & Generate Case**.

---

## Architecture

- **Rendering**: Three.js r128 — FPS camera, shadow maps, canvas-generated textures (wood floors, stone ceilings)
- **UI**: React 18 via Babel standalone — dynamic model dropdown fetching available models directly from Ollama
- **LLM**: Ollama local API (/api/tags and /api/chat)
- **Map**: Multi-room manor with Entrance Hall, Main Corridor, Interrogation Wing, Forensic Lab, and Commissioner's Office
