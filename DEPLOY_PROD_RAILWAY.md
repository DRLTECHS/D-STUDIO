# 🚀 D-STUDIO Production Deployment on Railway

Complete guide to deploy D-STUDIO to production on Railway with SwiftPay payment integration.

---

## 📋 Pre-Deployment Checklist

Before deploying to production, verify you have:

- [ ] GitHub account with DRLTECHS/D-STUDIO repository
- [ ] Railway.app account (free tier available)
- [ ] SwiftPay merchant account with **live** API credentials
- [ ] All code committed and pushed to main branch
- [ ] `.env.prod` file with all configuration values
- [ ] Custom domain name (optional but recommended)

---

## Part 1: Prepare Repository for Production

### 1.1 Verify All Code is Committed

```bash
cd /workspaces/D-STUDIO

# Check status
git status

# If there are changes, stage and commit them
git add .
git commit -m "Production deployment configuration

- Add complete API endpoints for admin dashboard
- Add project showcase with casino and finance portfolios
- Add SwiftPay payment integration
- Ready for Railway deployment"

# Push to main branch
git push origin main
```

### 1.2 Verify Production Configuration Files

```bash
# Verify these files exist:
ls -la Dockerfile railway.json Procfile package.json .env.prod

# Expected output should show all 4 files
```

**File Verification:**

| File | Purpose | Status |
|------|---------|--------|
| `Dockerfile` | Docker build configuration for Railway | ✅ Present |
| `railway.json` | Railway deployment settings | ✅ Present |
| `Procfile` | Startup command for Railway | ✅ Present |
| `package.json` | Node.js dependencies | ✅ Present |

---

## Part 2: Create Railway Project

### 2.1 Connect GitHub Repository

