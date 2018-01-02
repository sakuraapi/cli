#!/usr/bin/env bash

# used by npm start

set -ex
npm run build
cd dist/src
node index.js
