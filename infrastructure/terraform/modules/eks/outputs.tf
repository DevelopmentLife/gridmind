###############################################################################
# GridMind — EKS Module Outputs
###############################################################################

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.this.name
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = aws_eks_cluster.this.arn
}

output "cluster_endpoint" {
  description = "HTTPS endpoint of the EKS API server"
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded certificate authority data for the cluster"
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster control plane"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "Security group ID attached to EKS node groups"
  value       = aws_security_group.node.id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN of the EKS cluster"
  value       = aws_iam_role.cluster.arn
}

output "node_iam_role_arn" {
  description = "IAM role ARN of the EKS node group"
  value       = aws_iam_role.node.arn
}

output "node_iam_role_name" {
  description = "IAM role name of the EKS node group"
  value       = aws_iam_role.node.name
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC identity provider (for IRSA)"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC identity provider (for IRSA trust policies)"
  value       = aws_iam_openid_connect_provider.eks.url
}

output "system_node_group_arn" {
  description = "ARN of the system node group"
  value       = aws_eks_node_group.system.arn
}

output "application_node_group_arn" {
  description = "ARN of the application node group"
  value       = aws_eks_node_group.application.arn
}
