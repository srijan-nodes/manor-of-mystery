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
| `fps01.html` | The complete game — open directly in a browser |

---

## Requirements

This game requires a local [Ollama](https://ollama.com/) instance with `mistral:7b` pulled.

\\\ash
# Pull the model (once)
ollama pull mistral:7b

# Start Ollama with CORS enabled
OLLAMA_ORIGINS=* ollama serve
\\\

Then open `fps01.html` in your browser and click **Connect & Generate Case**.

---

## Architecture

- **Rendering**: Three.js r128 — FPS camera, shadow maps, canvas-generated textures (wood floors, stone ceilings)
- **UI**: React 18 via Babel standalone — all panels are React components overlaid on the canvas
- **LLM**: Ollama local API — generates the full mystery (victim, suspects, secrets, timeline) on demand
- **Map**: Multi-room manor with Entrance Hall, Main Corridor, Interrogation Wing, Forensic Lab, and Commissioner's Office
