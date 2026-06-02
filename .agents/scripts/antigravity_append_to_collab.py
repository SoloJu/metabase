#!/usr/bin/env python3
import sys, json, datetime, os

data = json.loads(sys.stdin.read())

workspace_paths = data.get("workspacePaths", [])
project_dir = workspace_paths[0] if workspace_paths else "."
collab_file = os.environ.get("AGENTSYNC_COLLAB", "collab.md")
collab_path = os.path.join(project_dir, ".agentsync", collab_file)

# Read last assistant text response from transcript.jsonl
transcript_path = data.get("transcriptPath", "")
response = ""
if transcript_path and os.path.exists(transcript_path):
    try:
        with open(transcript_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    if (entry.get("source") == "MODEL"
                            and entry.get("type") == "PLANNER_RESPONSE"
                            and "content" in entry
                            and entry.get("status") == "DONE"):
                        response = entry["content"]
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass

if response.strip():
    os.makedirs(os.path.dirname(collab_path), exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(collab_path, "a") as f:
        f.write(f"\n---\nAntigravity: [{timestamp}]\n{response}\n")

# Antigravity Stop hooks must return {"decision": ""} to allow normal stop
print(json.dumps({"decision": ""}))
sys.exit(0)
