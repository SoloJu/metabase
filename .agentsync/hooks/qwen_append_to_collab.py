#!/usr/bin/env python3
import sys, json, datetime, os

data = json.loads(sys.stdin.read())
response = data.get("last_assistant_message", "")

# 优先用环境变量，其次用 Qwen 标准字段 cwd（项目根目录）
project_dir = os.environ.get("QWEN_PROJECT_DIR") or data.get("cwd", ".")
collab_file = os.environ.get("AGENTSYNC_COLLAB", "collab.md")
collab_path = os.path.join(project_dir, ".agentsync", collab_file)

if not response.strip():
    print(json.dumps({}))
    sys.exit(0)

os.makedirs(os.path.dirname(collab_path), exist_ok=True)
timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
with open(collab_path, "a") as f:
    f.write(f"\n---\nQwen: [{timestamp}]\n{response}\n")

# Qwen hooks must output valid JSON to stdout; plain text breaks parsing
print(json.dumps({}))
sys.exit(0)
