###############################################################################
# GridMind — Monitoring Module Variables
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
  description = "KMS key ARN for encrypting SNS topics and log groups"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix (for CloudWatch metric dimensions)"
  type        = string
}

variable "aurora_cluster_id" {
  description = "Aurora cluster identifier"
  type        = string
}

variable "redis_replication_group_id" {
  description = "ElastiCache replication group ID"
  type        = string
}

variable "critical_alert_emails" {
  description = "Email addresses for critical alert SNS subscriptions"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "CloudWatch log group retention in days"
  type        = number
  default     = 30
}

variable "error_rate_threshold" {
  description = "5XX error count threshold to trigger critical alarm"
  type        = number
  default     = 10
}

variable "prometheus_stack_version" {
  description = "kube-prometheus-stack Helm chart version"
  type        = string
  default     = "57.0.1"
}

variable "prometheus_retention_days" {
  description = "Prometheus data retention in days"
  type        = number
  default     = 15
}

variable "prometheus_storage_size" {
  description = "Prometheus PVC storage size"
  type        = string
  default     = "50Gi"
}

variable "grafana_admin_password" {
  description = "Grafana admin password (sourced from Secrets Manager at apply time)"
  type        = string
  sensitive   = true
}
