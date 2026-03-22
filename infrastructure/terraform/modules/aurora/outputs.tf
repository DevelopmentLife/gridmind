###############################################################################
# GridMind — Aurora Module Outputs
###############################################################################

output "cluster_id" {
  description = "Aurora cluster identifier"
  value       = aws_rds_cluster.this.cluster_identifier
}

output "cluster_arn" {
  description = "Aurora cluster ARN"
  value       = aws_rds_cluster.this.arn
}

output "writer_endpoint" {
  description = "Aurora cluster writer endpoint"
  value       = aws_rds_cluster.this.endpoint
}

output "reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = aws_rds_cluster.this.reader_endpoint
}

output "port" {
  description = "Aurora cluster port"
  value       = aws_rds_cluster.this.port
}

output "database_name" {
  description = "Database name"
  value       = aws_rds_cluster.this.database_name
}

output "security_group_id" {
  description = "Security group ID for the Aurora cluster"
  value       = aws_security_group.aurora.id
}

output "master_secret_arn" {
  description = "ARN of the Secrets Manager secret containing master credentials"
  value       = aws_secretsmanager_secret.aurora_master.arn
}

output "subnet_group_name" {
  description = "DB subnet group name"
  value       = aws_db_subnet_group.this.name
}
