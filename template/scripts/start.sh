#!/usr/bin/env bash

set -ex
npm run build
npm run docker:local-compose-up
nodemon --exec "./scripts/nodemon.sh"
npm run docker:local-compose-down
