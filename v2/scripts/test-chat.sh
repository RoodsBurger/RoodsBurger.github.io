#!/usr/bin/env bash
# Local sanity check for the chat function.
# Usage:
#   1) Put your secrets in v2/.env (gitignored):
#        COHERE_API_KEY=...
#        PINECONE_API_KEY=...
#        INDEX_NAME=rodolfo-portfolio
#   2) From v2/, run:  ./scripts/test-chat.sh
#
# What it does:
#   - boots netlify dev in the background
#   - hits /healthcheck (verifies both SDK calls succeed + index size)
#   - hits POST / with a real prompt (verifies end-to-end RAG)
#   - shuts the server back down

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in the keys."
  exit 1
fi

echo "→ Starting netlify dev..."
npx -y netlify-cli dev --offline --functions netlify/functions > /tmp/chat-test-dev.log 2>&1 &
PID=$!
trap "kill $PID 2>/dev/null; wait 2>/dev/null" EXIT

# Wait up to 60s for boot
for _ in $(seq 1 30); do
  grep -q "Local dev server ready" /tmp/chat-test-dev.log 2>/dev/null && break
  sleep 2
done

if ! grep -q "Local dev server ready" /tmp/chat-test-dev.log 2>/dev/null; then
  echo "ERROR: netlify dev didn't start. Last log:"
  tail -30 /tmp/chat-test-dev.log
  exit 1
fi

sleep 1

echo ""
echo "── Healthcheck ──────────────────────────────────────"
curl -s 'http://localhost:8888/.netlify/functions/chat?healthcheck=1' | python3 -m json.tool

echo ""
echo "── End-to-end chat ──────────────────────────────────"
curl -s -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{"message":"What did Rodolfo build for TidyNET?"}' | python3 -m json.tool

echo ""
echo "✓ Done. Kill log: /tmp/chat-test-dev.log"
