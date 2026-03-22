###############################################################################
# GridMind — Monitoring Module Outputs
###############################################################################

output "critical_sns_topic_arn" {
  description = "SNS topic ARN for critical alerts"
  value       = aws_sns_topic.alerts_critical.arn
}

output "warning_sns_topic_arn" {
  description = "SNS topic ARN for warning alerts"
  value       = aws_sns_topic.alerts_warning.arn
}

output "log_group_names" {
  description = "Map of log group names created"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.name }
}

output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}
