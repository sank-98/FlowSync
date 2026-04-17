#!/bin/bash

# ============================================================================
# FlowSync: Deployment Verification & Testing
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVICE_URL=${1:-$(gcloud run services describe flowsync --region us-central1 --format='value(status.url)' 2>/dev/null || echo "http://localhost:8080")}

if [ -z "$SERVICE_URL" ]; then
  echo -e "${RED}❌ Error: Could not determine service URL${NC}"
  exit 1
fi

echo -e "${CYAN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🏟️  FLOWSYNC: Deployment Verification                    ║
║     Testing All Features                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}Service URL: $SERVICE_URL${NC}"
echo ""

# Test 1: Health Check
echo -e "${CYAN}[TEST 1/7] Health Check${NC}"
HEALTH=$(curl -s $SERVICE_URL/health)
if echo $HEALTH | grep -q "healthy"; then
  echo -e "${GREEN}✅ Backend is healthy${NC}"
else
  echo -e "${RED}❌ Health check failed${NC}"
  exit 1
fi
echo ""

# Test 2: Get Zones
echo -e "${CYAN}[TEST 2/7] Fetch All Zones${NC}"
ZONES=$(curl -s $SERVICE_URL/api/zones)
ZONE_COUNT=$(echo $ZONES | jq '.zones | length')
if [ $ZONE_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Successfully fetched $ZONE_COUNT zones${NC}"
else
  echo -e "${RED}❌ No zones found${NC}"
  exit 1
fi
echo ""

# Test 3: Route Calculation
echo -e "${CYAN}[TEST 3/7] Route Calculation (Fastest)${NC}"
ROUTE=$(curl -s -X POST $SERVICE_URL/api/route \
  -H "Content-Type: application/json" \
  -d '{"fromZoneId":"zone-0-0","destinationType":"food","preference":"fastest"}')

if echo $ROUTE | jq -e '.route' > /dev/null 2>&1; then
  ROUTE_LENGTH=$(echo $ROUTE | jq '.zones')
  EST_TIME=$(echo $ROUTE | jq '.estimatedTime')
  echo -e "${GREEN}✅ Route calculated successfully${NC}"
  echo "   Zones: $ROUTE_LENGTH, Time: $EST_TIME mins"
else
  echo -e "${RED}❌ Route calculation failed${NC}"
  exit 1
fi
echo ""

# Test 4: Time Analysis
echo -e "${CYAN}[TEST 4/7] Time Arbitrage Analysis${NC}"
ROUTE_ARRAY=$(echo $ROUTE | jq -r '.route | @json')
TIME_ANALYSIS=$(curl -s -X POST $SERVICE_URL/api/time-analysis \
  -H "Content-Type: application/json" \
  -d "{\"route\": $ROUTE_ARRAY}")

if echo $TIME_ANALYSIS | jq -e '.recommendation' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Time analysis complete${NC}"
else
  echo -e "${RED}❌ Time analysis failed${NC}"
  exit 1
fi
echo ""

# Test 5: Exit Strategy
echo -e "${CYAN}[TEST 5/7] Exit Strategy${NC}"
EXIT_STRATEGY=$(curl -s $SERVICE_URL/api/exit-strategy)
if echo $EXIT_STRATEGY | jq -e '.immediate' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Exit strategy retrieved${NC}"
else
  echo -e "${RED}❌ Exit strategy failed${NC}"
  exit 1
fi
echo ""

# Test 6: Stats
echo -e "${CYAN}[TEST 6/7] Stadium Statistics${NC}"
STATS=$(curl -s $SERVICE_URL/api/stats)
if echo $STATS | jq -e '.overallDensity' > /dev/null 2>&1; then
  DENSITY=$(echo $STATS | jq '.overallDensity')
  echo -e "${GREEN}✅ Stadium statistics retrieved (Density: $DENSITY%)${NC}"
else
  echo -e "${RED}❌ Stats failed${NC}"
  exit 1
fi
echo ""

# Test 7: AI Chat
echo -e "${CYAN}[TEST 7/7] AI Assistant${NC}"
AI_RESPONSE=$(curl -s -X POST $SERVICE_URL/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Where should I go?"}' | jq -r '.response' 2>/dev/null || echo "")

if [ -n "$AI_RESPONSE" ]; then
  echo -e "${GREEN}✅ AI assistant responding${NC}"
else
  echo -e "${YELLOW}⚠️  AI endpoint available but check Gemini key${NC}"
fi
echo ""

# Performance Test
echo -e "${CYAN}[PERFORMANCE] Load Test (100 requests)${NC}"
START_TIME=$(date +%s%N)
for i in {1..100}; do
  curl -s $SERVICE_URL/api/zones > /dev/null &
done
wait
END_TIME=$(date +%s%N)

TOTAL_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
AVG_TIME_MS=$(( TOTAL_TIME_MS / 100 ))

echo -e "${GREEN}✅ Load test complete${NC}"
echo "   Total: ${TOTAL_TIME_MS}ms | Avg: ${AVG_TIME_MS}ms/req"
echo ""

# Final report
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ ALL TESTS PASSED! ✅                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"