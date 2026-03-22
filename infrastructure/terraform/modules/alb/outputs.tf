###############################################################################
# GridMind — ALB Module Outputs
###############################################################################

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (for Route53 alias records)"
  value       = aws_lb.main.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID attached to the ALB"
  value       = aws_security_group.alb.id
}

output "https_listener_arn" {
  description = "HTTPS listener ARN"
  value       = aws_lb_listener.https.arn
}

output "certificate_arn" {
  description = "ACM wildcard certificate ARN"
  value       = aws_acm_certificate_validation.wildcard.certificate_arn
}

output "waf_web_acl_arn" {
  description = "WAFv2 WebACL ARN"
  value       = aws_wafv2_web_acl.main.arn
}

output "target_group_arns" {
  description = "Map of service name to target group ARN"
  value = {
    gateway    = aws_lb_target_group.gateway.arn
    admin      = aws_lb_target_group.admin.arn
    portal     = aws_lb_target_group.portal.arn
    superadmin = aws_lb_target_group.superadmin.arn
  }
}
