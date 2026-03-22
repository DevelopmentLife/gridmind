###############################################################################
# GridMind — Production Environment
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
    bucket         = "gridmind-terraform-state-production"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "gridmind-terraform-locks-production"
    # Production backend uses MFA delete and versioning on the S3 bucket
    # configured out-of-band
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "gridmind"
      Environment = "production"
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
# VPC (production: 3 AZ, per-AZ NAT gateways)
###############################################################################

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "gridmind-production"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"              = "1"
    "kubernetes.io/cluster/gridmind-production"    = "owned"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
}

###############################################################################
# IAM
###############################################################################

module "iam" {
  source = "../../modules/iam"

  project           = "gridmind"
  environment       = "production"
  aws_region        = var.aws_region
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  github_org        = var.github_org
  github_repo       = var.github_repo
}

###############################################################################
# EKS (production: t3.xlarge, 3 system + 3 app nodes, private endpoint)
###############################################################################

module "eks" {
  source = "../../modules/eks"

  project            = "gridmind"
  environment        = "production"
  aws_region         = var.aws_region
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  kubernetes_version = "1.29"

  system_node_instance_type = "t3.xlarge"
  system_node_desired       = 3
  system_node_min           = 3
  system_node_max           = 6

  app_node_instance_type = "t3.xlarge"
  app_node_desired       = 3
  app_node_min           = 3
  app_node_max           = 15

  enable_public_endpoint = false

  ebs_csi_irsa_role_arn = module.iam.service_irsa_role_arns["gateway"]

  additional_map_roles = var.additional_eks_roles
}

###############################################################################
# ECR
###############################################################################

module "ecr" {
  source = "../../modules/ecr"

  project     = "gridmind"
  environment = "production"
  kms_key_arn = module.iam.kms_key_arn

  eks_node_role_arns = [module.eks.node_iam_role_arn]
  cicd_role_arns     = [module.iam.cicd_role_arn]
}

###############################################################################
# Aurora PostgreSQL (production: Multi-AZ, 2 reader instances)
###############################################################################

module "aurora" {
  source = "../../modules/aurora"

  project     = "gridmind"
  environment = "production"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  allowed_security_group_ids = [module.eks.node_security_group_id]

  instance_class          = "db.serverless"
  reader_count            = 2
  backup_retention_days   = 30
  serverless_min_capacity = 2
  serverless_max_capacity = 64

  alarm_sns_arns = [module.monitoring.critical_sns_topic_arn]
}

###############################################################################
# ElastiCache Redis (production: multi-AZ, cache.r7g.large)
###############################################################################

module "elasticache" {
  source = "../../modules/elasticache"

  project     = "gridmind"
  environment = "production"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  allowed_security_group_ids = [module.eks.node_security_group_id]

  node_type               = "cache.r7g.large"
  num_cache_clusters      = 3
  snapshot_retention_days = 14

  alarm_sns_arns = [module.monitoring.critical_sns_topic_arn]
}

###############################################################################
# NATS (production: 3-node cluster, c5.large)
###############################################################################

module "nats" {
  source = "../../modules/nats"

  project     = "gridmind"
  environment = "production"
  aws_region  = var.aws_region

  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnets
  kms_key_arn        = module.iam.kms_key_arn

  client_security_group_ids = [module.eks.node_security_group_id]

  instance_type           = "c5.large"
  cluster_size            = 3
  data_volume_size_gb     = 100
  jetstream_max_memory_mb = 4096
  jetstream_max_file_gb   = 90
}

###############################################################################
# Vault (production: 3 replicas HA)
###############################################################################

module "vault" {
  source = "../../modules/vault"

  project     = "gridmind"
  environment = "production"
  aws_region  = var.aws_region
  kms_key_arn = module.iam.kms_key_arn

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  replica_count = 3
  storage_size  = "20Gi"
}

###############################################################################
# ALB + WAF (production: real domains)
###############################################################################

module "alb" {
  source = "../../modules/alb"

  project     = "gridmind"
  environment = "production"

  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnets
  route53_zone_id   = var.route53_zone_id
  root_domain       = var.root_domain

  gateway_domain    = "api.${var.root_domain}"
  admin_domain      = "admin.${var.root_domain}"
  portal_domain     = "app.${var.root_domain}"
  superadmin_domain = "platform.${var.root_domain}"
  access_log_bucket = var.access_log_bucket
}

###############################################################################
# Monitoring (production: 30-day retention, full alerting)
###############################################################################

module "monitoring" {
  source = "../../modules/monitoring"

  project     = "gridmind"
  environment = "production"
  aws_region  = var.aws_region
  kms_key_arn = module.iam.kms_key_arn

  alb_arn_suffix             = module.alb.alb_arn
  aurora_cluster_id          = module.aurora.cluster_id
  redis_replication_group_id = module.elasticache.replication_group_id

  critical_alert_emails     = var.alert_emails
  log_retention_days        = 90
  prometheus_retention_days = 30
  prometheus_storage_size   = "100Gi"
  grafana_admin_password    = var.grafana_admin_password
}
