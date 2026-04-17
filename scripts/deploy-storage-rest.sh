#!/usr/bin/env bash
set -euo pipefail

: "${GCS_BUCKET_NAME:?Set GCS_BUCKET_NAME}"
: "${GCP_ACCESS_TOKEN:?Set GCP_ACCESS_TOKEN}"

AUTH_HEADER="Authorization: Bearer ${GCP_ACCESS_TOKEN}"

if [ ! -d public ]; then
  echo "Missing required directory: public"
  exit 1
fi

files=()
while IFS= read -r -d '' file; do
  files+=("$file")
done < <(find public -type f -print0)

for file in "${files[@]}"; do
  object_name="${file#public/}"
  encoded_object_name=$(python3 - "$object_name" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe="/"))
PY
)
  content_type=$(python3 - "$file" <<'PY'
import mimetypes
import sys
mime, _ = mimetypes.guess_type(sys.argv[1])
print(mime or "")
PY
)
  if [ -z "${content_type}" ]; then
    content_type="application/octet-stream"
  fi

  echo "Uploading ${object_name}"
  upload_status=$(curl -sS -o /tmp/storage-upload.json -w "%{http_code}" -X POST \
    "https://storage.googleapis.com/upload/storage/v1/b/${GCS_BUCKET_NAME}/o?uploadType=media&name=${encoded_object_name}" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: ${content_type}" \
    --data-binary "@${file}")
  if [ "${upload_status}" -ge 400 ]; then
    echo "Failed uploading ${object_name}. HTTP ${upload_status}"
    cat /tmp/storage-upload.json
    exit 1
  fi

done

policy=$(curl -sS -H "${AUTH_HEADER}" "https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}/iam")
updated_policy=$(echo "${policy}" | jq 'if any(.bindings[]?; .role == "roles/storage.objectViewer" and (.members | index("allUsers"))) then . else .bindings += [{"role":"roles/storage.objectViewer","members":["allUsers"]}] end')

iam_status=$(curl -sS -o /tmp/storage-iam.json -w "%{http_code}" -X PUT \
  "https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}/iam" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d "${updated_policy}")
if [ "${iam_status}" -ge 400 ]; then
  echo "Failed updating bucket IAM policy. HTTP ${iam_status}"
  cat /tmp/storage-iam.json
  exit 1
fi

echo "Static assets deployed: https://storage.googleapis.com/${GCS_BUCKET_NAME}/index.html"
