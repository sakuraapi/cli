#!/usr/bin/env bash
set -ex

rm -rf dist/ ; mkdir -p ./dist
npx tsc
chmod +x ./dist/index.js
./scripts/save-version.sh
rsync -r template dist
rsync -r template-package.json dist
