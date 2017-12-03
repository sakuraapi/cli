#!/usr/bin/env bash

set -ex
npm run build
npx nodemon --exec "npm run build"
