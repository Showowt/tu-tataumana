#!/bin/bash
# Verify the latest Vercel deployment is live after git push
# Usage: ./scripts/verify-deploy.sh

echo "Checking deployment status..."

# Hit an endpoint that returns the build timestamp or just verify it responds
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://www.tataumana.com/api/health")

if [ "$STATUS" = "200" ]; then
  echo "  Site is up (HTTP $STATUS)"
else
  echo "  WARNING: Site returned HTTP $STATUS"
fi

# Check Vercel for latest deployment age
LATEST=$(npx vercel ls 2>/dev/null | grep "Production" | head -1 | awk '{print $1}')
echo "  Latest production deployment: $LATEST ago"

# Hit the terms page (only exists in latest code)
TERMS=$(curl -s -o /dev/null -w "%{http_code}" "https://www.tataumana.com/terms")
if [ "$TERMS" = "200" ]; then
  echo "  New code confirmed live (terms page: $TERMS)"
else
  echo "  WARNING: New code may not be deployed (terms page: $TERMS)"
  echo "  Run: npx vercel --prod --yes"
fi

echo "Done."
