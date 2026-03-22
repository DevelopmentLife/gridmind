global:
  enabled: true
  tlsDisable: false

server:
  image:
    tag: "${vault_image_tag}"

  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

  affinity: |
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: vault
              component: server
          topologyKey: kubernetes.io/hostname

  serviceAccount:
    create: true
    annotations:
      eks.amazonaws.com/role-arn: "${irsa_role_arn}"

  extraEnvironmentVars:
    VAULT_SEAL_TYPE: awskms
    AWS_REGION: "${aws_region}"
    VAULT_AWSKMS_SEAL_KEY_ID: "${kms_key_id}"

  ha:
    enabled: true
    replicas: ${replica_count}
    config: |
      ui = true

      listener "tcp" {
        tls_disable = 1
        address     = "[::]:8200"
        cluster_address = "[::]:8201"
        telemetry {
          unauthenticated_metrics_access = "true"
        }
      }

      storage "dynamodb" {
        ha_enabled = "true"
        region     = "${aws_region}"
        table      = "${dynamodb_table}"
      }

      seal "awskms" {
        region     = "${aws_region}"
        kms_key_id = "${kms_key_id}"
      }

      telemetry {
        prometheus_retention_time = "30s"
        disable_hostname          = true
      }

      log_level = "info"
      log_format = "json"

  dataStorage:
    enabled: true
    size: "${storage_size}"
    storageClass: "gp3"

  auditStorage:
    enabled: true
    size: "10Gi"
    storageClass: "gp3"

  readinessProbe:
    enabled: true
    path: "/v1/sys/health?standbyok=true&sealedcode=204&uninitcode=204"

  livenessProbe:
    enabled: true
    path: "/v1/sys/health?standbyok=true"
    initialDelaySeconds: 60

ui:
  enabled: true
  serviceType: "ClusterIP"

injector:
  enabled: true
  replicas: ${replica_count}
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "256Mi"
      cpu: "250m"
