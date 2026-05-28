#!/bin/bash
# ============================================================
# Generate self-signed SSL certificate for AgriTrace demo
# ============================================================
# Usage: ./generate-ssl-cert.sh [domain]
# Default domain: localhost
# ============================================================

DOMAIN="${1:-localhost}"
SSL_DIR="$(dirname "$0")"

echo "Generating self-signed SSL certificate for domain: $DOMAIN"
echo "Output directory: $SSL_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/agritrace.key" \
    -out "$SSL_DIR/agritrace.crt" \
    -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=AgriTrace/OU=Dev/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ SSL certificate generated:"
echo "   Certificate: $SSL_DIR/agritrace.crt"
echo "   Private Key: $SSL_DIR/agritrace.key"
echo ""
echo "⚠️  This is a self-signed certificate for DEMO/DEV only."
echo "   For production, use Let's Encrypt or a trusted CA."
echo ""
echo "📋 To trust this cert in your browser:"
echo "   Chrome: Settings → Security → Manage Certificates → Import agritrace.crt"
echo "   Firefox: about:preferences#privacy → Certificates → View Certificates → Import"
