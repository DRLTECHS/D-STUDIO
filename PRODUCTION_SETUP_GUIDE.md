# 🚀 D-STUDIO Production Environment Setup Guide

**Complete guide to configure and deploy D-STUDIO to Railway production environment with SwiftPay integration.**

**Document Status:** ✅ Production Ready  
**Last Updated:** August 2026  
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [Railway Deployment](#railway-deployment)
4. [Environment Configuration](#environment-configuration)
5. [SwiftPay Integration](#swiftpay-integration)
6. [Production Verification](#production-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Reference Guides](#reference-guides)

---

## Overview

### What You're Deploying

**D-STUDIO** is a complete e-commerce platform with:
- ✅ Admin Dashboard with analytics
- ✅ Product catalog and shopping cart
- ✅ SwiftPay payment integration
- ✅ Order tracking and management
- ✅ AI content generation API
- ✅ Image and video generation
- ✅ Project showcase (Casino & Finance portfolios)

### Deployment Architecture

```
GitHub (Code Repository)
    ↓
Railway.app (Build & Deploy)
    ↓
Docker Container (Production App)
    ↓
Public HTTPS URL
    ↓
SwiftPay Payment Gateway
```

### Technologies Used

- **Runtime:** Node.js 22 (Alpine)
- **Framework:** Express.js
- **Platform:** Railway.app
- **Payment:** SwiftPay
- **Frontend:** HTML5, CSS3, JavaScript
- **Container:** Docker

---

## Pre-Deployment Setup

### Requirements Checklist

Before you start, verify you have:

- [ ] **GitHub Account**
  - Access to DRLTECHS/D-STUDIO repository
  - All changes committed to main branch
  
- [ ] **Railway Account**
  - Free account at https://railway.app
  - Connected to GitHub

- [ ] **SwiftPay Merchant Account**
  - Live API credentials (not sandbox)
  - Access to merchant dashboard
  - Webhook capability enabled

- [ ] **Domain Name (Optional)**
  - For custom domain setup
  - Access to DNS settings

### Prepare Your Repository

```bash
# Navigate to project directory
cd /workspaces/D-STUDIO

# Verify all changes are committed
git status
# Should show: "working tree clean"

# If there are changes, commit them
git add .
git commit -m "Production environment setup"
git push origin main
```

### Verify Core Files Exist

```bash
# Check all required deployment files
ls -l Dockerfile railway.json Procfile package.json

# Expected output:
# -rw-r--r-- ... Dockerfile
# -rw-r--r-- ... railway.json
# -rw-r--r-- ... Procfile
# -rw-r--r-- ... package.json
```

**File Descriptions:**
- `Dockerfile`: Defines how to build the application
- `railway.json`: Railway deployment configuration
- `Procfile`: Tells Railway how to start the app
- `package.json`: Lists all dependencies

---

## Railway Deployment

### Step 1: Create Railway Project

**Visit Railway Dashboard:**
1. Go to https://railway.app
2. Sign in with GitHub account
3. Click **"New Project"** button

**Connect Repository:**
1. Select **"Deploy from GitHub"**
2. Authorize Railway to access your GitHub account
3. Search for and select **DRLTECHS/D-STUDIO**
4. Click **"Create"**

**Wait for Initial Build:**
- Railway automatically detects Node.js project
- Builds Docker image
- Deploys application
- Typically takes 2-5 minutes

### Step 2: Monitor Deployment

**Check Build Progress:**
1. Stay on Railway dashboard
2. Go to **"Build Logs"** tab
3. Watch for build completion

**Expected Build Output:**
```
✓ Cloning repository
✓ Installing dependencies
✓ Building Docker image
✓ Pushing to registry
✓ Starting container
✓ Application running
```

**Get Your Railway Domain:**
1. Go to **"Deployments"** tab
2. View the public URL
3. Note it (e.g., `https://d-studio-prod-xxx.railway.app`)
4. **Save this URL** - needed for configuration

---

## Environment Configuration

### Railway Variables Configuration

**Open Railway Variables:**
1. In Railway dashboard, click your service card
2. Go to **"Variables"** tab
3. Add each variable below

### Server Configuration Variables

Copy and add these variables:

**PORT Configuration:**
```
PORT = 3001
```

**Environment Mode:**
```
NODE_ENV = production
```

**Base URL (REQUIRED - Update Placeholder):**
```
BASE_URL = https://your-railway-domain.railway.app
```

Replace `your-railway-domain.railway.app` with your actual Railway domain from Step 2.

### SwiftPay Configuration Variables

**Get Credentials:**
1. Log in to SwiftPay Dashboard: https://dashboard.swiftpay.ph
2. Go to **Settings → API Keys**
3. Get your **LIVE** API Key (NOT sandbox)
4. Get your **LIVE** Secret Key
5. Go to **Webhooks** section
6. Get or generate webhook secret

**Add to Railway Variables:**

```
SWIFTPAY_API_KEY = your_live_api_key_from_dashboard
SWIFTPAY_API_SECRET = your_live_secret_from_dashboard
SWIFTPAY_WEBHOOK_SECRET = your_webhook_secret_from_dashboard
SWIFTPAY_MODE = live
```

⚠️ **CRITICAL:** Use LIVE credentials, not sandbox. Never use test/sandbox keys in production.

### Redirect URL Variables

These URLs are where customers are redirected after payment:

```
SWIFTPAY_SUCCESS_URL = https://your-railway-domain.railway.app/order-tracking
SWIFTPAY_FAILURE_URL = https://your-railway-domain.railway.app/checkout
SWIFTPAY_CANCEL_URL = https://your-railway-domain.railway.app/products
```

### Logging Variables

```
LOG_LEVEL = info
```

### Save and Deploy

1. After adding all variables, click **"Save"**
2. Railway automatically redeploys with new variables
3. Wait 1-2 minutes for redeployment
4. Check **"Logs"** tab for confirmation

**Expected Log Message:**
```
DRL Techs SwiftPay backend listening on http://localhost:3001
```

---

## SwiftPay Integration

### Register Webhook

**Get Your Webhook URL:**
- From Railway domain: `https://your-railway-domain.railway.app/api/swiftpay/webhook`

**Register in SwiftPay:**
1. Log in to SwiftPay Dashboard
2. Go to **Settings → Webhooks**
3. Click **"Add New"**
4. Enter Webhook URL: `https://your-railway-domain.railway.app/api/swiftpay/webhook`
5. Save webhook secret (copy to Railway `SWIFTPAY_WEBHOOK_SECRET`)
6. Click **"Save"**

**Test Webhook:**
1. In SwiftPay dashboard, find your webhook
2. Click **"Test"** button
3. Go to Railway dashboard → **Logs** tab
4. Should see webhook test message

### Verify Integration

**Test API Health:**
```bash
curl https://your-railway-domain.railway.app/health

# Expected response:
# {"ok":true,"service":"d-studio-swiftpay","mode":"live"}
```

**Test SwiftPay Institutions:**
```bash
curl https://your-railway-domain.railway.app/api/swiftpay/institutions

# Should return list of payment institutions
```

---

## Production Verification

### Full System Test

**1. Test Static Files**
- [ ] Home page loads: `https://your-domain/`
- [ ] CSS/styling displays correctly
- [ ] Images load without 404 errors
- [ ] JavaScript functionality works

**2. Test Pages**
- [ ] `/products.html` - Product listing loads
- [ ] `/checkout` - Checkout page works
- [ ] `/order-tracking` - Order tracking page accessible
- [ ] `/admin.html` - Admin dashboard loads
- [ ] `/projects.html` - Project showcase loads

**3. Test Payment Flow**
```bash
# Step 1: Open browser to https://your-domain/
# Step 2: Add product to cart
# Step 3: Go to checkout
# Step 4: Click proceed to payment
# Step 5: Complete payment in SwiftPay
# Step 6: Should redirect to order-tracking
# Step 7: Check logs for webhook
```

**4. Verify Logs**
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Stream logs
railway logs -f

# Look for:
# - "listening on" - app started
# - "SwiftPay webhook received" - payment received
# - No "error" messages
```

### Production Checklist

- [ ] App is running and accessible
- [ ] Health check passes (`/health` returns 200)
- [ ] Static files load (no 404 errors)
- [ ] Payment flow works end-to-end
- [ ] Webhook receives payment notifications
- [ ] Admin dashboard accessible
- [ ] Environment variables are set correctly
- [ ] No error messages in logs
- [ ] Performance is good (< 500ms response time)

---

## Monitoring & Maintenance

### Daily Monitoring

**Check Application Health:**
```bash
# View recent logs
railway logs --tail=50

# Should see successful requests, no errors
```

**Test Payment Flow:**
1. Process a test payment
2. Verify it appears in order tracking
3. Confirm webhook received

### Weekly Maintenance

1. **Review Error Logs**
   - Check for any recurring errors
   - Fix issues immediately

2. **Test Backup/Restore**
   - Verify backup procedures work
   - Document recovery steps

3. **Update Documentation**
   - Keep deployment notes current
   - Document any changes

### Monthly Tasks

1. **Performance Review**
   - Check CPU usage (should be < 10%)
   - Check memory usage (should be < 150MB)
   - Review response times

2. **Security Audit**
   - Verify no credentials in logs
   - Check webhook security
   - Rotate API keys if needed

3. **Cost Analysis**
   - Review Railway usage
   - Optimize if over budget

---

## Reference Guides

### Detailed Documentation

For complete step-by-step instructions, see:

- **[DEPLOY_PROD_RAILWAY.md](DEPLOY_PROD_RAILWAY.md)** - Full deployment guide (60+ steps)
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)** - Interactive checklist
- **[RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)** - Quick 5-minute guide
- **[RAILWAY_DEPLOYMENT_SUMMARY.md](RAILWAY_DEPLOYMENT_SUMMARY.md)** - Overview & reference

### Environment Files

- **[.env.production.template](.env.production.template)** - Documented template with all variables
- **[.env.example](.env.example)** - Example configuration
- **[.env.railway](.env.railway)** - Railway-specific template

### Common Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Log in to Railway
railway login

# View deployment status
railway status

# Stream logs in real-time
railway logs -f

# View recent logs
railway logs --tail=100

# Deploy from current branch
git push origin main
# (Railway auto-deploys on push)
```

### Troubleshooting

| Problem | Solution | Reference |
|---------|----------|-----------|
| Build fails | Check "Build Logs" in Railway | DEPLOY_PROD_RAILWAY.md Part 9 |
| App crashes | Check "Logs" tab, verify variables | DEPLOY_PROD_RAILWAY.md Part 9 |
| Payments don't work | Verify SWIFTPAY_API_KEY is LIVE | DEPLOY_PROD_RAILWAY.md Part 9 |
| Webhook not received | Check webhook URL matches domain | DEPLOY_PROD_RAILWAY.md Part 9 |
| Custom domain issues | Verify DNS propagation (15-30 min) | DEPLOY_PROD_RAILWAY.md Part 10 |

---

## Success Indicators

✅ **You know you're ready when:**

- [ ] App is live at `https://your-railway-domain.railway.app`
- [ ] Health check passes: `/health` returns 200
- [ ] All pages load without errors
- [ ] Payment flow works end-to-end
- [ ] Webhooks are received successfully
- [ ] Admin dashboard is functional
- [ ] No errors in production logs
- [ ] Performance metrics are good
- [ ] Team members can access and monitor

---

## Support & Resources

**Need Help?**

1. **Check Documentation**
   - Read relevant guide above
   - Check DEPLOY_PROD_RAILWAY.md troubleshooting

2. **View Logs**
   ```bash
   railway logs -f | grep -i error
   ```

3. **Check Environment**
   - Verify all variables in Railway dashboard
   - Ensure SWIFTPAY credentials are LIVE (not sandbox)

4. **Contact Support**
   - Railway Support: https://railway.app/support
   - SwiftPay Support: https://dashboard.swiftpay.ph
   - GitHub Issues: DRLTECHS/D-STUDIO

---

## Summary

You now have:

✅ Complete deployment documentation  
✅ Step-by-step guides (5 min, 30 min, and comprehensive)  
✅ Interactive checklist  
✅ Environment templates  
✅ Production-optimized application  
✅ Security best practices  
✅ Monitoring setup  

**Your application is ready for production deployment on Railway!**

---

**Next Steps:**
1. Follow the Quick Guide: RAILWAY_QUICKSTART.md (5 minutes)
2. OR follow the Complete Guide: DEPLOY_PROD_RAILWAY.md (30 minutes)
3. Use the Checklist: PRODUCTION_DEPLOYMENT_CHECKLIST.md (verify each step)
4. Monitor in production: `railway logs -f`

---

*Document Version: 1.0.0 | Last Updated: August 2026*