1. **Visit Railway Dashboard**
   - Go to [https://railway.app/dashboard](https://railway.app/dashboard)
   - Sign in to your Railway account (or create one)

2. **Create New Project**
   - Click **"New Project"** button
   - Select **"Deploy from GitHub"**

3. **Authorize & Select Repository**
   - Authorize Railway to access your GitHub account
   - Search for and select **DRLTECHS/D-STUDIO**
   - Click **"Create"**

4. **Monitor Initial Build**
   - Railway will automatically:
     - Detect Node.js project
     - Install dependencies
     - Build Docker image
     - Deploy application
   - Watch the "Build Logs" for any errors

**Expected Output:**
```
✓ Installing dependencies
✓ Running build scripts
✓ Building Docker image
✓ Deploying to Railway
✓ Application running on https://d-studio-prod-xxx.railway.app
```

### 2.2 Get Your Railway Domain

Once deployment completes:

1. Go to your project dashboard
2. Click on the service card
3. Go to **"Deployments"** tab
4. Note your public URL (e.g., `https://d-studio-prod-xxx.railway.app`)

**Save this URL** - you'll need it for configuration.

---

## Part 3: Configure Environment Variables on Railway

### 3.1 Add Environment Variables to Railway Dashboard

1. **Open Service Settings**
   - In Railway dashboard, click your service card
   - Go to **"Variables"** tab

2. **Add Each Variable (Copy-Paste)**

```
# Server Configuration
PORT=3001
NODE_ENV=production

# Replace with your actual domain
BASE_URL=https://your-railway-domain.railway.app

# SwiftPay Live Configuration (from your merchant dashboard)
SWIFTPAY_API_KEY=<your_live_api_key_here>
SWIFTPAY_API_SECRET=<your_live_secret_here>
SWIFTPAY_WEBHOOK_SECRET=<your_webhook_secret_here>

# SwiftPay Redirect URLs
SWIFTPAY_SUCCESS_URL=https://your-railway-domain.railway.app/order-tracking
SWIFTPAY_FAILURE_URL=https://your-railway-domain.railway.app/checkout
SWIFTPAY_CANCEL_URL=https://your-railway-domain.railway.app/products

# Logging
LOG_LEVEL=info
```

3. **Get SwiftPay Credentials**
   - Log in to [SwiftPay Merchant Dashboard](https://dashboard.swiftpay.ph)
   - Go to **Settings → API Keys**
   - Copy your **LIVE API KEY** (not sandbox)
   - Copy your **SECRET KEY**
   - Go to **Webhooks** and note your webhook secret

4. **Replace Placeholder Values**
   - Replace `your-railway-domain.railway.app` with your actual Railway domain
   - Replace `<your_live_api_key_here>` with actual SwiftPay API key
   - Replace `<your_live_secret_here>` with actual SwiftPay secret
   - Replace `<your_webhook_secret_here>` with webhook secret

5. **Save Variables**
   - Click **"Save"**
   - Railway will automatically redeploy with new variables

### 3.2 Verify Variables are Set

```bash
# View logs to confirm variables loaded
railway logs -f

# You should see:
# DRL Techs SwiftPay backend listening on http://localhost:3001
```

---

## Part 4: Register Webhook in SwiftPay

### 4.1 Add Webhook to SwiftPay Dashboard

1. **Get Your Railway Domain**
   - From Railway dashboard: `https://your-railway-domain.railway.app`

2. **Register Webhook in SwiftPay**
   - Log in to [SwiftPay Dashboard](https://dashboard.swiftpay.ph)
   - Go to **Settings → Webhooks → Add New**
   - Set Webhook URL: `https://your-railway-domain.railway.app/api/swiftpay/webhook`
   - Copy the webhook secret that SwiftPay generates
   - Click **"Save"**

3. **Update Railway with Webhook Secret**
   - Go back to Railway dashboard
   - Open Variables tab
   - Update `SWIFTPAY_WEBHOOK_SECRET` with the secret from SwiftPay
   - Click **"Save"**

### 4.2 Test Webhook Connection

```bash
# Install Railway CLI
npm install -g @railway/cli

# Log in to Railway
railway login

# View real-time logs
railway logs -f

# In another terminal, you should see webhook logs when payments occur:
# SwiftPay webhook received { orderId: 'DRL-001', status: 'completed', ... }
```

---

## Part 5: Test Payment Flow

### 5.1 Verify Application is Running

```bash
# Test health endpoint
curl https://your-railway-domain.railway.app/health

# Expected response:
# {"ok":true,"service":"d-studio-swiftpay","mode":"live"}
```

### 5.2 Test Payment Creation

```bash
# Get SwiftPay institutions
curl https://your-railway-domain.railway.app/api/swiftpay/institutions

# Should return list of payment institutions
```

### 5.3 Manual Payment Test

1. Open your app: `https://your-railway-domain.railway.app`
2. Click **"Products"** → Select a product
3. Click **"Add to Cart"** → Go to **"Checkout"**
4. Complete payment process through SwiftPay
5. Verify:
   - Payment processes successfully
   - Redirects to `/order-tracking`
   - Webhook is received (check Railway logs)

### 5.4 Check Admin Dashboard

```bash
# Get admin API token (should be set in production)
ADMIN_TOKEN="demo-token"

# Test admin API
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-railway-domain.railway.app/api/admin/orders
```

---

## Part 6: Set Up Custom Domain (Optional)

If you have your own domain:

### 6.1 Add Custom Domain in Railway

1. **Open Railway Project Settings**
   - Go to **Settings** tab
   - Click **"Domains"** or **"Networking"**
   - Click **"Add Custom Domain"**
   - Enter your domain: `app.yourdomain.com`

2. **Get DNS Configuration**
   - Railway will show you CNAME details
   - Example: `yourdomain.com CNAME → your-railway-domain.railway.app`

### 6.2 Update DNS at Your Domain Provider

1. Log in to your domain provider (GoDaddy, Namecheap, etc.)
2. Find DNS settings
3. Add CNAME record:
   ```
   CNAME: app → your-railway-domain.railway.app
   ```
4. Wait 15-30 minutes for DNS to propagate

### 6.3 Update Environment Variables

Once custom domain is active:

1. In Railway Variables, update:
   ```
   BASE_URL=https://app.yourdomain.com
   
   SWIFTPAY_SUCCESS_URL=https://app.yourdomain.com/order-tracking
   SWIFTPAY_FAILURE_URL=https://app.yourdomain.com/checkout
   SWIFTPAY_CANCEL_URL=https://app.yourdomain.com/products
   ```

2. Update webhook in SwiftPay dashboard:
   ```
   Webhook URL: https://app.yourdomain.com/api/swiftpay/webhook
   ```

---

## Part 7: Monitoring & Logging

### 7.1 View Real-Time Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Log in
railway login

# Stream logs (follow mode)
railway logs -f

# Look for:
# ✓ "listening on" - app started
# ✓ "SwiftPay webhook received" - payment received
# ✗ "error" - any errors to investigate
```

### 7.2 Common Log Messages

**Expected Success Logs:**
```
DRL Techs SwiftPay backend listening on http://localhost:3001
SwiftPay webhook received { orderId: 'DRL-001', status: 'completed' }
GET /health 200
POST /api/swiftpay/checkout 200
```

**Error Logs to Watch For:**
```
Invalid SwiftPay webhook signature - webhook secret mismatch
SwiftPay is not configured - missing API credentials
ECONNREFUSED - database connection issue
Error: ENOENT - missing static files
```

### 7.3 Check Application Status

1. **Railway Dashboard**
   - Status indicator should show **"Running"**
   - CPU usage should be < 5%
   - Memory usage should be < 100MB

2. **Deployment History**
   - Recent deployments should show **"Success"**
   - Click **"Redeploy"** to manually restart
   - Use previous deployments to rollback if needed

---

## Part 8: Post-Deployment Checklist

- [ ] App is deployed and running on Railway
- [ ] Health check endpoint returns 200: `curl /health`
- [ ] Static files load (CSS, JS, images)
- [ ] Admin dashboard accessible at `/admin.html`
- [ ] Projects page shows at `/projects.html`
- [ ] Checkout page works at `/checkout`
- [ ] SwiftPay payment flow completes successfully
- [ ] Webhook receives payment notifications
- [ ] Order tracking page shows after payment
- [ ] All environment variables are correctly set
- [ ] Custom domain works (if configured)
- [ ] Logs are clean with no errors

---

## Part 9: Troubleshooting

### Issue: Build Fails on Railway

**Solution:**
1. Check "Build Logs" tab in Railway
2. Look for specific error message
3. Common causes:
   - Missing `package.json`
   - Missing `Dockerfile`
   - Invalid `railway.json`
4. Fix locally and push:
   ```bash
   git add .
   git commit -m "Fix build configuration"
   git push origin main
   ```

### Issue: App Crashes After Deploy

**Solution:**
1. Check "Logs" tab in Railway
2. Look for error message
3. Verify environment variables:
   ```bash
   railway logs -f | grep "error\|Error"
   ```
4. Common causes:
   - Missing environment variables
   - Wrong PORT number
   - Invalid credentials

### Issue: Payments Not Processing

**Solution:**
1. Verify `SWIFTPAY_API_KEY` is set to **LIVE** key (not sandbox)
2. Check webhook URL in SwiftPay dashboard matches Railway domain
3. Test webhook:
   ```bash
   curl https://your-railway-domain.railway.app/api/swiftpay/webhook
   ```
4. Check logs:
   ```bash
   railway logs -f | grep "SwiftPay"
   ```

### Issue: Webhook Not Received

**Solution:**
1. Verify webhook URL registered in SwiftPay:
   - Should be: `https://your-railway-domain.railway.app/api/swiftpay/webhook`
2. Test webhook connection:
   ```bash
   # In SwiftPay dashboard, click "Test" on webhook
   # Check logs for webhook received message
   ```
3. Verify webhook secret matches:
   - `SWIFTPAY_WEBHOOK_SECRET` in Railway must match SwiftPay dashboard

### Issue: Static Files Not Loading

**Solution:**
1. Verify `public/` folder exists in repository
2. Check Dockerfile includes: `COPY . .`
3. Verify files in build logs
4. Restart deployment:
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment

---

## Part 10: Maintenance & Updates

### Rolling Updates

When you want to deploy new code:

```bash
# Make changes locally
# ... edit files ...

# Commit and push
git add .
git commit -m "Production update: [description]"
git push origin main

# Railway automatically rebuilds and deploys
# Monitor logs: railway logs -f
```

### Rollback to Previous Version

If deployment has issues:

1. Go to Railway **Deployments** tab
2. Find the previous working deployment
3. Click **"Redeploy"** button
4. App will revert to that version

### Update Environment Variables

To update payment credentials or URLs:

1. Go to Railway **Variables** tab
2. Update the variable
3. Click **"Save"**
4. Railway automatically redeploys with new variables

---

## Part 11: Production Security Checklist

- [ ] Never commit `.env` files to Git
- [ ] Use **LIVE** SwiftPay credentials (not sandbox)
- [ ] Change `ADMIN_API_KEY` from "demo-token" to secure token
- [ ] Enable webhook signature verification
- [ ] Set `NODE_ENV=production` (never development)
- [ ] Use HTTPS for all URLs (Railway provides free SSL)
- [ ] Regularly review logs for suspicious activity
- [ ] Monitor payment transactions
- [ ] Keep database connections secure
- [ ] Use strong, unique webhook secrets

---

## Success! 🎉

Your D-STUDIO application is now live on Railway in production!

**Quick Reference:**
- 🌐 App URL: `https://your-railway-domain.railway.app`
- 📊 Dashboard: `https://your-railway-domain.railway.app/admin.html`
- 🛍️ Shop: `https://your-railway-domain.railway.app/products.html`
- 💳 Checkout: `https://your-railway-domain.railway.app/checkout`
- 📋 Orders: `https://your-railway-domain.railway.app/order-tracking`
- 📞 Support: Included in D-STUDIO package

---

## Getting Help

- **Railway Docs**: https://docs.railway.app
- **SwiftPay Docs**: https://docs.swiftpay.ph
- **GitHub Issues**: Report bugs in DRLTECHS/D-STUDIO
- **Email Support**: Check your SwiftPay merchant account

---

**Last Updated:** August 2026
**Status:** ✅ Production Ready
