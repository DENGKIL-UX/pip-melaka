#!/bin/bash
# Watchdog script that restarts dev server if it dies
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null; then
    echo "[$(date)] Starting dev server..." >> /home/z/my-project/dev-watchdog.log
    NODE_OPTIONS="--max-old-space-size=1024" /home/z/my-project/node_modules/.bin/next dev -p 3000 --webpack > /home/z/my-project/dev.log 2>&1 &
    DEV_PID=$!
    echo "[$(date)] Dev server PID: $DEV_PID" >> /home/z/my-project/dev-watchdog.log
    # Wait for it to be ready
    for i in {1..30}; do
      if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo "[$(date)] Dev server ready" >> /home/z/my-project/dev-watchdog.log
        break
      fi
      sleep 1
    done
    # Wait for process to exit (it will be OOM-killed eventually)
    wait $DEV_PID
    echo "[$(date)] Dev server exited, restarting in 2s..." >> /home/z/my-project/dev-watchdog.log
    sleep 2
  else
    sleep 5
  fi
done
