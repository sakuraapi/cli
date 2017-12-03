#!/usr/bin/env bash

set -ex
docker volume prune -f || echo \"skipped docker volume prune\"
docker-compose --file docker/local-test.yml up -d --remove-orphans
