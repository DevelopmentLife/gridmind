###############################################################################
# GridMind — ECR Repositories Module
# Provisions: ECR repos for all 5 services + lifecycle policies + scan-on-push
###############################################################################

locals {
  services = ["cortex", "gateway", "admin", "portal", "superadmin"]

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "ecr"
  }
}

###############################################################################
# ECR Repositories
###############################################################################

resource "aws_ecr_repository" "services" {
  for_each = toset(local.services)

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = merge(local.common_tags, { Service = each.key })
}

###############################################################################
# Lifecycle Policies
###############################################################################

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged production images"
        selection = {
          tagStatus      = "tagged"
          tagPrefixList  = ["v"]
          countType      = "imageCountMoreThan"
          countNumber    = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Keep max 30 total images per repo"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

###############################################################################
# Repository Policies — allow EKS node role to pull
###############################################################################

data "aws_iam_policy_document" "ecr_pull" {
  for_each = toset(local.services)

  statement {
    sid    = "AllowEKSNodePull"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = var.eks_node_role_arns
    }

    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
  }

  statement {
    sid    = "AllowCICDPush"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = var.cicd_role_arns
    }

    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
  }
}

resource "aws_ecr_repository_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name
  policy     = data.aws_iam_policy_document.ecr_pull[each.key].json
}

###############################################################################
# ECR Pull-through cache for public images (optional cost optimization)
###############################################################################

resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "CONTINUOUS_SCAN"
    repository_filter {
      filter      = "${var.project}/*"
      filter_type = "WILDCARD"
    }
  }
}
