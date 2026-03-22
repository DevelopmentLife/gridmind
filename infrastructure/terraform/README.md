# GridMind Terraform Infrastructure

All AWS infrastructure for GridMind, managed with Terraform 1.7+.

## Structure

```
terraform/
├── modules/          # Reusable modules (one per AWS service)
│   ├── eks/          # EKS cluster + node groups + IRSA + addons
│   ├── aurora/       # Aurora PostgreSQL 16 cluster
│   ├── elasticache/  # Redis 7 ElastiCache
│   ├── nats/         # NATS JetStream on EC2
│   ├── vault/        # HashiCorp Vault HA on EKS
│   ├── alb/          # ALB + WAFv2 + ACM + Route53
│   ├── ecr/          # ECR repositories (5 services)
│   ├── iam/          # KMS + IRSA roles + CI/CD role
│   └── monitoring/   # CloudWatch + Prometheus/Grafana
└── environments/
    ├── dev/          # t3.medium nodes, single-AZ, minimal HA
    ├── staging/      # t3.large nodes, multi-AZ, moderate HA
    └── production/   # t3.xlarge nodes, 3-AZ, full HA
```

## Prerequisites

- Terraform >= 1.7.0
- AWS CLI configured with appropriate permissions
- S3 bucket and DynamoDB table for state backend (created out-of-band)

## Deploying an environment

```bash
cd environments/dev   # or staging / production
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

export TF_VAR_grafana_admin_password="$(openssl rand -base64 24)"

terraform init
terraform plan -out plan.out
terraform apply plan.out
```

## State backends

Each environment stores state in a dedicated S3 bucket with DynamoDB locking:

| Environment | Bucket | DynamoDB Table |
|-------------|--------|----------------|
| dev | gridmind-terraform-state-dev | gridmind-terraform-locks-dev |
| staging | gridmind-terraform-state-staging | gridmind-terraform-locks-staging |
| production | gridmind-terraform-state-production | gridmind-terraform-locks-production |

Create these resources once with:

```bash
aws s3 mb s3://gridmind-terraform-state-production --region us-east-1
aws s3api put-bucket-versioning --bucket gridmind-terraform-state-production \
  --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name gridmind-terraform-locks-production \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```
