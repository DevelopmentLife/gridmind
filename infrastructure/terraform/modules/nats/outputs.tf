###############################################################################
# GridMind — NATS Module Outputs
###############################################################################

output "nlb_dns_name" {
  description = "Internal NLB DNS name for NATS client connections"
  value       = aws_lb.nats.dns_name
}

output "client_url" {
  description = "NATS client connection URL"
  value       = "nats://${aws_lb.nats.dns_name}:4222"
}

output "security_group_id" {
  description = "Security group ID for NATS nodes"
  value       = aws_security_group.nats.id
}

output "credentials_secret_arn" {
  description = "Secrets Manager ARN containing NATS credentials"
  value       = aws_secretsmanager_secret.nats_creds.arn
}

output "asg_name" {
  description = "Auto Scaling Group name for NATS cluster"
  value       = aws_autoscaling_group.nats.name
}
