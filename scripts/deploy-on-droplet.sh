#!/usr/bin/env bash
set -euo pipefail

# 1) Build UI
npm ci || npm install
npm run build:ui

# 2) PM2 process
if ! command -v pm2 >/dev/null 2>&1; then sudo npm i -g pm2; fi
cat > ecosystem.config.cjs <<'EOC'
module.exports = {
  apps: [{
    name: 'adshub',
    script: 'server.js',
    env: { NODE_ENV: 'production' }
  }]
}
EOC
pm2 start ecosystem.config.cjs || pm2 restart adshub
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# 3) Nginx
sudo apt-get update -y
sudo apt-get install -y nginx
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo cp nginx/adshub.conf /etc/nginx/sites-available/adshub
sudo ln -sf /etc/nginx/sites-available/adshub /etc/nginx/sites-enabled/adshub
sudo nginx -t

# 4) Let's Encrypt TLS
if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get install -y certbot python3-certbot-nginx
fi
# Obtain/renew cert non-interactively
sudo certbot --nginx -d ads.beautybyearth.com --non-interactive --agree-tos -m jenny@beautybyearth.com --redirect || true

sudo systemctl enable nginx
sudo systemctl restart nginx

echo "✅ Deploy finished. Health check:"
curl -sS https://ads.beautybyearth.com/readyz || true
