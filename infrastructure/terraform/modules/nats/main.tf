###############################################################################
# GridMind — NATS JetStream Module
# Provisions: EC2 instances for NATS cluster, security groups, NLB, IAM
# NATS runs on EC2 (not EKS) for low-latency, durable messaging
###############################################################################

locals {
  cluster_name = "${var.project}-${var.environment}-nats"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "nats"
  }
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "nats" {
  name        = "${local.cluster_name}-sg"
  description = "Security group for NATS cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 4222
    to_port         = 4222
    protocol        = "tcp"
    security_groups = var.client_security_group_ids
    description     = "NATS client connections from application security groups"
  }

  ingress {
    from_port = 6222
    to_port   = 6222
    protocol  = "tcp"
    self      = true
    description = "NATS cluster routing (inter-node)"
  }

  ingress {
    from_port = 8222
    to_port   = 8222
    protocol  = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "NATS HTTP monitoring endpoint (VPC only)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(local.common_tags, { Name = "${local.cluster_name}-sg" })
}

###############################################################################
# IAM Role for EC2 instances
###############################################################################

data "aws_iam_policy_document" "nats_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "nats" {
  name               = "${local.cluster_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.nats_assume_role.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.nats.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "nats_secrets" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.nats_creds.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "nats_secrets" {
  name   = "${local.cluster_name}-secrets-policy"
  role   = aws_iam_role.nats.id
  policy = data.aws_iam_policy_document.nats_secrets.json
}

resource "aws_iam_instance_profile" "nats" {
  name = "${local.cluster_name}-instance-profile"
  role = aws_iam_role.nats.name
  tags = local.common_tags
}

###############################################################################
# Credentials secret
###############################################################################

resource "random_password" "nats_sys_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "nats_creds" {
  name                    = "${var.project}/${var.environment}/nats/credentials"
  description             = "NATS system account credentials"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  tags                    = local.common_tags
}

resource "aws_secretsmanager_secret_version" "nats_creds" {
  secret_id = aws_secretsmanager_secret.nats_creds.id
  secret_string = jsonencode({
    sys_password = random_password.nats_sys_password.result
    cluster_url  = "nats://${aws_lb.nats.dns_name}:4222"
  })
}

###############################################################################
# Launch Template
###############################################################################

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_launch_template" "nats" {
  name_prefix   = "${local.cluster_name}-"
  description   = "NATS JetStream node launch template"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.nats.name
  }

  vpc_security_group_ids = [aws_security_group.nats.id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.data_volume_size_gb
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      encrypted             = true
      kms_key_id            = var.kms_key_arn
      delete_on_termination = false
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring {
    enabled = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh.tpl", {
    nats_version         = var.nats_version
    cluster_name         = local.cluster_name
    environment          = var.environment
    secret_arn           = aws_secretsmanager_secret.nats_creds.arn
    aws_region           = var.aws_region
    jetstream_max_memory = var.jetstream_max_memory_mb
    jetstream_max_file   = var.jetstream_max_file_gb
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.common_tags, { Name = "${local.cluster_name}-node" })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = merge(local.common_tags, { Name = "${local.cluster_name}-data" })
  }

  tags = local.common_tags
}

###############################################################################
# Auto Scaling Group
###############################################################################

resource "aws_autoscaling_group" "nats" {
  name                = local.cluster_name
  desired_capacity    = var.cluster_size
  min_size            = var.cluster_size
  max_size            = var.cluster_size
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.nats.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.nats_client.arn]

  health_check_type         = "ELB"
  health_check_grace_period = 120

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 67
    }
  }

  tag {
    key                 = "Project"
    value               = var.project
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "terraform"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "${local.cluster_name}-node"
    propagate_at_launch = true
  }
}

###############################################################################
# Network Load Balancer (internal)
###############################################################################

resource "aws_lb" "nats" {
  name               = local.cluster_name
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids

  enable_deletion_protection       = var.environment == "production"
  enable_cross_zone_load_balancing = true

  tags = local.common_tags
}

resource "aws_lb_target_group" "nats_client" {
  name     = "${local.cluster_name}-client"
  port     = 4222
  protocol = "TCP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    protocol            = "HTTP"
    port                = "8222"
    path                = "/healthz"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "nats_client" {
  load_balancer_arn = aws_lb.nats.arn
  port              = 4222
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nats_client.arn
  }

  tags = local.common_tags
}
