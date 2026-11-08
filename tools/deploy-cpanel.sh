#!/bin/bash
set -euo pipefail

DEPLOY_PATH=/home/owzxfdum/donate.vantuanle.com

/usr/bin/rsync -a \
  --chmod=F644,D755 \
  --exclude='/config.example.php' \
  --include='/*.php' \
  --include='/*.html' \
  --include='/*.js' \
  --include='/*.css' \
  --include='/.htaccess' \
  --include='/assets/***' \
  --include='/vendor/***' \
  --exclude='*' \
  ./ "$DEPLOY_PATH"/
