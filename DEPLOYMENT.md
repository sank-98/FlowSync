# 🚀 FlowSync Google Cloud Deployment Guide

**A comprehensive guide to deploying the FlowSync platform to Google Cloud Platform (GCP) using serverless architecture and automated CI/CD.**

---

## 📋 Overview
This deployment utilizes the following GCP ecosystem:
* **Backend:** Cloud Run (Serverless Node.js)
* **Frontend:** Cloud Storage (Static Website Hosting)
* **Database:** Firestore (NoSQL)
* **AI:** Gemini API (Integrated via Environment Variables)

> **Note:** This guide is designed to work via REST APIs and GitHub Actions, minimizing the need for local `gcloud` CLI configuration.

---

## 🛠 Part 1: GCP Setup

### 1.1 Create Service Account
1.  Navigate to **GCP Console → IAM & Admin → Service Accounts**.
2.  Click **Create Service Account**.
3.  **Name:** `flowsync-deployer`.
4.  Click **Create and Continue**.

### 1.2 Grant Required Roles
Assign the following roles to the service account to ensure full deployment capability:
* `roles/run.admin` (Cloud Run Management)
* `roles/iam.serviceAccountUser` (Identity Management)
* `roles/artifactregistry.admin` (Container Management)
* `roles/storage.admin` (Bucket & Frontend Management)
* `roles/datastore.owner` (Firestore Access)
* `roles/serviceusage.serviceUsageAdmin` (API Activation)

### 1.3 Generate JSON Key
1.  Click on the service account name.
2.  Go to the **Keys** tab.
3.  Click **Add Key → Create new key**.
4.  Select **JSON** format, download, and store securely.

### 1.4 Enable APIs
Enable the following APIs in your GCP Project:
`Cloud Run`, `Artifact Registry`, `Cloud Storage`, `Firestore`, and `Cloud Build`.

---

## 🔐 Part 2: GitHub Configuration

### 2.1 GitHub Secrets
Add these in **Settings → Secrets and variables → Actions → Secrets**:

| Secret Name | Value |
| :--- | :--- |
| `GCP_PROJECT_ID` | Your GCP Project ID |
| `GCP_SERVICE_ACCOUNT_KEY` | Full JSON from the key file |
| `FIREBASE_PROJECT_ID` | Your Project ID |
| `FIREBASE_DATABASE_URL` | `https://your-project.firebaseio.com` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase JSON (single line) |
| `GOOGLE_GEMINI_API_KEY` | Your Gemini API Key |

### 2.2 GitHub Variables
Add these in **Settings → Secrets and variables → Actions → Variables**:

| Variable Name | Value |
| :--- | :--- |
| `GCP_REGION` | `us-central1` |
| `CLOUD_RUN_SERVICE` | `flowsync` |
| `ARTIFACT_REGISTRY_REPO` | `flowsync` |
| `GCS_BUCKET_NAME` | `flowsync-frontend-prod` |

---

## 📂 Part 3: Required Files

### 3.1 Dockerfile
Place this in the repository root:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

### 3.2 GitHub Actions Workflow
Create `.github/workflows/deploy-gcp.yml`:
```yaml
name: Deploy to Google Cloud
on:
  push:
    branches: [main, master]
  workflow_dispatch:

env:
  GCP_REGION: ${{ vars.GCP_REGION }}
  CLOUD_RUN_SERVICE: ${{ vars.CLOUD_RUN_SERVICE }}
  ARTIFACT_REGISTRY_REPO: ${{ vars.ARTIFACT_REGISTRY_REPO }}
  GCS_BUCKET_NAME: ${{ vars.GCS_BUCKET_NAME }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev

      - name: Build & Push Image
        run: |
          docker build -t ${GCP_REGION}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${ARTIFACT_REGISTRY_REPO}/${CLOUD_RUN_SERVICE}:latest .
          docker push ${GCP_REGION}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${ARTIFACT_REGISTRY_REPO}/${CLOUD_RUN_SERVICE}:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${CLOUD_RUN_SERVICE} \
            --image ${GCP_REGION}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${ARTIFACT_REGISTRY_REPO}/${CLOUD_RUN_SERVICE}:latest \
            --platform managed --region ${GCP_REGION} --allow-unauthenticated \
            --set-env-vars FIREBASE_SERVICE_ACCOUNT="${{ secrets.FIREBASE_SERVICE_ACCOUNT }}",FIREBASE_DATABASE_URL="${{ secrets.FIREBASE_DATABASE_URL }}",GOOGLE_GEMINI_API_KEY="${{ secrets.GOOGLE_GEMINI_API_KEY }}" \
            --memory 512Mi --cpu 1 --timeout 3600 --concurrency 100

      - name: Deploy Frontend to GCS
        run: |
          gsutil mb -p ${{ secrets.GCP_PROJECT_ID }} -b on gs://${GCS_BUCKET_NAME}/ || true
          gsutil -m cp -r public/* gs://${GCS_BUCKET_NAME}/
          gsutil -m acl ch -u AllUsers:R gs://${GCS_BUCKET_NAME}/index.html
```

---

## 🚀 Part 4: Deployment & Rollback

### 4.1 Deployment Methods
* **Automatic:** `git push origin main` triggers the workflow.
* **Manual:** Go to GitHub **Actions**, select **Deploy to Google Cloud**, and click **Run workflow**.

### 4.2 Rollback Procedures
* **Backend:** `gcloud run services update-traffic flowsync --to-revisions REVISION_NAME=100 --region us-central1`
* **Frontend:** Re-upload assets from a stable git commit using the deployment script.

---

## 📊 Part 5: Monitoring & Maintenance

### 5.1 Verification
* **Backend Health:** `curl https://flowsync-*.run.app/health`
* **Frontend Availability:** `curl -I https://storage.googleapis.com/${GCS_BUCKET_NAME}/index.html`

### 5.2 Troubleshooting
| Issue | Solution |
| :--- | :--- |
| Artifact Registry Fail | Verify `gcloud auth configure-docker` status |
| Deployment Timeout | Check Dockerfile `CMD` and `EXPOSE` port (must be 8080) |
| Frontend 403 Error | Verify GCS Bucket public access permissions |
| Gemini API Error | Check `GOOGLE_GEMINI_API_KEY` in GitHub Secrets |

### 5.3 Maintenance Schedule
* **Weekly:** Monitor Cloud Logging for `severity="ERROR"`.
* **Monthly:** Review Cloud Run latency metrics (p95/p99) and billing.
* **Quarterly:** Audit IAM permissions and rotate Service Account keys.

---

**FlowSync** © 2026 — Production-Ready Google Cloud Deployment
