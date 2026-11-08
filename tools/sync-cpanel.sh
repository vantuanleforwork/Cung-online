#!/bin/bash
set -euo pipefail

REPOSITORY=/home/owzxfdum/repositories/cung-online

cd "$REPOSITORY"
BEFORE_PULL=$(/usr/bin/git rev-parse HEAD)
/usr/bin/git pull --ff-only origin main
AFTER_PULL=$(/usr/bin/git rev-parse HEAD)

if [ "$BEFORE_PULL" != "$AFTER_PULL" ]; then
  /usr/bin/uapi VersionControlDeployment create repository_root="$REPOSITORY"
fi
