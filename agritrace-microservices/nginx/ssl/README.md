# SSL Certificates Directory

This directory contains SSL/TLS certificates for the Nginx reverse proxy.

## Files

| File | Description | Committed? |
|------|-------------|-----------|
| `generate-ssl-cert.sh` | Script to generate self-signed cert | ✅ Yes |
| `agritrace.crt` | SSL Certificate | ❌ No (gitignored) |
| `agritrace.key` | Private Key | ❌ No (gitignored) |

## Quick Start (Demo/Dev)

```bash
# Windows (using Git Bash or WSL)
bash ./generate-ssl-cert.sh localhost

# Or use PowerShell with OpenSSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout agritrace.key `
    -out agritrace.crt `
    -subj "/CN=localhost"
```

## Production

Replace self-signed cert with:
- **Let's Encrypt** (free, automated via Certbot)
- **Commercial CA** (DigiCert, Comodo, etc.)

Mount the real cert/key in `docker-compose.prod.yml`:
```yaml
volumes:
  - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/etc/nginx/ssl/agritrace.crt:ro
  - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/etc/nginx/ssl/agritrace.key:ro
```
