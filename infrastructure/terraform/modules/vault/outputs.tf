###############################################################################
# GridMind — Vault Module Outputs
###############################################################################

output "vault_irsa_role_arn" {
  description = "IAM role ARN for Vault IRSA"
  value       = aws_iam_role.vault.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB table name used as Vault HA storage backend"
  value       = aws_dynamodb_table.vault.name
}

output "unseal_kms_key_id" {
  description = "KMS key ID used for Vault auto-unseal"
  value       = aws_kms_key.vault_unseal.id
}

output "unseal_kms_key_arn" {
  description = "KMS key ARN used for Vault auto-unseal"
  value       = aws_kms_key.vault_unseal.arn
}

output "init_secret_arn" {
  description = "Secrets Manager ARN for Vault init keys (operator managed)"
  value       = aws_secretsmanager_secret.vault_init.arn
}

output "vault_namespace" {
  description = "Kubernetes namespace where Vault is deployed"
  value       = var.vault_namespace
}

output "vault_service_url" {
  description = "Internal Vault service URL"
  value       = "http://vault.${var.vault_namespace}.svc.cluster.local:8200"
}
