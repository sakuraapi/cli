#!/usr/bin/env bash

set -ex
rm -rf dist/
tsc
mkdir -p dist/config
rsync -r --exclude=*.ts src/config dist
