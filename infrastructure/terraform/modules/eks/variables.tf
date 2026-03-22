###############################################################################
# GridMind — EKS Module Variables
###############################################################################

variable "project" {
  description = "Project name, used in resource naming"
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
  description = "VPC ID where the cluster is deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for node groups and control plane"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "kms_key_arn" {
  description = "ARN of the KMS key used to encrypt EKS secrets and EBS volumes"
  type        = string
}

variable "enable_public_endpoint" {
  description = "Whether to enable the public Kubernetes API endpoint"
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDR blocks that may access the public endpoint (if enabled)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# System node group
variable "system_node_instance_type" {
  description = "EC2 instance type for system node group"
  type        = string
  default     = "t3.medium"
}

variable "system_node_desired" {
  description = "Desired number of system nodes"
  type        = number
  default     = 2
}

variable "system_node_min" {
  description = "Minimum number of system nodes"
  type        = number
  default     = 1
}

variable "system_node_max" {
  description = "Maximum number of system nodes"
  type        = number
  default     = 4
}

# Application node group
variable "app_node_instance_type" {
  description = "EC2 instance type for application node group"
  type        = string
  default     = "t3.medium"
}

variable "app_node_desired" {
  description = "Desired number of application nodes"
  type        = number
  default     = 2
}

variable "app_node_min" {
  description = "Minimum number of application nodes"
  type        = number
  default     = 2
}

variable "app_node_max" {
  description = "Maximum number of application nodes"
  type        = number
  default     = 10
}

# EKS Add-on versions
variable "coredns_version" {
  description = "CoreDNS addon version"
  type        = string
  default     = "v1.11.1-eksbuild.4"
}

variable "kube_proxy_version" {
  description = "kube-proxy addon version"
  type        = string
  default     = "v1.29.0-eksbuild.1"
}

variable "vpc_cni_version" {
  description = "VPC CNI addon version"
  type        = string
  default     = "v1.16.0-eksbuild.1"
}

variable "ebs_csi_version" {
  description = "EBS CSI driver addon version"
  type        = string
  default     = "v1.26.0-eksbuild.1"
}

variable "ebs_csi_irsa_role_arn" {
  description = "IAM role ARN for EBS CSI driver IRSA"
  type        = string
}

# aws-auth overrides
variable "additional_map_roles" {
  description = "Additional IAM roles to add to aws-auth configmap"
  type = list(object({
    rolearn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

variable "additional_map_users" {
  description = "Additional IAM users to add to aws-auth configmap"
  type = list(object({
    userarn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}
