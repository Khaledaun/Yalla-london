# SSL/HTTPS Setup Guide for Yalla London

## Overview
This guide covers SSL/HTTPS setup for the Yalla London platform across different deployment environments.

## Vercel (Recommended)

### Automatic SSL
Vercel provides automatic SSL certificates for all deployments:

- **Custom domains**: Automatic Let's Encrypt certificates
- **Preview deployments**: SSL included by default
- **No configuration required**: Works out of the box

### Setup Steps
1. Add your custom domain in the Vercel dashboard
2. Configure DNS with your domain provider:
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
3. SSL certificate is automatically provisioned

### Custom SSL Certificate
For enterprise customers, you can upload custom certificates:
1. Go to Project Settings → Domains
2. Click on your domain → SSL Certificate
3. Upload your certificate files

## Cloudflare Setup

### DNS Configuration
1. Add your domain to Cloudflare
2. Configure DNS records:
   ```
   Type: A
   Name: @
   Value: [Your server IP]
   Proxy status: Proxied (orange cloud)
   
   Type: CNAME
   Name: www
   Value: yalla-london.com
   Proxy status: Proxied (orange cloud)
   ```

### SSL/TLS Settings
1. Navigate to SSL/TLS → Overview
2. Set encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Configure minimum TLS version to 1.2

### Edge Certificates
```bash
# Cloudflare automatically provides:
- Universal SSL (Let's Encrypt)
- Advanced Certificate Manager (paid)
- Custom SSL uploads
```

### Security Features
```yaml
SSL Settings:
  - HSTS: Enabled (max-age=31536000)
  - TLS 1.3: Enabled
  - Opportunistic Encryption: Enabled
  - Onion Routing: Enabled
  - Certificate Transparency: Enabled
```

## Let's Encrypt (Self-Hosted)

### Prerequisites
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/yalla-london
server {
    listen 80;
    server_name yalla-london.com www.yalla-london.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yalla-london.com www.yalla-london.com;
    
    ssl_certificate /etc/letsencrypt/live/yalla-london.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yalla-london.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Certificate Generation
```bash
# Generate certificate
sudo certbot --nginx -d yalla-london.com -d www.yalla-london.com

# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## SSL Testing and Validation

### SSL Labs Test
```bash
# Test your SSL configuration
curl -s "https://api.ssllabs.com/api/v3/analyze?host=yalla-london.com"
```

### Manual Testing
```bash
# Check certificate details
openssl s_client -connect yalla-london.com:443 -servername yalla-london.com

# Verify certificate chain
curl -vI https://yalla-london.com

# Test HTTP/2 support
curl -I --http2 https://yalla-london.com
```

### Expected Results
- ✅ SSL Labs Grade: A or A+
- ✅ Certificate Authority: Let's Encrypt or trusted CA
- ✅ TLS Version: 1.2 minimum, 1.3 preferred
- ✅ HSTS Header: Present
- ✅ Certificate Transparency: Enabled

## Security Best Practices

### Environment Variables
```bash
# Production environment
NEXT_PUBLIC_SITE_URL=https://yalla-london.com
NEXTAUTH_URL=https://yalla-london.com
NEXTAUTH_URL_INTERNAL=https://yalla-london.com

# Force HTTPS redirects
FORCE_HTTPS=true
```

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  },
  
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http'
          }
        ],
        destination: 'https://yalla-london.com/:path*',
        permanent: true
      }
    ]
  }
}
```

## Certificate Monitoring

### Automated Monitoring Script
```bash
#!/bin/bash
# ssl-monitor.sh

DOMAIN="yalla-london.com"
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

# Check certificate expiration
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

# Alert if expiring within 30 days
if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠️ SSL Certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days\"}" \
        $WEBHOOK_URL
fi
```

### Monitoring Setup
```bash
# Add to crontab for daily checks
0 9 * * * /path/to/ssl-monitor.sh
```

## Troubleshooting

### Common Issues

1. **Mixed Content Warnings**
   ```javascript
   // Ensure all resources use HTTPS
   const imageUrl = process.env.NODE_ENV === 'production' 
     ? 'https://images.yalla-london.com/image.jpg'
     : '/images/image.jpg'
   ```

2. **Certificate Chain Issues**
   ```bash
   # Verify full chain
   curl -I https://yalla-london.com
   # Should return 200, not certificate errors
   ```

3. **HSTS Issues**
   ```bash
   # Clear HSTS in browser dev tools
   chrome://net-internals/#hsts
   ```

## Environment-Specific Notes

### Development
```bash
# Use mkcert for local HTTPS
mkcert -install
mkcert localhost 127.0.0.1 yalla-london.local
```

### Staging
```bash
# Use Let's Encrypt staging for testing
certbot --nginx --staging -d staging.yalla-london.com
```

### Production
```bash
# Use production Let's Encrypt
certbot --nginx -d yalla-london.com -d www.yalla-london.com
```

This comprehensive SSL/HTTPS setup ensures your Yalla London platform is secure and production-ready across all deployment environments.