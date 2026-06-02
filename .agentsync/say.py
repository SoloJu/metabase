#!/usr/bin/env python3
"""Manager script: append a message to the collab log.

Usage:
    python3 .agentsync/say.py "任务描述和要求"
    python3 .agentsync/say.py --file collab_auth.md "请实现登录功能"

Environment:
    PROJECT_DIR        - project root (default: current directory)
    AGENTSYNC_COLLAB   - collab filename (default: collab.md)
"""
import sys, datetime, os, argparse

parser = argparse.ArgumentParser()
parser.add_argument("message", nargs="+")
parser.add_argument("--file", default=None, help="collab filename, e.g. collab_auth.md")
args = parser.parse_args()

message = " ".join(args.message)
project_dir = os.environ.get("PROJECT_DIR", ".")
collab_file = args.file or os.environ.get("AGENTSYNC_COLLAB", "collab.md")
collab_path = os.path.join(project_dir, ".agentsync", collab_file)

os.makedirs(os.path.dirname(collab_path), exist_ok=True)
timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
with open(collab_path, "a") as f:
    f.write(f"\n---\nManager: [{timestamp}]\n{message}\n")

print(f"→ {collab_path}")
