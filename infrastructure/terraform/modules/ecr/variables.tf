###############################################################################
# GridMind — ECR Module Variables
###############################################################################

variable "project" {
  description = "Project name (used as ECR namespace prefix)"
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

variable "kms_key_arn" {
  description = "KMS key ARN for ECR encryption at rest"
  type        = string
}

variable "eks_node_role_arns" {
  description = "IAM role ARNs for EKS node groups that need ECR pull access"
  type        = list(string)
}

variable "cicd_role_arns" {
  description = "IAM role ARNs for CI/CD pipeline that needs ECR push access"
  type        = list(string)
}
