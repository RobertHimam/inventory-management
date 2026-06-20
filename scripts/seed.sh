#!/usr/bin/env bash
# Seed development users by hitting the gateway register endpoint.
# Usage: ./scripts/seed.sh [GATEWAY_URL]
# Default: http://localhost:3000

set -euo pipefail

GATEWAY="${1:-http://localhost:3000}"
REGISTER="$GATEWAY/auth/register"

register() {
  local email="$1"
  local password="$2"
  local username="$3"
  local role="$4"

  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$REGISTER" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"username\":\"$username\",\"role\":\"$role\"}")

  if [ "$response" = "201" ]; then
    echo "  created: $email ($role)"
  elif [ "$response" = "409" ]; then
    echo "  skipped: $email already exists"
  else
    echo "  error:   $email — HTTP $response"
    exit 1
  fi
}

echo "Seeding users against $GATEWAY ..."
register "admin@example.com" "admin123" "admin" "ADMIN"
register "user@example.com"  "user123"  "user"  "USER"
echo "Done."
