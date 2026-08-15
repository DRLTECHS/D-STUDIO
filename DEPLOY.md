# Production Deployment Guide

## Prerequisites
- Docker and Docker Compose installed on your server
- (Optional) SSL certificates if using HTTPS
- Server with at least 512MB RAM

## Quick Start

### 1. Clone and Navigate
```bash
git clone <your-repo-url> d-studio
cd d-studio
```

### 2. Deploy with Docker Compose
```bash
# Pull latest images
docker compose -f docker-compose.prod.yaml pull

# Start services
docker compose -f docker-compose.prod.yaml up -d

# Check status
docker compose -f docker-compose.prod.yaml ps

# View logs
docker compose -f docker-compose.prod.yaml logs -f
```

### 3. Verify Deployment
```bash
# Test health endpoint
curl http://localhost/health

# Test main site
curl http://localhost/
```

## SSL/HTTPS Setup (Recommended)

### Using Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to certs directory
sudo mkdir -p /etc/d-studio/certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /etc/d-studio/certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /etc/d-studio/certs/key.pem
sudo chown -R 1000:1000 /etc/d-studio/certs
```

### Update Configuration
1. Edit `nginx.prod.conf` - uncomment the HTTPS server block
2. Update `server_name` with your domain
3. Update certificate paths if needed
4. Restart the container:
```bash
docker compose -f docker-compose.prod.yaml restart
```

### Auto-Renew Certificates
Add to crontab (`crontab -e`):
```bash
0 0 * * * certbot renew --quiet && docker compose -f /path/to/docker-compose.prod.yaml restart
```

## Common Commands

```bash
# View logs (last 100 lines)
docker compose -f docker-compose.prod.yaml logs --tail=100

# Restart service
docker compose -f docker-compose.prod.yaml restart

# Stop service
docker compose -f docker-compose.prod.yaml down

# Update site content
# Simply update files in ./public/ and restart:
docker compose -f docker-compose.prod.yaml restart

# View system resources
docker stats
```

## Monitoring

### Health Check
The application includes a `/health` endpoint for load balancers and monitoring services.

### Logs
Logs are stored as JSON files with rotation:
- Max file size: 10MB
- Max files: 3

View logs:
```bash
docker compose -f docker-compose.prod.yaml logs
```

## Security Best Practices

✅ Already configured:
- Security headers (CSP, X-Frame-Options, etc.)
- Gzip compression
- Hidden file protection
- No unnecessary ports exposed

🔒 Additional recommendations:
- Use a reverse proxy (Nginx/HAProxy) in front for load balancing
- Set up firewall rules (ufw, iptables)
- Monitor logs for suspicious activity
- Use secrets management for SSL certificates
- Implement rate limiting if needed

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.prod.yaml logs
```

### Port already in use
```bash
# Find process using port 80
lsof -i :80
# Kill process if needed
kill -9 <PID>
```

### Health check failing
```bash
# Test directly
docker compose -f docker-compose.prod.yaml exec site wget -qO- http://127.0.0.1/
```

## Updating Content

To update the site content:
1. Update files in `./public/`
2. Restart the container:
```bash
docker compose -f docker-compose.prod.yaml restart
```

No rebuilding required - the container uses your files directly.

## Support

For issues or questions, check:
- Docker logs: `docker compose -f docker-compose.prod.yaml logs`
- Nginx configuration: `./nginx.prod.conf`
- Docker compose file: `./docker-compose.prod.yaml`
