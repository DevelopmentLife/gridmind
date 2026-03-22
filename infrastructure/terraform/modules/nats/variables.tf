###############################################################################
# GridMind — NATS Module Variables
###############################################################################

variable "project" {
  description = "Project name"
  type        = string
  default     = "gridmind"
}

variable "environment" {
  description = "Deployment environment (dev | staging | production)"
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

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block (for monitoring access)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for NATS nodes"
  type        = list(string)
}

variable "client_security_group_ids" {
  description = "Security group IDs for NATS clients (EKS nodes)"
  type        = list(string)
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "nats_version" {
  description = "NATS Server version"
  type        = string
  default     = "2.10.12"
}

variable "instance_type" {
  description = "EC2 instance type for NATS nodes"
  type        = string
  default     = "t3.medium"
}

variable "cluster_size" {
  description = "Number of NATS nodes (odd number recommended: 3 for prod, 1 for dev)"
  type        = number
  default     = 3
}

variable "data_volume_size_gb" {
  description = "EBS volume size in GB for JetStream storage"
  type        = number
  default     = 50
}

variable "jetstream_max_memory_mb" {
  description = "JetStream max memory store in MB"
  type        = number
  default     = 1024
}

variable "jetstream_max_file_gb" {
  description = "JetStream max file store in GB"
  type        = number
  default     = 40
}
