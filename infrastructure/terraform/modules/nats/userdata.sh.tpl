#!/bin/bash
set -euo pipefail

# Install NATS Server
NATS_VERSION="${nats_version}"
curl -fsSL "https://github.com/nats-io/nats-server/releases/download/v$${NATS_VERSION}/nats-server-v$${NATS_VERSION}-linux-amd64.tar.gz" \
  | tar -xz -C /usr/local/bin --strip-components=1 nats-server-v$${NATS_VERSION}-linux-amd64/nats-server

chmod +x /usr/local/bin/nats-server

# Get credentials from Secrets Manager
CREDS=$(aws secretsmanager get-secret-value \
  --region "${aws_region}" \
  --secret-id "${secret_arn}" \
  --query SecretString \
  --output text)

SYS_PASSWORD=$(echo "$CREDS" | python3 -c "import sys,json; print(json.load(sys.stdin)['sys_password'])")

# Prepare JetStream storage directory
mkdir -p /data/nats/jetstream
chown -R nats:nats /data/nats 2>/dev/null || true

# Create nats user if it does not exist
id -u nats &>/dev/null || useradd -r -s /sbin/nologin nats
chown -R nats:nats /data/nats

# Write NATS configuration
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)

cat > /etc/nats/nats.conf << EOF
# GridMind NATS JetStream configuration
# Environment: ${environment}
# Instance: $${INSTANCE_ID}

server_name: "${cluster_name}-$${INSTANCE_ID}"

listen: "0.0.0.0:4222"
http: "0.0.0.0:8222"

# Cluster configuration
cluster {
  name: "${cluster_name}"
  listen: "$${PRIVATE_IP}:6222"
  routes: []
}

# JetStream
jetstream {
  store_dir: "/data/nats/jetstream"
  max_memory_store: ${jetstream_max_memory}MB
  max_file_store: ${jetstream_max_file}GB
}

# Security
accounts {
  SYS {
    users: [
      {user: "sys", password: "$${SYS_PASSWORD}"}
    ]
  }
  GRIDMIND {
    jetstream: enabled
    users: [
      {user: "gridmind", password: "$${SYS_PASSWORD}"}
    ]
  }
}
system_account: SYS

# Limits
max_payload: 8MB
max_connections: 65536
write_deadline: "10s"
EOF

mkdir -p /etc/nats

# systemd service
cat > /etc/systemd/system/nats.service << 'UNIT'
[Unit]
Description=NATS JetStream Server
After=network.target
Wants=network.target

[Service]
User=nats
Group=nats
ExecStart=/usr/local/bin/nats-server -c /etc/nats/nats.conf
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable nats
systemctl start nats
