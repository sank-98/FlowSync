#!/bin/bash

# ============================================================================
# FlowSync: One-Command Google Cloud Deployment
# For: Google Prompt Wars 2024 Hackathon
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          🏟️  FLOWSYNC: Google Cloud Deployment                ║
║          For: Google Prompt Wars 2024 Hackathon              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION=${2:-"us-central1"}
SERVICE_NAME="flowsync"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo ""

# Verify project
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ Error: No GCP project set${NC}"
  echo "Set project: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

# Enable APIs
echo -e "${BLUE}[1/5] Enabling Google Cloud APIs...${NC}"
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  --project=$PROJECT_ID \
  --quiet

echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# Create Firestore
echo -e "${BLUE}[2/5] Creating Firestore Database...${NC}"
if gcloud firestore databases describe --database="(default)" --project=$PROJECT_ID &>/dev/null; then
  echo -e "${YELLOW}Database already exists${NC}"
else
  gcloud firestore databases create \
    --location=$REGION \
    --type=firestore-native \
    --project=$PROJECT_ID \
    --quiet
  echo -e "${GREEN}✅ Firestore database created${NC}"
fi
echo ""

# Load environment
echo -e "${BLUE}[3/5] Loading environment variables...${NC}"
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file not found${NC}"
  echo "Creating .env.example..."
  cat > .env.example << 'ENVEOF'
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
LOG_LEVEL=info
ENVEOF
  echo -e "${YELLOW}⚠️  Configure .env with your credentials${NC}"
  exit 1
fi

source .env
echo -e "${GREEN}✅ Environment loaded${NC}"
echo ""

# Build and deploy
echo -e "${BLUE}[4/5] Building Docker image...${NC}"
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .
echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

echo -e "${BLUE}[5/5] Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 100 \
  --set-env-vars="FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,GOOGLE_GEMINI_API_KEY=$GOOGLE_GEMINI_API_KEY,NODE_ENV=production" \
  --project=$PROJECT_ID \
  --quiet

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format='value(status.url)' \
  --project=$PROJECT_ID)

echo -e "${GREEN}✅ Cloud Run deployment complete${NC}"
echo ""

# Display results
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 DEPLOYMENT SUCCESSFUL! 🎉                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Service URL:${NC}"
echo "   $SERVICE_URL"
echo ""
echo -e "${BLUE}🧪 Test Health:${NC}"
echo "   curl $SERVICE_URL/health"
echo ""
echo -e "${BLUE}🚀 Get Zones:${NC}"
echo "   curl $SERVICE_URL/api/zones"
echo ""
echo -e "${BLUE}📊 View Logs:${NC}"
echo "   gcloud run logs read $SERVICE_NAME --region $REGION --limit 50"
echo ""