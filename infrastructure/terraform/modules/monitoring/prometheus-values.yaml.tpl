nameOverride: kube-prometheus-stack

prometheus:
  prometheusSpec:
    retention: "${retention_days}d"
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: "${storage_class}"
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: "${storage_size}"
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
    additionalScrapeConfigs:
      - job_name: "gridmind-gateway"
        static_configs:
          - targets: ["gateway.gridmind.svc.cluster.local:9090"]
      - job_name: "gridmind-cortex"
        static_configs:
          - targets: ["cortex.gridmind.svc.cluster.local:9090"]

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: "${storage_class}"
          resources:
            requests:
              storage: "10Gi"

grafana:
  enabled: true
  adminPassword: "${grafana_admin_password}"
  persistence:
    enabled: true
    storageClassName: "${storage_class}"
    size: "10Gi"
  grafana.ini:
    server:
      domain: "grafana.internal"
    auth.anonymous:
      enabled: false
  sidecar:
    dashboards:
      enabled: true
      label: grafana_dashboard
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true

defaultRules:
  create: true
  rules:
    alertmanager: true
    etcd: false
    kubeApiserverAvailability: true
    kubeApiserverBurnrate: true
    kubeApiserverHistogram: true
    kubeApiserverSlos: true
    kubelet: true
    kubePrometheusNodeRecording: true
    kubernetesApps: true
    kubernetesResources: true
    kubernetesStorage: true
    kubernetesSystem: true
    node: true
    nodeExporterAlerting: true
