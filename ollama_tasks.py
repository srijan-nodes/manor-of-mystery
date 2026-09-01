"""
Ollama Task Orchestrator
========================
Uses your local Ollama models as coding agents.
Each task gets a file + instructions, sends them to a local model,
and writes the result back.

Usage:
    python ollama_tasks.py task_file.json
    python ollama_tasks.py --list-models
    python ollama_tasks.py --run-task "improve lighting in scene.js" --file js/scene.js --model gemma4:26b
"""

import json
import sys
import os
import time
import urllib.request
import urllib.error
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_URL = "http://localhost:11434"
BASE_DIR = Path(__file__).parent

def list_models():
    """Fetch and display all available Ollama models."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=5) as r:
            data = json.loads(r.read())
            models = data.get("models", [])
            print(f"\n{'Model Name':<55} {'Size':>10} {'Family'}")
            print("-" * 80)
            for m in models:
                name = m["name"]
                size = f"{m['size'] / 1e9:.1f}GB"
                family = m.get("details", {}).get("family", "?")
                caps = ", ".join(m.get("capabilities", []))
                print(f"  {name:<53} {size:>10} {family}")
            print(f"\n  {len(models)} models available\n")
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")
        sys.exit(1)

def send_to_ollama(model, system_prompt, user_prompt, timeout=300):
    """Send a coding task to an Ollama model and return the response."""
    payload = json.dumps({
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "options": {
            "temperature": 0.3,
            "num_predict": 16384
        }
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read())
            return data["message"]["content"]
    except urllib.error.HTTPError as e:
        return f"ERROR: HTTP {e.code} - {e.read().decode()}"
    except Exception as e:
        return f"ERROR: {e}"

def extract_code(response, lang="js"):
    """Extract code from markdown code blocks in the response."""
    lines = response.split("\n")
    in_block = False
    code_lines = []
    
    for line in lines:
        if line.strip().startswith(f"```{lang}") or line.strip().startswith("```javascript") or line.strip().startswith("```jsx") or line.strip().startswith("```css") or line.strip().startswith("```html"):
            in_block = True
            continue
        elif line.strip() == "```" and in_block:
            in_block = False
            continue
        elif in_block:
            code_lines.append(line)
    
    if code_lines:
        return "\n".join(code_lines)
    # If no code blocks found, return the raw response (model might have just output code)
    return response

def run_single_task(task):
    """Execute a single task against an Ollama model."""
    model = task["model"]
    file_path = BASE_DIR / task["file"]
    instruction = task["instruction"]
    task_name = task.get("name", task["file"])
    output_file = BASE_DIR / task.get("output", task["file"])
    lang = task.get("lang", "js")

    print(f"\n  [{task_name}] → {model}")
    print(f"    Reading: {file_path}")

    if not file_path.exists():
        print(f"    ERROR: File not found: {file_path}")
        return False

    source = file_path.read_text(encoding="utf-8")

    system_prompt = """You are an expert coding assistant. You will receive a source code file and an instruction.
Output ONLY the complete modified source code inside a single code block.
Do NOT add explanations, comments about your changes, or anything outside the code block.
Preserve all existing functionality unless explicitly told to change it.
Output the ENTIRE file, not just the changed parts."""

    user_prompt = f"""Here is the current source code of `{task['file']}`:\n\n```{lang}\n{source}\n```\n\n**Task:** {instruction}\n\nOutput the complete modified file:"""

    print(f"    Sending to {model}... (this may take a while)")
    start = time.time()
    response = send_to_ollama(model, system_prompt, user_prompt)
    elapsed = time.time() - start
    print(f"    Response received in {elapsed:.1f}s ({len(response)} chars)")

    if response.startswith("ERROR:"):
        print(f"    {response}")
        return False

    code = extract_code(response, lang)

    # Write to output file
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(code, encoding="utf-8")
    print(f"    Written: {output_file} ({len(code)} chars)")
    return True

def run_tasks_from_file(task_file):
    """Run all tasks defined in a JSON file."""
    with open(task_file) as f:
        config = json.load(f)

    tasks = config.get("tasks", [])
    parallel = config.get("parallel", False)
    
    print(f"\n{'='*60}")
    print(f"  Ollama Task Orchestrator")
    print(f"  {len(tasks)} task(s) to execute")
    print(f"  Parallel: {parallel}")
    print(f"{'='*60}")

    if parallel:
        # Run tasks in parallel threads (different models can run simultaneously)
        with ThreadPoolExecutor(max_workers=len(tasks)) as executor:
            futures = {executor.submit(run_single_task, t): t for t in tasks}
            results = {}
            for future in as_completed(futures):
                task = futures[future]
                results[task.get("name", task["file"])] = future.result()
    else:
        results = {}
        for task in tasks:
            results[task.get("name", task["file"])] = run_single_task(task)

    # Summary
    print(f"\n{'='*60}")
    print(f"  Results:")
    for name, ok in results.items():
        status = "✓ OK" if ok else "✗ FAILED"
        print(f"    {status}  {name}")
    print(f"{'='*60}\n")

def run_interactive(args):
    """Run a single task from CLI args."""
    task = {
        "name": "interactive",
        "model": args.model,
        "file": args.file,
        "instruction": args.run_task,
        "output": args.output or args.file,
        "lang": args.lang or "js"
    }
    run_single_task(task)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ollama Task Orchestrator")
    parser.add_argument("task_file", nargs="?", help="JSON file with task definitions")
    parser.add_argument("--list-models", action="store_true", help="List available Ollama models")
    parser.add_argument("--run-task", type=str, help="Single task instruction")
    parser.add_argument("--file", type=str, help="Source file for --run-task")
    parser.add_argument("--output", type=str, help="Output file (defaults to --file)")
    parser.add_argument("--model", type=str, default="gemma4:26b", help="Model for --run-task")
    parser.add_argument("--lang", type=str, default="js", help="Language hint for code extraction")

    args = parser.parse_args()

    if args.list_models:
        list_models()
    elif args.run_task:
        if not args.file:
            print("ERROR: --file is required with --run-task")
            sys.exit(1)
        run_interactive(args)
    elif args.task_file:
        run_tasks_from_file(args.task_file)
    else:
        parser.print_help()
