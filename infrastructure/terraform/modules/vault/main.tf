###############################################################################
# GridMind — HashiCorp Vault HA Module
# Provisions: Vault Helm release on EKS, DynamoDB backend, KMS auto-unseal,
#             IAM/IRSA, Secrets Manager bootstrap token
###############################################################################

locals {
  name = "${var.project}-${var.environment}-vault"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "vault"
  }
}

###############################################################################
# DynamoDB Table — Vault HA storage backend
###############################################################################

resource "aws_dynamodb_table" "vault" {
  name         = local.name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "Path"
  range_key    = "Key"

  attribute {
    name = "Path"
    type = "S"
  }

  attribute {
    name = "Key"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = local.common_tags
}

###############################################################################
# KMS Key — Vault auto-unseal
###############################################################################

resource "aws_kms_key" "vault_unseal" {
  description             = "Vault auto-unseal key for ${local.name}"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  tags                    = merge(local.common_tags, { Purpose = "vault-unseal" })
}

resource "aws_kms_alias" "vault_unseal" {
  name          = "alias/${local.name}-unseal"
  target_key_id = aws_kms_key.vault_unseal.id
}

###############################################################################
# IRSA — Vault service account IAM role
###############################################################################

data "aws_iam_policy_document" "vault_irsa_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${var.vault_namespace}:vault"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "vault" {
  name               = "${local.name}-irsa"
  assume_role_policy = data.aws_iam_policy_document.vault_irsa_assume.json
  tags               = local.common_tags
}

data "aws_iam_policy_document" "vault_permissions" {
  statement {
    sid     = "VaultDynamoDB"
    effect  = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeLimits",
      "dynamodb:DescribeReservedCapacity",
      "dynamodb:DescribeReservedCapacityOfferings",
      "dynamodb:DescribeTable",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:GetItem",
      "dynamodb:GetRecords",
      "dynamodb:ListTables",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.vault.arn]
  }

  statement {
    sid     = "VaultKMSUnseal"
    effect  = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey",
    ]
    resources = [aws_kms_key.vault_unseal.arn]
  }
}

resource "aws_iam_role_policy" "vault" {
  name   = "${local.name}-policy"
  role   = aws_iam_role.vault.id
  policy = data.aws_iam_policy_document.vault_permissions.json
}

###############################################################################
# Kubernetes namespace
###############################################################################

resource "kubernetes_namespace" "vault" {
  metadata {
    name = var.vault_namespace
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
      "project"                      = var.project
      "environment"                  = var.environment
    }
  }
}

###############################################################################
# Vault Helm release
###############################################################################

resource "helm_release" "vault" {
  name       = "vault"
  repository = "https://helm.releases.hashicorp.com"
  chart      = "vault"
  version    = var.vault_helm_version
  namespace  = var.vault_namespace

  values = [
    templatefile("${path.module}/vault-values.yaml.tpl", {
      environment         = var.environment
      aws_region          = var.aws_region
      kms_key_id          = aws_kms_key.vault_unseal.id
      dynamodb_table      = aws_dynamodb_table.vault.name
      irsa_role_arn       = aws_iam_role.vault.arn
      replica_count       = var.replica_count
      storage_size        = var.storage_size
      vault_image_tag     = var.vault_image_tag
    })
  ]

  set_sensitive {
    name  = "server.ha.raft.enabled"
    value = "false"
  }

  depends_on = [
    kubernetes_namespace.vault,
    aws_dynamodb_table.vault,
    aws_iam_role_policy.vault,
  ]
}

###############################################################################
# Bootstrap secret — initial root token (created by operator, not Terraform)
###############################################################################

resource "aws_secretsmanager_secret" "vault_init" {
  name                    = "${var.project}/${var.environment}/vault/init"
  description             = "Vault init keys for ${local.name} — OPERATOR MANAGED"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30
  tags                    = merge(local.common_tags, { Sensitivity = "critical" })
}
