###############################################################################
# GridMind — ElastiCache Redis 7 Module
# Provisions: Redis replication group, subnet group, parameter group, secrets
###############################################################################

locals {
  cluster_id = "${var.project}-${var.environment}-redis"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "elasticache"
  }
}

###############################################################################
# Random auth token stored in Secrets Manager
###############################################################################

resource "random_password" "auth_token" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "redis_auth" {
  name                    = "${var.project}/${var.environment}/redis/auth-token"
  description             = "Redis AUTH token for ${local.cluster_id}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  tags                    = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token        = random_password.auth_token.result
    primary_endpoint  = "${aws_elasticache_replication_group.this.primary_endpoint_address}:${var.port}"
    reader_endpoint   = "${aws_elasticache_replication_group.this.reader_endpoint_address}:${var.port}"
  })
}

###############################################################################
# Subnet Group
###############################################################################

resource "aws_elasticache_subnet_group" "this" {
  name        = local.cluster_id
  description = "ElastiCache subnet group for ${local.cluster_id}"
  subnet_ids  = var.private_subnet_ids
  tags        = local.common_tags
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "redis" {
  name        = "${local.cluster_id}-sg"
  description = "Security group for ElastiCache Redis ${local.cluster_id}"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Redis from application security groups"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(local.common_tags, { Name = "${local.cluster_id}-sg" })
}

###############################################################################
# Parameter Group
###############################################################################

resource "aws_elasticache_parameter_group" "this" {
  name        = "${local.cluster_id}-redis7"
  family      = "redis7"
  description = "Redis 7 parameter group for ${local.cluster_id}"

  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  parameter {
    name  = "activerehashing"
    value = "yes"
  }

  parameter {
    name  = "lazyfree-lazy-eviction"
    value = "yes"
  }

  parameter {
    name  = "lazyfree-lazy-expire"
    value = "yes"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = ""
  }

  parameter {
    name  = "slowlog-log-slower-than"
    value = "10000"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = local.common_tags
}

###############################################################################
# Replication Group
###############################################################################

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = local.cluster_id
  description          = "GridMind Redis 7 cluster for ${var.environment}"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = var.port
  parameter_group_name = aws_elasticache_parameter_group.this.name
  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [aws_security_group.redis.id]

  num_cache_clusters        = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1

  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = random_password.auth_token.result
  kms_key_id                  = var.kms_key_arn

  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "04:00-05:00"
  snapshot_retention_limit = var.snapshot_retention_days

  apply_immediately          = var.environment != "production"
  auto_minor_version_upgrade = true

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = local.common_tags
}

###############################################################################
# CloudWatch Log Groups
###############################################################################

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/gridmind/${var.environment}/redis/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "redis_engine" {
  name              = "/gridmind/${var.environment}/redis/engine-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
  tags              = local.common_tags
}

###############################################################################
# CloudWatch Alarms
###############################################################################

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.cluster_id}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU utilization above 80%"
  alarm_actions       = var.alarm_sns_arns

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.this.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${local.cluster_id}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage above 80%"
  alarm_actions       = var.alarm_sns_arns

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.this.id
  }

  tags = local.common_tags
}
