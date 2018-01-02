#!/usr/bin/env bash

set -ex
npm run docker:local-compose-up
npm run build
npx jasmine
