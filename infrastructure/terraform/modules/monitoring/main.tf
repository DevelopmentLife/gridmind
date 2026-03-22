###############################################################################
# GridMind — Monitoring Module
# Provisions: CloudWatch log groups, dashboards, alarms, SNS topics,
#             Prometheus/Grafana via Helm on EKS
###############################################################################

locals {
  name = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "monitoring"
  }
}

###############################################################################
# SNS Topics for Alerting
###############################################################################

resource "aws_sns_topic" "alerts_critical" {
  name              = "${local.name}-alerts-critical"
  kms_master_key_id = var.kms_key_arn
  tags              = local.common_tags
}

resource "aws_sns_topic" "alerts_warning" {
  name              = "${local.name}-alerts-warning"
  kms_master_key_id = var.kms_key_arn
  tags              = local.common_tags
}

resource "aws_sns_topic_subscription" "critical_email" {
  for_each = toset(var.critical_alert_emails)

  topic_arn = aws_sns_topic.alerts_critical.arn
  protocol  = "email"
  endpoint  = each.value
}

###############################################################################
# CloudWatch Log Groups
###############################################################################

locals {
  log_groups = [
    "/gridmind/${var.environment}/gateway",
    "/gridmind/${var.environment}/cortex",
    "/gridmind/${var.environment}/admin",
    "/gridmind/${var.environment}/portal",
    "/gridmind/${var.environment}/superadmin",
    "/gridmind/${var.environment}/eks/api",
    "/gridmind/${var.environment}/eks/audit",
  ]
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(local.log_groups)

  name              = each.value
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
  tags              = local.common_tags
}

###############################################################################
# CloudWatch Metric Alarms — Application
###############################################################################

resource "aws_cloudwatch_metric_alarm" "api_5xx_high" {
  alarm_name          = "${local.name}-api-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.error_rate_threshold
  alarm_description   = "API 5XX error rate elevated for ${local.name}"
  alarm_actions       = [aws_sns_topic.alerts_critical.arn]
  ok_actions          = [aws_sns_topic.alerts_warning.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_p99_latency" {
  alarm_name          = "${local.name}-api-p99-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  extended_statistic  = "p99"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  threshold           = 0.5
  alarm_description   = "API P99 latency > 500ms for ${local.name}"
  alarm_actions       = [aws_sns_topic.alerts_warning.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = local.common_tags
}

###############################################################################
# CloudWatch Dashboard
###############################################################################

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "API Request Rate"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum", period = 60 }]
          ]
          view    = "timeSeries"
          stacked = false
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "API Error Rate (5XX)"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "5XXError", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum", period = 60 }]
          ]
          view    = "timeSeries"
          stacked = false
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Aurora CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", var.aurora_cluster_id, { stat = "Average", period = 60 }]
          ]
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Redis CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "ReplicationGroupId", var.redis_replication_group_id, { stat = "Average", period = 60 }]
          ]
          view  = "timeSeries"
        }
      }
    ]
  })
}

###############################################################################
# Prometheus + Grafana via Helm (kube-prometheus-stack)
###############################################################################

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
      project                         = var.project
      environment                     = var.environment
    }
  }
}

resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = var.prometheus_stack_version
  namespace  = "monitoring"

  values = [
    templatefile("${path.module}/prometheus-values.yaml.tpl", {
      environment         = var.environment
      grafana_admin_password = var.grafana_admin_password
      storage_class       = "gp3"
      retention_days      = var.prometheus_retention_days
      storage_size        = var.prometheus_storage_size
    })
  ]

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }

  depends_on = [kubernetes_namespace.monitoring]
}
