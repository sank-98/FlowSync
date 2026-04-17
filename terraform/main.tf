# Terraform configuration for FlowSync infrastructure on GCP
# Deploy with: terraform init && terraform apply

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Cloud Run Service
resource "google_cloud_run_service" "flowsync" {
  name     = "flowsync"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "gcr.io/${var.gcp_project_id}/flowsync:latest"

        env {
          name  = "FIREBASE_PROJECT_ID"
          value = google_firestore_database.flowsync.project
        }

        env {
          name  = "GOOGLE_GEMINI_API_KEY"
          value = var.gemini_api_key
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      service_account_email = google_service_account.flowsync.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_firestore_database.flowsync,
    google_service_account.flowsync,
  ]
}

# Allow unauthenticated invocations
resource "google_cloud_run_service_iam_member" "flowsync_public" {
  service       = google_cloud_run_service.flowsync.name
  location      = google_cloud_run_service.flowsync.location
  role          = "roles/run.invoker"
  member        = "allUsers"
}

# Firestore Database
resource "google_firestore_database" "flowsync" {
  project                     = var.gcp_project_id
  name                        = "flowsync"
  location_id                 = var.firestore_region
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
}

# Service Account
resource "google_service_account" "flowsync" {
  account_id   = "flowsync-backend"
  display_name = "FlowSync Backend Service Account"
}

# IAM: Firestore permissions
resource "google_project_iam_member" "flowsync_firestore" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.flowsync.email}"
}

# Cloud Storage Bucket (for frontend)
resource "google_storage_bucket" "flowsync_frontend" {
  name          = "${var.gcp_project_id}-frontend"
  location      = var.gcp_region
  force_destroy = true

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
}

# Make bucket public
resource "google_storage_bucket_iam_member" "flowsync_frontend_public" {
  bucket = google_storage_bucket.flowsync_frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Outputs
output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_service.flowsync.status[0].url
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.flowsync.name
}

output "frontend_bucket" {
  description = "Frontend storage bucket"
  value       = google_storage_bucket.flowsync_frontend.url
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.flowsync.email
}