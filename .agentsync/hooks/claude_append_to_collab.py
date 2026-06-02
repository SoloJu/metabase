#!/usr/bin/env python3
import sys, json, datetime, os, time

project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")
collab_file = os.environ.get("AGENTSYNC_COLLAB", "collab.md")
collab_path = os.path.join(project_dir, ".agentsync", collab_file)

data = json.loads(sys.stdin.read())
transcript_path = data.get("transcript_path", "")

# Wait for transcript to stabilize (Node.js async writes may not be flushed yet)
if transcript_path and os.path.exists(transcript_path):
    prev_size = -1
    for _ in range(10):
        cur_size = os.path.getsize(transcript_path)
        if cur_size == prev_size:
            break
        prev_size = cur_size
        time.sleep(0.15)

last_response = ""
last_text_idx = -1
if transcript_path and os.path.exists(transcript_path):
    with open(transcript_path, "r") as f:
        lines = f.readlines()

    # Find the last assistant text block
    for i, line in enumerate(lines):
        try:
            entry = json.loads(line)
            if entry.get("type") == "assistant":
                for block in entry.get("message", {}).get("content", []):
                    if isinstance(block, dict) and block.get("type") == "text":
                        last_response = block["text"]
                        last_text_idx = i
                        break
        except Exception:
            continue

    # Skip if any tool_use follows the last text (it's an intermediate transition, not the final response)
    if last_text_idx >= 0:
        for line in lines[last_text_idx + 1:]:
            try:
                entry = json.loads(line)
                if entry.get("type") == "assistant":
                    for block in entry.get("message", {}).get("content", []):
                        if isinstance(block, dict) and block.get("type") == "tool_use":
                            last_response = ""
                            break
                if not last_response:
                    break
            except Exception:
                continue

if not last_response.strip():
    sys.exit(0)

os.makedirs(os.path.dirname(collab_path), exist_ok=True)
timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
with open(collab_path, "a") as f:
    f.write(f"\n---\nClaude: [{timestamp}]\n{last_response}\n")

sys.exit(0)
