###############################################################################
# GridMind — IAM Module Outputs
###############################################################################

output "kms_key_arn" {
  description = "Primary KMS CMK ARN"
  value       = aws_kms_key.main.arn
}

output "kms_key_id" {
  description = "Primary KMS CMK ID"
  value       = aws_kms_key.main.id
}

output "service_irsa_role_arns" {
  description = "Map of service name to IRSA role ARN"
  value = {
    for k, v in aws_iam_role.service : k => v.arn
  }
}

output "cicd_role_arn" {
  description = "CI/CD GitHub Actions IAM role ARN"
  value       = aws_iam_role.cicd.arn
}

output "gateway_irsa_role_arn" {
  description = "Gateway IRSA role ARN"
  value       = aws_iam_role.service["gateway"].arn
}

output "cortex_irsa_role_arn" {
  description = "Cortex IRSA role ARN"
  value       = aws_iam_role.service["cortex"].arn
}
