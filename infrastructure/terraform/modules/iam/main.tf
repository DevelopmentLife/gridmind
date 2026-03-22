###############################################################################
# GridMind — IAM Module
# Provisions: IRSA roles per service, CI/CD role, KMS key, base policies
###############################################################################

locals {
  name = "${var.project}-${var.environment}"

  oidc_sub = replace(var.oidc_provider_url, "https://", "")

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "iam"
  }
}

###############################################################################
# KMS Customer Managed Key (shared across services)
###############################################################################

resource "aws_kms_key" "main" {
  description             = "GridMind ${var.environment} — primary CMK for secrets and storage"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  multi_region            = false

  policy = data.aws_iam_policy_document.kms_policy.json

  tags = merge(local.common_tags, { Purpose = "primary-cmk" })
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name}-primary"
  target_key_id = aws_kms_key.main.id
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "kms_policy" {
  statement {
    sid     = "EnableRootAccess"
    effect  = "Allow"
    actions = ["kms:*"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    resources = ["*"]
  }

  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]
    principals {
      type        = "Service"
      identifiers = ["logs.${var.aws_region}.amazonaws.com"]
    }
    resources = ["*"]
  }
}

###############################################################################
# Helper: IRSA assume-role policy factory
###############################################################################

locals {
  service_accounts = {
    gateway    = { namespace = var.app_namespace, sa = "gateway" }
    cortex     = { namespace = var.app_namespace, sa = "cortex" }
    admin      = { namespace = var.app_namespace, sa = "admin" }
    portal     = { namespace = var.app_namespace, sa = "portal" }
    superadmin = { namespace = var.app_namespace, sa = "superadmin" }
  }
}

data "aws_iam_policy_document" "irsa_assume" {
  for_each = local.service_accounts

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_sub}:sub"
      values   = ["system:serviceaccount:${each.value.namespace}:${each.value.sa}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_sub}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

###############################################################################
# Service IRSA Roles
###############################################################################

resource "aws_iam_role" "service" {
  for_each = local.service_accounts

  name               = "${local.name}-${each.key}-irsa"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume[each.key].json
  tags               = merge(local.common_tags, { Service = each.key })
}

###############################################################################
# Gateway IRSA Policy — Secrets Manager + CloudWatch
###############################################################################

data "aws_iam_policy_document" "gateway" {
  statement {
    sid    = "SecretsManagerRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/*",
    ]
  }

  statement {
    sid    = "KMSDecrypt"
    effect = "Allow"
    actions = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [aws_kms_key.main.arn]
  }

  statement {
    sid    = "CloudWatchMetrics"
    effect = "Allow"
    actions = [
      "cloudwatch:PutMetricData",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "gateway" {
  name   = "${local.name}-gateway-policy"
  role   = aws_iam_role.service["gateway"].id
  policy = data.aws_iam_policy_document.gateway.json
}

###############################################################################
# Cortex IRSA Policy — Secrets Manager + CloudWatch + Anthropic (via NATS)
###############################################################################

data "aws_iam_policy_document" "cortex" {
  statement {
    sid    = "SecretsManagerRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/*",
    ]
  }

  statement {
    sid    = "KMSDecrypt"
    effect = "Allow"
    actions = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [aws_kms_key.main.arn]
  }

  statement {
    sid    = "CloudWatchMetrics"
    effect = "Allow"
    actions = [
      "cloudwatch:PutMetricData",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cortex" {
  name   = "${local.name}-cortex-policy"
  role   = aws_iam_role.service["cortex"].id
  policy = data.aws_iam_policy_document.cortex.json
}

###############################################################################
# Frontend IRSA Policies (admin, portal, superadmin) — read-only secrets
###############################################################################

data "aws_iam_policy_document" "frontend" {
  statement {
    sid    = "SecretsManagerRead"
    effect = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/frontend/*",
    ]
  }

  statement {
    sid    = "KMSDecrypt"
    effect = "Allow"
    actions = ["kms:Decrypt"]
    resources = [aws_kms_key.main.arn]
  }
}

resource "aws_iam_role_policy" "frontend" {
  for_each = toset(["admin", "portal", "superadmin"])

  name   = "${local.name}-${each.key}-policy"
  role   = aws_iam_role.service[each.key].id
  policy = data.aws_iam_policy_document.frontend.json
}

###############################################################################
# CI/CD Role — ECR push + EKS deployment
###############################################################################

data "aws_iam_policy_document" "cicd_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "cicd" {
  name               = "${local.name}-cicd"
  assume_role_policy = data.aws_iam_policy_document.cicd_assume.json
  tags               = local.common_tags
}

data "aws_iam_policy_document" "cicd" {
  statement {
    sid    = "ECRAuth"
    effect = "Allow"
    actions = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "ECRPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [
      "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${var.project}/*",
    ]
  }

  statement {
    sid    = "EKSDeploy"
    effect = "Allow"
    actions = [
      "eks:DescribeCluster",
      "eks:ListClusters",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cicd" {
  name   = "${local.name}-cicd-policy"
  role   = aws_iam_role.cicd.id
  policy = data.aws_iam_policy_document.cicd.json
}
