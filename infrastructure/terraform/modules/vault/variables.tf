###############################################################################
# GridMind — Vault Module Variables
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

variable "kms_key_arn" {
  description = "KMS key ARN for Secrets Manager encryption"
  type        = string
}

variable "oidc_provider_arn" {
  description = "EKS OIDC provider ARN for IRSA"
  type        = string
}

variable "oidc_provider_url" {
  description = "EKS OIDC provider URL for IRSA"
  type        = string
}

variable "vault_namespace" {
  description = "Kubernetes namespace for Vault"
  type        = string
  default     = "vault"
}

variable "replica_count" {
  description = "Number of Vault server replicas"
  type        = number
  default     = 3
}

variable "vault_helm_version" {
  description = "Vault Helm chart version"
  type        = string
  default     = "0.27.0"
}

variable "vault_image_tag" {
  description = "Vault Docker image tag"
  type        = string
  default     = "1.15.4"
}

variable "storage_size" {
  description = "PVC size for Vault data storage"
  type        = string
  default     = "10Gi"
}
