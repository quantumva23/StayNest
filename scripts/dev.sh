#!/bin/sh
set -e
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. It runs the local Postgres database."
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx staynest-pg; then
  echo "Postgres is already running."
elif docker ps -a --format '{{.Names}}' | grep -qx staynest-pg; then
  docker start staynest-pg >/dev/null
else
  docker run -d --name staynest-pg --restart unless-stopped \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=staynest \
    -p 5432:5432 \
    postgres:16 >/dev/null
fi

ready=0
i=0
while [ "$i" -lt 30 ]; do
  if docker exec staynest-pg pg_isready -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "Postgres did not become ready on port 5432."
  exit 1
fi

npm --workspace=server exec prisma generate

npm run dev:server &
server_pid=$!
npm run dev:client &
client_pid=$!

stop() {
  kill "$server_pid" "$client_pid" 2>/dev/null || true
}
trap stop INT TERM EXIT
wait
