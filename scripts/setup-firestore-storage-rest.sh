#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:?Set GCP_REGION (example: us-central1)}"
: "${GCS_BUCKET_NAME:?Set GCS_BUCKET_NAME}"
: "${GCP_ACCESS_TOKEN:?Set GCP_ACCESS_TOKEN (OAuth2 bearer token)}"

API_BASE="https://serviceusage.googleapis.com/v1/projects/${GCP_PROJECT_ID}/services"
FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/${GCP_PROJECT_ID}/databases/(default)"
BUCKET_URL="https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}"
AUTH_HEADER="Authorization: Bearer ${GCP_ACCESS_TOKEN}"
REQUIRED_APIS=(run.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com storage.googleapis.com)

enable_api() {
  local api="$1"
  local status
  status=$(curl -sS -o /tmp/enable-api.json -w "%{http_code}" -X POST \
    "${API_BASE}/${api}:enable" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d '{}')

  if [ "${status}" = "200" ]; then
    echo "Enabled API (or already enabled): ${api}"
  else
    echo "Failed enabling API ${api}. HTTP ${status}"
    cat /tmp/enable-api.json
    exit 1
  fi
}

for api in "${REQUIRED_APIS[@]}"; do
  enable_api "$api"
done

FIRESTORE_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "${AUTH_HEADER}" "${FIRESTORE_URL}")
if [ "${FIRESTORE_STATUS}" != "200" ]; then
  echo "Creating Firestore Native database..."
  firestore_create_status=$(curl -sS -o /tmp/firestore-create.json -w "%{http_code}" -X POST \
    "https://firestore.googleapis.com/v1/projects/${GCP_PROJECT_ID}/databases?databaseId=(default)" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d "{\"locationId\":\"${GCP_REGION}\",\"type\":\"FIRESTORE_NATIVE\"}")
  if [ "${firestore_create_status}" -ge 400 ]; then
    echo "Failed to create Firestore database. HTTP ${firestore_create_status}"
    cat /tmp/firestore-create.json
    exit 1
  fi
else
  echo "Firestore database already exists"
fi

BUCKET_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "${AUTH_HEADER}" "${BUCKET_URL}")
if [ "${BUCKET_STATUS}" != "200" ]; then
  echo "Creating Cloud Storage bucket..."
  bucket_create_status=$(curl -sS -o /tmp/bucket-create.json -w "%{http_code}" -X POST \
    "https://storage.googleapis.com/storage/v1/b?project=${GCP_PROJECT_ID}" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${GCS_BUCKET_NAME}\",\"location\":\"${GCP_REGION}\",\"website\":{\"mainPageSuffix\":\"index.html\",\"notFoundPage\":\"index.html\"}}")
  if [ "${bucket_create_status}" -ge 400 ]; then
    echo "Failed to create Cloud Storage bucket. HTTP ${bucket_create_status}"
    cat /tmp/bucket-create.json
    exit 1
  fi
else
  echo "Cloud Storage bucket already exists"
fi

echo "Firestore and Cloud Storage setup complete"
