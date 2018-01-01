#!/usr/bin/env bash

set -ex
npm run docker:local-compose-up
npm run build test
npx jasmine
npm run docker:local-compose-down
