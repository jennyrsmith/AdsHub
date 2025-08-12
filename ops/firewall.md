# Firewall Runbook

## 1. DigitalOcean Cloud Firewall (recommended)
- Allow inbound **SSH (22)** from your IP(s).
- Allow inbound **TCP 3000** from your IP(s).
- Deny all other inbound traffic.

## 2. Optional UFW on the droplet
Use UFW as an additional layer on the server itself.

### Add an allowed IP
```bash
sudo ./ops/ufw-allowlist.sh add 203.0.113.10
```

### Remove an allowed IP
```bash
sudo ./ops/ufw-allowlist.sh remove 203.0.113.10
```

### Initialize and view status
```bash
sudo ./ops/ufw-allowlist.sh init
sudo ./ops/ufw-allowlist.sh status
```
