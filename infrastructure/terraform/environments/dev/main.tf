###############################################################################
# GridMind — Dev Environment
###############################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.41.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.26.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "2.12.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "4.0.5"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }
  }

  backend "s3" {
    bucket         = "gridmind-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "gridmind-terraform-locks-dev"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "gridmind"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    command     = "aws"
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
      command     = "aws"
    }
  }
}

###############################################################################
# VPC (dev uses minimal setup — single AZ, small CIDR)
###############################################################################

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "gridmind-dev"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false
  enable_dns_hostnames   = true
  enable_dns_support     = true

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/gridmind-dev" = "owned"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
}

###############################################################################
# IAM (KMS + IRSA roles)
###############################################################################

module "iam" {
  source = "../../modules/iam"

  project           = "gridmind"
  environment       = "dev"
  aws_region        = var.aws_region
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  github_org        = var.github_org
  github_repo       = var.github_repo
}

###############################################################################
# EKS
###############################################################################

module "eks" {
  source = "../../modules/eks"

  project            = "gridmind"
  environment        = "dev"
  aws_region         = var.aws_region
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  kubernetes_version = "1.29"

  # Dev — small, single system + app node
  system_node_instance_type = "t3.medium"
  system_node_desired       = 1
  system_node_min           = 1
  system_node_max           = 2

  app_node_instance_type = "t3.medium"
  app_node_desired       = 2
  app_node_min           = 2
  app_node_max           = 4

  enable_public_endpoint = true
  public_access_cidrs    = var.developer_cidrs

  ebs_csi_irsa_role_arn = module.iam.service_irsa_role_arns["gateway"]
}

###############################################################################
# ECR
###############################################################################

module "ecr" {
  source = "../../modules/ecr"

  project     = "gridmind"
  environment = "dev"
  kms_key_arn = module.iam.kms_key_arn

  eks_node_role_arns = [module.eks.node_iam_role_arn]
  cicd_role_arns     = [module.iam.cicd_role_arn]
}

###############################################################################
# Aurora PostgreSQL (dev: serverless v2, single instance, no HA)
###############################################################################

module "aurora" {
  source = "../../modules/aurora"

  project     = "gridmind"
  environment = "dev"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  allowed_security_group_ids = [module.eks.node_security_group_id]

  instance_class          = "db.serverless"
  reader_count            = 0
  backup_retention_days   = 3
  serverless_min_capacity = 0.5
  serverless_max_capacity = 4
}

###############################################################################
# ElastiCache Redis (dev: single node)
###############################################################################

module "elasticache" {
  source = "../../modules/elasticache"

  project     = "gridmind"
  environment = "dev"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  allowed_security_group_ids = [module.eks.node_security_group_id]

  node_type          = "cache.t4g.micro"
  num_cache_clusters = 1
}

###############################################################################
# NATS (dev: single node)
###############################################################################

module "nats" {
  source = "../../modules/nats"

  project     = "gridmind"
  environment = "dev"
  aws_region  = var.aws_region

  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  client_security_group_ids = [module.eks.node_security_group_id]

  instance_type   = "t3.small"
  cluster_size    = 1
  data_volume_size_gb = 20
}

###############################################################################
# Vault (dev: single replica)
###############################################################################

module "vault" {
  source = "../../modules/vault"

  project     = "gridmind"
  environment = "dev"
  aws_region  = var.aws_region
  kms_key_arn = module.iam.kms_key_arn

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  replica_count = 1
  storage_size  = "5Gi"
}

###############################################################################
# ALB + WAF
###############################################################################

module "alb" {
  source = "../../modules/alb"

  project     = "gridmind"
  environment = "dev"

  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnets
  route53_zone_id   = var.route53_zone_id
  root_domain       = var.root_domain

  gateway_domain    = "api-dev.${var.root_domain}"
  admin_domain      = "admin-dev.${var.root_domain}"
  portal_domain     = "app-dev.${var.root_domain}"
  superadmin_domain = "platform-dev.${var.root_domain}"
  access_log_bucket = var.access_log_bucket
}

###############################################################################
# Monitoring (dev: lighter retention)
###############################################################################

module "monitoring" {
  source = "../../modules/monitoring"

  project     = "gridmind"
  environment = "dev"
  aws_region  = var.aws_region
  kms_key_arn = module.iam.kms_key_arn

  alb_arn_suffix             = module.alb.alb_arn
  aurora_cluster_id          = module.aurora.cluster_id
  redis_replication_group_id = module.elasticache.replication_group_id

  critical_alert_emails     = var.alert_emails
  log_retention_days        = 7
  prometheus_retention_days = 7
  prometheus_storage_size   = "20Gi"
  grafana_admin_password    = var.grafana_admin_password
}
