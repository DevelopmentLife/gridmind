###############################################################################
# GridMind — Staging Environment Variables
###############################################################################

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24", "10.20.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.20.101.0/24", "10.20.102.0/24", "10.20.103.0/24"]
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
}

variable "root_domain" {
  description = "Root domain name"
  type        = string
  default     = "gridmind.io"
}

variable "access_log_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
}

variable "alert_emails" {
  description = "Email addresses for alerts"
  type        = list(string)
  default     = []
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "github_org" {
  description = "GitHub organization"
  type        = string
  default     = "assertive-mind"
}

variable "github_repo" {
  description = "GitHub repository"
  type        = string
  default     = "gridmind"
}
