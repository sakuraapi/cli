#!/usr/bin/env bash

set -ex
npm run docker:local-compose-up
npm run build
npx run jasmine ; npm run docker:local-compose-down
