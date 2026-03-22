###############################################################################
# GridMind — ALB Module Variables
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

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
}

variable "root_domain" {
  description = "Root domain (e.g. gridmind.io)"
  type        = string
}

variable "gateway_domain" {
  description = "API gateway domain (e.g. api.gridmind.io)"
  type        = string
}

variable "admin_domain" {
  description = "Admin dashboard domain (e.g. admin.gridmind.io)"
  type        = string
}

variable "portal_domain" {
  description = "Customer portal domain (e.g. app.gridmind.io)"
  type        = string
}

variable "superadmin_domain" {
  description = "Superadmin domain (e.g. platform.gridmind.io)"
  type        = string
}

variable "access_log_bucket" {
  description = "S3 bucket name for ALB access logs"
  type        = string
}

variable "gateway_port" {
  description = "Backend port for gateway service"
  type        = number
  default     = 8000
}

variable "admin_port" {
  description = "Backend port for admin service"
  type        = number
  default     = 3000
}

variable "portal_port" {
  description = "Backend port for portal service"
  type        = number
  default     = 3001
}

variable "superadmin_port" {
  description = "Backend port for superadmin service"
  type        = number
  default     = 3002
}
