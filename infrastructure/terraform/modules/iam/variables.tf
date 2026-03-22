###############################################################################
# GridMind — IAM Module Variables
###############################################################################

variable "project" {
  description = "Project name"
  type        = string
  default     = "gridmind"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production"
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  type        = string
}

variable "oidc_provider_url" {
  description = "EKS OIDC provider URL (with https://)"
  type        = string
}

variable "app_namespace" {
  description = "Kubernetes namespace where application pods run"
  type        = string
  default     = "gridmind"
}

variable "github_org" {
  description = "GitHub organization name for CI/CD OIDC trust"
  type        = string
  default     = "assertive-mind"
}

variable "github_repo" {
  description = "GitHub repository name for CI/CD OIDC trust"
  type        = string
  default     = "gridmind"
}
