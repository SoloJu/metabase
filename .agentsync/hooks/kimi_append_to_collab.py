#!/usr/bin/env python3
"""
Kimi Code CLI Stop hook — appends last assistant response to .agentsync/collab.md.

Installed globally at ~/.kimi/hooks/kimi_append_to_collab.py via setup.sh.
Silently skips projects that don't have .agentsync/.
"""
import sys, json, datetime, os, hashlib, time

data = json.loads(sys.stdin.read())
cwd = data.get("cwd", ".")
session_id = data.get("session_id", "")

# Only run for agentsync projects
if not os.path.isdir(os.path.join(cwd, ".agentsync")):
    sys.exit(0)

collab_file = os.environ.get("AGENTSYNC_COLLAB", "collab.md")
collab_path = os.path.join(cwd, ".agentsync", collab_file)

# Build context.jsonl path: {KIMI_SHARE_DIR}/sessions/{md5(cwd)}/{session_id}/context.jsonl
share_dir = os.environ.get("KIMI_SHARE_DIR", os.path.expanduser("~/.kimi"))
path_md5 = hashlib.md5(cwd.encode("utf-8")).hexdigest()
context_path = os.path.join(share_dir, "sessions", path_md5, session_id, "context.jsonl")

if not session_id or not os.path.exists(context_path):
    sys.exit(0)

# Wait for context file to stabilize (async writes may not be flushed yet)
prev_size = -1
for _ in range(10):
    cur_size = os.path.getsize(context_path)
    if cur_size == prev_size:
        break
    prev_size = cur_size
    time.sleep(0.15)

# Find the last assistant message with text content
last_response = ""
with open(context_path) as f:
    lines = f.readlines()

for line in reversed(lines):
    try:
        entry = json.loads(line)
        if entry.get("role") == "assistant":
            content = entry.get("content", [])
            texts = [
                b["text"]
                for b in content
                if isinstance(b, dict) and b.get("type") == "text"
            ]
            if texts:
                last_response = "\n".join(texts)
                break
    except Exception:
        continue

if not last_response.strip():
    sys.exit(0)

os.makedirs(os.path.dirname(collab_path), exist_ok=True)
timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
with open(collab_path, "a") as f:
    f.write(f"\n---\nKimi: [{timestamp}]\n{last_response}\n")

sys.exit(0)
