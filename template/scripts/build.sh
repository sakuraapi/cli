#!/usr/bin/env bash

BUILD_TYPE=${1:-production}

set -ex
rm -rf dist/
tsc
rsync -r --exclude=*.ts src/config dist/src

if [ $BUILD_TYPE == "test" ]; then
  tsc --project tsconfig.spec.json
fi
