###############################################################################
# GridMind — ALB + WAF + ACM Module
# Provisions: Application Load Balancer, WAFv2 WebACL, ACM certificates,
#             Route53 records, security groups
###############################################################################

locals {
  name = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "alb"
  }

  domains = {
    gateway    = var.gateway_domain
    admin      = var.admin_domain
    portal     = var.portal_domain
    superadmin = var.superadmin_domain
  }
}

###############################################################################
# ACM Certificates
###############################################################################

resource "aws_acm_certificate" "wildcard" {
  domain_name               = var.root_domain
  subject_alternative_names = ["*.${var.root_domain}"]
  validation_method         = "DNS"

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "Security group for public ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP for redirect to HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(local.common_tags, { Name = "${local.name}-alb-sg" })
}

###############################################################################
# WAFv2 Web ACL
###############################################################################

resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name}-waf"
  description = "WAF WebACL for ${local.name} ALB"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Managed Rules — Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules — Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules — SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-sqli"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting — 2000 req/5min per IP
  rule {
    name     = "RateLimitPerIP"
    priority = 40

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-waf"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

###############################################################################
# Application Load Balancer
###############################################################################

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production"
  drop_invalid_header_fields = true
  enable_http2               = true

  access_logs {
    bucket  = var.access_log_bucket
    prefix  = "${var.project}/${var.environment}/alb"
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

###############################################################################
# HTTP → HTTPS Redirect Listener
###############################################################################

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = local.common_tags
}

###############################################################################
# HTTPS Listener
###############################################################################

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.wildcard.certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }

  tags = local.common_tags
}

###############################################################################
# Target Groups (one per service, EKS NodePort or IP-mode)
###############################################################################

resource "aws_lb_target_group" "gateway" {
  name        = "${local.name}-gateway"
  port        = var.gateway_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    port                = "traffic-port"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = merge(local.common_tags, { Service = "gateway" })
}

resource "aws_lb_target_group" "admin" {
  name        = "${local.name}-admin"
  port        = var.admin_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  deregistration_delay = 30
  tags = merge(local.common_tags, { Service = "admin" })
}

resource "aws_lb_target_group" "portal" {
  name        = "${local.name}-portal"
  port        = var.portal_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  deregistration_delay = 30
  tags = merge(local.common_tags, { Service = "portal" })
}

resource "aws_lb_target_group" "superadmin" {
  name        = "${local.name}-superadmin"
  port        = var.superadmin_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  deregistration_delay = 30
  tags = merge(local.common_tags, { Service = "superadmin" })
}

###############################################################################
# Listener Rules
###############################################################################

resource "aws_lb_listener_rule" "gateway" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }

  condition {
    host_header {
      values = [var.gateway_domain]
    }
  }

  tags = local.common_tags
}

resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 110

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    host_header {
      values = [var.admin_domain]
    }
  }

  tags = local.common_tags
}

resource "aws_lb_listener_rule" "portal" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 120

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.portal.arn
  }

  condition {
    host_header {
      values = [var.portal_domain]
    }
  }

  tags = local.common_tags
}

resource "aws_lb_listener_rule" "superadmin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 130

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.superadmin.arn
  }

  condition {
    host_header {
      values = [var.superadmin_domain]
    }
  }

  tags = local.common_tags
}

###############################################################################
# Route53 DNS Records
###############################################################################

resource "aws_route53_record" "gateway" {
  zone_id = var.route53_zone_id
  name    = var.gateway_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "admin" {
  zone_id = var.route53_zone_id
  name    = var.admin_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "portal" {
  zone_id = var.route53_zone_id
  name    = var.portal_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "superadmin" {
  zone_id = var.route53_zone_id
  name    = var.superadmin_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
