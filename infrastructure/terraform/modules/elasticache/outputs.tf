###############################################################################
# GridMind — ElastiCache Module Outputs
###############################################################################

output "replication_group_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.this.id
}

output "primary_endpoint" {
  description = "Primary endpoint address for read/write operations"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address for read-only operations"
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.this.port
}

output "security_group_id" {
  description = "Security group ID for the Redis cluster"
  value       = aws_security_group.redis.id
}

output "auth_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth.arn
}

output "connection_url_template" {
  description = "Redis connection URL template (use auth token from Secrets Manager)"
  value       = "rediss://:AUTH_TOKEN@${aws_elasticache_replication_group.this.primary_endpoint_address}:${var.port}/0"
  sensitive   = true
}
