#!/bin/sh
# Daily recall sync — run by Railway cron service.
# Required env vars: RAILWAY_PUBLIC_DOMAIN, CRON_SECRET
set -e

URL="https://${RAILWAY_PUBLIC_DOMAIN}/api/recalls/sync"

echo "Triggering recall sync at $URL"

response=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 600)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "Response ($http_code): $body"

if [ "$http_code" != "200" ]; then
  echo "Sync failed with status $http_code"
  exit 1
fi

echo "Sync completed successfully"
