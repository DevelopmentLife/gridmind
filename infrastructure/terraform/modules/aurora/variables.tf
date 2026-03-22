###############################################################################
# GridMind — Aurora Module Variables
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
  description = "Private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to Aurora"
  type        = list(string)
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption at rest"
  type        = string
}

variable "engine_version" {
  description = "Aurora PostgreSQL engine version"
  type        = string
  default     = "16.1"
}

variable "database_name" {
  description = "Initial database name"
  type        = string
  default     = "gridmind"
}

variable "master_username" {
  description = "Master DB username"
  type        = string
  default     = "gridmind_admin"
}

variable "instance_class" {
  description = "DB instance class (db.serverless for Aurora Serverless v2)"
  type        = string
  default     = "db.serverless"
}

variable "reader_count" {
  description = "Number of Aurora reader instances"
  type        = number
  default     = 1
}

variable "backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "serverless_min_capacity" {
  description = "Minimum Aurora Serverless v2 ACU capacity"
  type        = number
  default     = 0.5
}

variable "serverless_max_capacity" {
  description = "Maximum Aurora Serverless v2 ACU capacity"
  type        = number
  default     = 8
}

variable "alarm_sns_arns" {
  description = "SNS topic ARNs for CloudWatch alarms"
  type        = list(string)
  default     = []
}
