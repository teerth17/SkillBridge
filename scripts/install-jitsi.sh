#!/bin/bash
# ============================================================
# Jitsi Meet — EC2 Installation Script
# Run this on the Jitsi EC2 instance after launch.
#
# Tested on: Ubuntu 22.04 LTS (t3.medium)
#
# Usage:
#   scp scripts/install-jitsi.sh ec2-user@<EC2_IP>:~/
#   ssh ec2-user@<EC2_IP>
#   chmod +x install-jitsi.sh && sudo ./install-jitsi.sh
# ============================================================

set -euo pipefail

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Installing Jitsi on EC2 public IP: $PUBLIC_IP"

# ─── System update ───────────────────────────────────────────
apt-get update -y
apt-get install -y apt-transport-https curl gnupg2 nginx certbot

# ─── Java (required by Jitsi Videobridge) ────────────────────
apt-get install -y openjdk-11-jre-headless
echo "JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))" >> /etc/environment

# ─── Jitsi Meet repo ─────────────────────────────────────────
curl -fsSL https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor -o /usr/share/keyrings/jitsi-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi-archive-keyring.gpg] https://download.jitsi.org stable/" \
  > /etc/apt/sources.list.d/jitsi-stable.list

apt-get update -y

# Pre-answer the Jitsi installer prompts
echo "jitsi-meet jitsi-videobridge/jvb-hostname string $PUBLIC_IP" | debconf-set-selections
echo "jitsi-meet jitsi-meet-web-config/jvb-hostname string $PUBLIC_IP" | debconf-set-selections
echo "jitsi-meet jitsi-meet-web-config/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

DEBIAN_FRONTEND=noninteractive apt-get install -y jitsi-meet

# ─── Configure for IP-based access (no domain) ───────────────
# This matches how your docker-compose uses JITSI_BASE_URL=http://IP:8000

# Allow HTTP access on port 8000 (matches JITSI_BASE_URL in your stack)
cat > /etc/nginx/sites-available/jitsi-8000 << NGINX_EOF
server {
    listen 8000;
    server_name _;

    # Allow large video frames
    client_max_body_size 0;

    root /usr/share/jitsi-meet;
    index index.html;

    location ~ ^/([a-zA-Z0-9=\?]+)$ {
        rewrite ^/(.*)$ / break;
    }

    location / {
        try_files \$uri \$uri/ @root_path;
    }

    location @root_path {
        rewrite ^/(.*)$ / break;
    }

    location /http-bind {
        proxy_pass http://localhost:5280/http-bind;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header Host \$http_host;
    }

    location /xmpp-websocket {
        proxy_pass http://localhost:5280/xmpp-websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
    }

    location /colibri-ws {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/jitsi-8000 /etc/nginx/sites-enabled/jitsi-8000
nginx -t && systemctl reload nginx

# ─── Allow unauthenticated room creation (for thesis demo) ───
# Edit /etc/prosody/conf.avail/$PUBLIC_IP.cfg.lua
sed -i 's/authentication = "jitsi-anonymous"/authentication = "anonymous"/' \
  /etc/prosody/conf.avail/*.cfg.lua 2>/dev/null || true

# ─── Ensure all services start on boot ───────────────────────
systemctl enable jitsi-videobridge2 jicofo prosody nginx
systemctl restart jitsi-videobridge2 jicofo prosody nginx

# ─── Firewall ────────────────────────────────────────────────
# Note: Security Group handles inbound rules. This is for local ufw if enabled.
ufw allow 80/tcp    2>/dev/null || true
ufw allow 443/tcp   2>/dev/null || true
ufw allow 4443/tcp  2>/dev/null || true
ufw allow 8000/tcp  2>/dev/null || true
ufw allow 10000/udp 2>/dev/null || true

echo ""
echo "=============================================="
echo "✅ Jitsi installed!"
echo "=============================================="
echo ""
echo "  Test in browser:  http://$PUBLIC_IP:8000"
echo "  Set in K8s:       kubectl patch configmap skillbridge-config \\"
echo "                      -n skillbridge \\"
echo "                      --patch '{\"data\":{\"JITSI_BASE_URL\":\"http://$PUBLIC_IP:8000\"}}'"
echo ""
echo "  Then restart video-call-service:"
echo "  kubectl rollout restart deployment/video-call-service -n skillbridge"
