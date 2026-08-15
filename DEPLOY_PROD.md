# 🚀 D-STUDIO Production Deployment Guide

## Quick Start (Local Docker)

```bash
# 1. Clone and enter the repo
cd /workspaces/D-STUDIO

# 2. Copy and configure environment
cp .env.prod .env
nano .env  # Edit with your SwiftPay credentials

# 3. Build and start
docker-compose -f docker-compose.prod.yaml up -d

# 4. Verify
curl http://localhost/health
curl http://localhost/api/swiftpay/institutions
```

---

## Production Deploy (VPS/Cloud Server)

### Prerequisites
- Docker & Docker Compose installed
- Domain name configured and DNS pointing to your server
- SSL certificate (Let's Encrypt recommended)
- SwiftPay merchant account with live credentials

### Step 1: Clone Repository
```bash
git clone https://github.com/DRLTECHS/D-STUDIO.git
cd D-STUDIO
```

### Step 2: Configure Environment
```bash
# Copy production environment template
cp .env.prod .env

# Edit with your actual credentials
nano .env
```

**Required values to update in .env:**
```
BASE_URL=https://your-domain.com
SWIFTPAY_API_KEY=your_api_key_from_swiftpay_dashboard
SWIFTPAY_API_SECRET=your_api_secret_from_swiftpay_dashboard
SWIFTPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Step 3: Register Webhook in SwiftPay
1. Go to [SwiftPay Dashboard](https://dashboard.swiftpay.ph/)
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://your-domain.com/api/swiftpay/webhook`
4. Copy the webhook secret and add to `.env`

### Step 4: SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy to accessible location
sudo mkdir -p /etc/d-studio/certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /etc/d-studio/certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /etc/d-studio/certs/key.pem
sudo chown -R $USER:$USER /etc/d-studio/certs
```

### Step 5: Enable HTTPS in nginx.prod.conf
Uncomment the HTTPS server block at the bottom of `nginx.prod.conf` and update:
- `server_name` with your domain
- Certificate paths

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    # ... rest of config same as HTTP server block ...
}
```

### Step 6: Deploy with Docker
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yaml pull

# Start services
docker-compose -f docker-compose.prod.yaml up -d

# Verify services running
docker-compose -f docker-compose.prod.yaml ps
```

### Step 7: Verify Deployment
```bash
# Check health
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/swiftpay/institutions

# Check logs
docker-compose -f docker-compose.prod.yaml logs -f backend
docker-compose -f docker-compose.prod.yaml logs -f site
```

---

## Common Deployment Targets

### Railway.app
```bash
# 1. Connect GitHub repo
# 2. Add environment variables:
#    - PORT=3001
#    - BASE_URL=https://your-railway-url.railway.app
#    - SWIFTPAY_MODE=live
#    - SWIFTPAY_API_KEY=***
#    - SWIFTPAY_API_SECRET=***
#    - etc.
# 3. Deploy

# Alternative: Railway CLI
railway up
```

### Render.com
```bash
# 1. Connect GitHub repo
# 2. Create Web Service with:
#    - Build Command: npm install
#    - Start Command: npm start
#    - Add environment variables
# 3. Deploy
```

### DigitalOcean App Platform
```bash
# 1. Push repo to GitHub
# 2. In DigitalOcean: Create App → GitHub → Select Repo
# 3. Configure environment variables
# 4. Deploy
```

---

## Monitoring & Maintenance

### View Logs
```bash
# Backend logs
docker-compose -f docker-compose.prod.yaml logs -f backend

# Nginx logs
docker-compose -f docker-compose.prod.yaml logs -f site

# All logs
docker-compose -f docker-compose.prod.yaml logs -f
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yaml restart backend
docker-compose -f docker-compose.prod.yaml restart site
```

### Update Code
```bash
git pull origin main
docker-compose -f docker-compose.prod.yaml up -d --build
```

### Certificate Renewal (Auto with Certbot)
Add to crontab:
```bash
0 0 * * * certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yaml restart site
```

---

## Troubleshooting

### Payment redirect not working
- Check `BASE_URL` matches your domain exactly
- Verify SwiftPay API credentials are correct
- Check logs: `docker-compose -f docker-compose.prod.yaml logs backend`

### Webhook not receiving callbacks
- Verify webhook URL registered in SwiftPay dashboard
- Check logs: `docker-compose -f docker-compose.prod.yaml logs backend`
- Test manually: `curl -X POST https://your-domain.com/api/swiftpay/webhook -H 'Content-Type: application/json' -d '{...}'`

### SSL/HTTPS issues
- Verify certificate path in `nginx.prod.conf`
- Renew certificate: `sudo certbot renew`
- Test: `curl -v https://your-domain.com`

### Services not starting
- Check environment variables: `docker-compose config`
- View logs: `docker-compose logs`
- Rebuild: `docker-compose up -d --build`

---

## Security Best Practices

✅ **DO:**
- Use HTTPS in production (let's encrypt is free)
- Store secrets in `.env` (never commit to git)
- Keep SwiftPay webhook secret safe
- Monitor logs for errors
- Use production credentials only on live domain
- Enable rate limiting on API endpoints
- Keep Docker images updated

❌ **DON'T:**
- Commit `.env` to version control
- Use sandbox credentials in production
- Expose API keys in logs
- Run as root in containers
- Disable HTTPS
- Share webhook secrets
- Use old/outdated Node versions

---

## Support

- SwiftPay API Docs: https://developer.swiftpay.ph/
- Docker Docs: https://docs.docker.com/
- Let's Encrypt: https://letsencrypt.org/
- Contact: admin@drl-softechs.dev

