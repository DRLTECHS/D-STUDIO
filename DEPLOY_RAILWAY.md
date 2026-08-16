# 🚀 D-STUDIO Railway Deployment Guide

Railway is a modern cloud platform that makes deploying Node.js applications simple. Follow this guide to deploy D-STUDIO to production on Railway.

---

## Prerequisites

- [Railway.app](https://railway.app) account (sign up free at railway.app)
- GitHub account (for connecting your repository)
- SwiftPay merchant account with live API credentials
- Domain name (optional for custom domains)

---

## Step 1: Connect Repository to Railway

1. **Go to Railway Dashboard**
   - Visit [https://railway.app](https://railway.app)
   - Click **"New Project"**

2. **Connect GitHub Repository**
   - Select **"Deploy from GitHub"**
   - Authorize Railway to access your GitHub account
   - Select **DRLTECHS/D-STUDIO** repository
   - Click **"Create"**

3. **Wait for Initial Deployment**
   - Railway will automatically detect Node.js project
   - It will build and deploy the application
   - Monitor deployment progress in the dashboard

---

## Step 2: Configure Environment Variables

Railway needs your SwiftPay credentials and configuration. Set these in the Railway dashboard:

1. **Open Project Settings**
   - In your Railway project, click the service card
   - Go to **"Variables"** tab

2. **Add the following environment variables:**

```
BASE_URL = https://your-app-name.railway.app
NODE_ENV = production
PORT = 3001

SWIFTPAY_API_KEY = your_api_key_from_swiftpay_dashboard
SWIFTPAY_API_SECRET = your_api_secret_from_swiftpay_dashboard
SWIFTPAY_WEBHOOK_SECRET = your_webhook_secret_from_swiftpay

SWIFTPAY_SUCCESS_URL = https://your-app-name.railway.app/order-tracking
SWIFTPAY_FAILURE_URL = https://your-app-name.railway.app/checkout
SWIFTPAY_CANCEL_URL = https://your-app-name.railway.app/products

LOG_LEVEL = info
```

3. **Click "Save"** and Railway will redeploy with the new variables

---

## Step 3: Register Webhook in SwiftPay

1. **Get Your Railway Domain**
   - In Railway dashboard, view the Deployments tab
   - Your public URL will be visible (e.g., `https://d-studio-prod.railway.app`)

2. **Register Webhook in SwiftPay Dashboard**
   - Log in to [SwiftPay Dashboard](https://dashboard.swiftpay.ph/)
   - Go to **Settings → Webhooks → Add New**
   - Set webhook URL: `https://your-railway-domain.railway.app/api/swiftpay/webhook`
   - Set the webhook secret in Railway environment variables

3. **Test Webhook Connection**
   - In SwiftPay dashboard, click "Test" on your webhook
   - Check Railway logs to confirm webhook received:
     ```bash
     railway logs -f
     ```

---

## Step 4: Configure Custom Domain (Optional)

To use your own domain instead of Railway's default:

1. **In Railway Dashboard**
   - Go to your project's Settings
   - Click **"Domains"**
   - Click **"Add Custom Domain"**
   - Enter your domain (e.g., `app.yourdomain.com`)

2. **Update DNS Records**
   - Railway will show you DNS configuration
   - Add the CNAME record to your domain provider:
     ```
     CNAME: yourdomain.com → your-railway-domain.railway.app
     ```

3. **Update Environment Variables**
   - Change `BASE_URL` to your custom domain
   - Railway will automatically enable HTTPS with Let's Encrypt

---

## Step 5: Monitor & Troubleshoot

### View Logs
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# View real-time logs
railway logs -f

# View logs for specific time range
railway logs --tail 100
```

### Access Railway Dashboard
- Click on your service to view metrics
- Monitor CPU, Memory, Network usage
- Check deployment history and rollback if needed

### Common Issues

**Issue: "Cannot find module" errors**
- Solution: Make sure all dependencies are in `package.json`
- Railway will run `npm install` automatically during build

**Issue: PORT already in use**
- Solution: Railway automatically assigns PORT via environment variable
- Ensure your server uses `process.env.PORT || 3001`

**Issue: Webhook not receiving requests**
- Solution: Verify your custom domain or Railway URL in SwiftPay dashboard
- Check logs: `railway logs -f`
- Test with curl: `curl -X POST https://your-railway-domain.railway.app/api/swiftpay/webhook`

**Issue: Deployment keeps failing**
- Check build logs in Railway dashboard
- Verify package.json has all required dependencies
- Ensure Dockerfile or Procfile is correct

---

## Step 6: Database & Persistent Storage (If Needed)

Railway offers PostgreSQL, MySQL, MongoDB, and more. To add a database:

1. **In Railway Project**
   - Click **"Add Service"**
   - Select database type (e.g., PostgreSQL)
   - Railway will auto-add connection variables to your Node.js service

2. **Access Database Variables**
   - Your connection string is available as environment variable
   - Example for PostgreSQL: `DATABASE_URL`

---

## Step 7: Auto-Deployments & CI/CD

By default, Railway auto-deploys on every push to your repository:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Update deployment config"
   git push origin main
   ```

2. **Railway automatically:**
   - Detects changes
   - Rebuilds the Docker image
   - Deploys new version
   - Keeps your site live during deployment

### Disable Auto-Deploy (Optional)
- Go to Deployment settings
- Toggle **"Automatic Deploy"** off
- Deploy manually from dashboard when ready

---

## Step 8: Scaling & Performance

### Increase Resources
1. Go to **Service Settings**
2. Under **Compute**, increase:
   - **Memory** (default 512MB)
   - **CPU** (default 100m)

### Enable Horizontal Scaling
1. Under **Deploy**, set **Num Replicas** > 1
2. Railway will run multiple instances with load balancing

### Optimize Build Time
- Railway caches dependencies between builds
- Larger builds deploy faster on second push

---

## Production Checklist

Before going live:

- [ ] Environment variables configured (SwiftPay credentials, BASE_URL, etc.)
- [ ] Webhook registered in SwiftPay dashboard
- [ ] Domain configured (custom or Railway default)
- [ ] HTTPS enabled and working
- [ ] Test payment flow end-to-end
- [ ] Monitor logs for errors
- [ ] Set up error tracking (Sentry, DataDog, etc.)
- [ ] Configure alerts for deployment failures
- [ ] Document deployment process for your team

---

## Useful Commands with Railway CLI

```bash
# Login to Railway
railway login

# Link local project to Railway service
railway link

# View environment variables
railway env

# View deployed service status
railway status

# View real-time logs
railway logs -f

# Run command in Railway environment
railway run node -e "console.log(process.env.DATABASE_URL)"

# Open Railway dashboard
railway open
```

---

## Rollback to Previous Deployment

If something goes wrong:

1. Go to **Deployments** tab in Railway dashboard
2. Find the previous working deployment
3. Click **"Redeploy"**
4. Railway will instantly switch to that version

---

## Next Steps

- Monitor your application: `railway logs -f`
- Set up error tracking: [Sentry](https://sentry.io), [Rollbar](https://rollbar.com)
- Configure alerts for failures
- Join Railway community: [Discord](https://discord.gg/railway)

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Community:** https://discord.gg/railway
- **SwiftPay Docs:** https://developer.swiftpay.ph
- **Node.js Best Practices:** https://nodejs.org/en/docs/guides

---

**Your app is now live on Railway! 🎉**
