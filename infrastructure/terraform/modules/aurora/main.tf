###############################################################################
# GridMind — Aurora PostgreSQL 16 Module
# Provisions: Aurora cluster, instances, subnet group, parameter groups, secrets
###############################################################################

locals {
  cluster_id = "${var.project}-${var.environment}-aurora"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "aurora"
  }
}

###############################################################################
# Random password for master user (stored in Secrets Manager)
###############################################################################

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "aurora_master" {
  name                    = "${var.project}/${var.environment}/aurora/master"
  description             = "Aurora PostgreSQL master credentials for ${local.cluster_id}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  tags                    = local.common_tags
}

resource "aws_secretsmanager_secret_version" "aurora_master" {
  secret_id = aws_secretsmanager_secret.aurora_master.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    host     = aws_rds_cluster.this.endpoint
    port     = aws_rds_cluster.this.port
    dbname   = var.database_name
  })
}

###############################################################################
# DB Subnet Group
###############################################################################

resource "aws_db_subnet_group" "this" {
  name        = local.cluster_id
  description = "Subnet group for ${local.cluster_id}"
  subnet_ids  = var.private_subnet_ids
  tags        = local.common_tags
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "aurora" {
  name        = "${local.cluster_id}-sg"
  description = "Security group for Aurora cluster ${local.cluster_id}"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "PostgreSQL from application security groups"
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
# Cluster Parameter Group
###############################################################################

resource "aws_rds_cluster_parameter_group" "this" {
  name        = "${local.cluster_id}-pg16"
  family      = "aurora-postgresql16"
  description = "Aurora PostgreSQL 16 cluster parameter group for ${local.cluster_id}"

  parameter {
    name  = "timezone"
    value = "UTC"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = local.common_tags
}

###############################################################################
# DB Parameter Group (instance-level)
###############################################################################

resource "aws_db_parameter_group" "this" {
  name        = "${local.cluster_id}-instance-pg16"
  family      = "aurora-postgresql16"
  description = "Aurora PostgreSQL 16 instance parameter group for ${local.cluster_id}"

  parameter {
    name  = "log_autovacuum_min_duration"
    value = "250"
  }

  tags = local.common_tags
}

###############################################################################
# Aurora Cluster
###############################################################################

resource "aws_rds_cluster" "this" {
  cluster_identifier              = local.cluster_id
  engine                          = "aurora-postgresql"
  engine_version                  = var.engine_version
  engine_mode                     = "provisioned"
  database_name                   = var.database_name
  master_username                 = var.master_username
  master_password                 = random_password.master.result
  db_subnet_group_name            = aws_db_subnet_group.this.name
  vpc_security_group_ids          = [aws_security_group.aurora.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.this.name

  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  backup_retention_period      = var.backup_retention_days
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.cluster_id}-final" : null

  enabled_cloudwatch_logs_exports = ["postgresql"]

  apply_immediately = var.environment != "production"

  serverlessv2_scaling_configuration {
    max_capacity = var.serverless_max_capacity
    min_capacity = var.serverless_min_capacity
  }

  tags = local.common_tags

  lifecycle {
    ignore_changes = [master_password]
  }
}

###############################################################################
# Aurora Instances
###############################################################################

resource "aws_rds_cluster_instance" "writer" {
  count = 1

  identifier              = "${local.cluster_id}-writer"
  cluster_identifier      = aws_rds_cluster.this.id
  instance_class          = var.instance_class
  engine                  = aws_rds_cluster.this.engine
  engine_version          = aws_rds_cluster.this.engine_version
  db_parameter_group_name = aws_db_parameter_group.this.name
  db_subnet_group_name    = aws_db_subnet_group.this.name

  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.kms_key_arn
  performance_insights_retention_period = var.environment == "production" ? 731 : 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  auto_minor_version_upgrade = true
  apply_immediately          = var.environment != "production"

  tags = merge(local.common_tags, { Role = "writer" })
}

resource "aws_rds_cluster_instance" "reader" {
  count = var.reader_count

  identifier              = "${local.cluster_id}-reader-${count.index + 1}"
  cluster_identifier      = aws_rds_cluster.this.id
  instance_class          = var.instance_class
  engine                  = aws_rds_cluster.this.engine
  engine_version          = aws_rds_cluster.this.engine_version
  db_parameter_group_name = aws_db_parameter_group.this.name
  db_subnet_group_name    = aws_db_subnet_group.this.name

  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.kms_key_arn
  performance_insights_retention_period = var.environment == "production" ? 731 : 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  auto_minor_version_upgrade = true
  apply_immediately          = var.environment != "production"

  tags = merge(local.common_tags, { Role = "reader" })
}

###############################################################################
# Enhanced Monitoring IAM Role
###############################################################################

data "aws_iam_policy_document" "rds_monitoring_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["monitoring.rds.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  name               = "${local.cluster_id}-rds-monitoring"
  assume_role_policy = data.aws_iam_policy_document.rds_monitoring_assume.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

###############################################################################
# CloudWatch Alarms
###############################################################################

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.cluster_id}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Aurora CPU utilization above 80% for ${local.cluster_id}"
  alarm_actions       = var.alarm_sns_arns

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.this.cluster_identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "freeable_memory_low" {
  alarm_name          = "${local.cluster_id}-memory-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 256000000
  alarm_description   = "Aurora freeable memory below 256MB for ${local.cluster_id}"
  alarm_actions       = var.alarm_sns_arns

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.this.cluster_identifier
  }

  tags = local.common_tags
}
