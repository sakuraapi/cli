#!/usr/bin/env bash

set -ex
npm run build
npm run docker:local-compose-up
nodemon --exec "npm run build ; cd dist/ ; node ." ; \
  npm run docker:local-compose-down
