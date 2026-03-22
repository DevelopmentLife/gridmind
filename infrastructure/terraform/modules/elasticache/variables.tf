###############################################################################
# GridMind — ElastiCache Module Variables
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

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the ElastiCache subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to Redis"
  type        = list(string)
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption at rest and Secrets Manager"
  type        = string
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.small"
}

variable "port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (1 = single node, 2+ = primary + replicas)"
  type        = number
  default     = 2
}

variable "maxmemory_policy" {
  description = "Redis maxmemory-policy"
  type        = string
  default     = "volatile-lru"
}

variable "snapshot_retention_days" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 5
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "alarm_sns_arns" {
  description = "SNS topic ARNs for CloudWatch alarms"
  type        = list(string)
  default     = []
}
