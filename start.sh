#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

echo "starting seatsync..."

# kill anything already on port 8080
OLD=$(lsof -ti :8080 2>/dev/null)
if [ -n "$OLD" ]; then
  kill "$OLD" 2>/dev/null
  sleep 2
fi

# install frontend packages if missing
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "installing frontend packages..."
  cd "$FRONTEND_DIR" && npm install -q
fi

# start backend in background
echo "starting backend on :8080..."
cd "$BACKEND_DIR"
mvn spring-boot:run -q &
BACKEND_PID=$!

# wait for backend to respond
echo "waiting for backend..."
COUNT=0
until curl -s http://localhost:8080/seats > /dev/null 2>&1; do
  sleep 2
  COUNT=$((COUNT + 2))
  if [ $COUNT -ge 60 ]; then
    echo "backend did not start in time"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
done

echo "backend ready!"
echo ""
echo "  backend  -> http://localhost:8080"
echo "  frontend -> http://localhost:3000"
echo "  ctrl+c to stop"
echo ""

trap "kill $BACKEND_PID 2>/dev/null; exit 0" INT TERM

cd "$FRONTEND_DIR"
npm start

kill $BACKEND_PID 2>/dev/null
