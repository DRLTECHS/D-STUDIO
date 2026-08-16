# 🚀 Railway Production Deployment Checklist

Quick reference checklist for deploying D-STUDIO to production on Railway.

## Phase 1: Pre-Deployment ✅

- [ ] All code committed to GitHub (main branch)
- [ ] `package.json` contains correct dependencies
- [ ] `Dockerfile` is present and optimized
- [ ] `railway.json` is present and configured
- [ ] `Procfile` points to correct start command
- [ ] `.env.prod` file reviewed with all variables
- [ ] SwiftPay live credentials obtained from merchant dashboard
- [ ] Custom domain registered (optional)

**Verify:**
```bash
git status  # Should show "working tree clean"
ls -la Dockerfile railway.json Procfile package.json
```

---

## Phase 2: Railway Project Setup ✅

- [ ] Railway account created
- [ ] GitHub authorized with Railway
- [ ] DRLTECHS/D-STUDIO repository selected
- [ ] Initial deployment completed
- [ ] Build Logs show "Success"
- [ ] App URL generated (e.g., d-studio-prod-xxx.railway.app)

**Commands:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Log in
railway login

# View status
railway status
```

---

## Phase 3: Environment Configuration ✅

### Server Configuration
- [ ] `PORT=3001` set in Railway Variables
- [ ] `NODE_ENV=production` set in Railway Variables
- [ ] `BASE_URL=https://your-railway-domain.railway.app` (update placeholder)

### SwiftPay Live Configuration
- [ ] `SWIFTPAY_API_KEY=<your_actual_key>` (from SwiftPay dashboard, LIVE not sandbox)
- [ ] `SWIFTPAY_API_SECRET=<your_actual_secret>` (LIVE credentials)
- [ ] `SWIFTPAY_WEBHOOK_SECRET=<your_webhook_secret>`
- [ ] `SWIFTPAY_MODE=live` (if applicable)

### Redirect URLs
- [ ] `SWIFTPAY_SUCCESS_URL=https://your-railway-domain.railway.app/order-tracking`
- [ ] `SWIFTPAY_FAILURE_URL=https://your-railway-domain.railway.app/checkout`
- [ ] `SWIFTPAY_CANCEL_URL=https://your-railway-domain.railway.app/products`

### Logging
- [ ] `LOG_LEVEL=info` set (or debug for troubleshooting)

**Verify:**
```bash
# View all variables in Railway dashboard
# Or via CLI:
railway variables

# Test health endpoint
curl https://your-railway-domain.railway.app/health
# Expected: {"ok":true,"service":"d-studio-swiftpay","mode":"live"}
```

---

## Phase 4: SwiftPay Webhook Registration ✅

- [ ] SwiftPay merchant account accessed
- [ ] Webhook URL created in SwiftPay dashboard: `https://your-railway-domain.railway.app/api/swiftpay/webhook`
- [ ] Webhook secret copied from SwiftPay to Railway Variables
- [ ] Webhook tested in SwiftPay dashboard
- [ ] Webhook logs appear in Railway logs:
  ```
  SwiftPay webhook received { orderId: 'xxx', status: 'completed' }
  ```

**Verify:**
```bash
# View webhook logs
railway logs -f | grep -i webhook
```

---

## Phase 5: Application Testing ✅

### Static Files
- [ ] Home page loads: `https://your-railway-domain.railway.app`
- [ ] Projects page loads: `https://your-railway-domain.railway.app/projects.html`
- [ ] Admin dashboard loads: `https://your-railway-domain.railway.app/admin.html`
- [ ] CSS/JS files load without 404 errors
- [ ] Images display correctly

### API Health
- [ ] `/health` endpoint returns 200
- [ ] `/api/swiftpay/institutions` returns institutions list
- [ ] Admin API endpoints work with auth token

**Test Commands:**
```bash
# Test health
curl https://your-railway-domain.railway.app/health

# Test institutions
curl https://your-railway-domain.railway.app/api/swiftpay/institutions

# Test admin orders (replace TOKEN)
curl -H "Authorization: Bearer demo-token" \
  https://your-railway-domain.railway.app/api/admin/orders
```

### Payment Flow
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Payment redirects to SwiftPay
- [ ] Complete payment on SwiftPay
- [ ] Redirected back to order-tracking page
- [ ] Order appears in database

### Webhook
- [ ] Payment trigger generates webhook
- [ ] Webhook received by `/api/swiftpay/webhook`
- [ ] Logs show successful webhook processing
- [ ] No signature errors in logs

**Monitor logs:**
```bash
railway logs -f

# Look for:
# POST /api/swiftpay/webhook 200
# SwiftPay webhook received
```

---

## Phase 6: Performance & Monitoring ✅

- [ ] No 4xx errors in logs (except 404 for missing files)
- [ ] No 5xx errors in logs
- [ ] CPU usage < 10%
- [ ] Memory usage < 150MB
- [ ] Response time < 500ms
- [ ] Deployment status shows "Running"

**Check Performance:**
```bash
# View recent logs
railway logs

# View deployment status
railway status

# Monitor in real-time
railway logs -f
```

---

## Phase 7: Custom Domain (Optional) ✅

If using custom domain:

- [ ] Custom domain added in Railway dashboard
- [ ] DNS CNAME record added at domain provider:
  ```
  app.yourdomain.com CNAME → your-railway-domain.railway.app
  ```
- [ ] DNS propagated (wait 15-30 minutes)
- [ ] Custom domain accessible
- [ ] SSL certificate auto-generated (Railway provides free)
- [ ] Environment variables updated with custom domain:
  ```
  BASE_URL=https://app.yourdomain.com
  SWIFTPAY_SUCCESS_URL=https://app.yourdomain.com/order-tracking
  ... (all URL variables updated)
  ```
- [ ] Webhook URL updated in SwiftPay to custom domain

---

## Phase 8: Security Verification ✅

- [ ] `SWIFTPAY_API_KEY` uses LIVE credentials (not sandbox)
- [ ] `SWIFTPAY_API_SECRET` is not visible in logs
- [ ] `SWIFTPAY_WEBHOOK_SECRET` matches SwiftPay settings
- [ ] `NODE_ENV=production` (never development)
- [ ] All URLs use HTTPS (not HTTP)
- [ ] No `.env` files committed to Git
- [ ] Sensitive data not logged to console
- [ ] Webhook signature verification enabled

**Verify Security:**
```bash
# Check no .env files in repo
git ls-files | grep .env  # Should return nothing

# Verify production mode
railway logs | grep "NODE_ENV"  # Should show "production"

# Check for sensitive data in logs
railway logs | grep -i "secret\|key\|token" | head -5
```

---

## Phase 9: Backup & Recovery ✅

- [ ] Note current deployment version in Railway Deployments tab
- [ ] Understand how to rollback to previous deployment
- [ ] Know how to restart application
- [ ] Know how to view previous build logs
- [ ] Have backup of environment variables

**Rollback Procedure:**
```bash
# If needed:
# 1. Go to Railway Deployments tab
# 2. Find previous successful deployment
# 3. Click "Redeploy"
# 4. Verify logs: railway logs -f
```

---

## Phase 10: Handoff & Documentation ✅

- [ ] Deployment documented (this checklist completed)
- [ ] Environment variables stored securely
- [ ] Team members have Railway access
- [ ] Support contact information available
- [ ] Monitoring alerts configured (optional)
- [ ] Runbook created for common issues

**Documentation Links:**
- [ ] `DEPLOY_PROD_RAILWAY.md` - Full deployment guide
- [ ] `RAILWAY_QUICKSTART.md` - Quick reference
- [ ] Environment variables documented
- [ ] Webhook setup documented
- [ ] Troubleshooting guide available

---

## Troubleshooting Quick Reference

### App Not Starting
```bash
# Check logs
railway logs -f | head -20

# Common issues:
# - PORT not set (should be 3001)
# - NODE_ENV not production
# - Missing dependencies
```

### Payment Not Processing
```bash
# Check credentials
# 1. Verify SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET are LIVE (not sandbox)
# 2. Verify webhook URL in SwiftPay dashboard
# 3. Check logs: railway logs -f | grep -i swiftpay
```

### Webhook Not Received
```bash
# Check webhook configuration
# 1. URL matches: https://your-railway-domain.railway.app/api/swiftpay/webhook
# 2. Secret matches SWIFTPAY_WEBHOOK_SECRET
# 3. Test in SwiftPay dashboard
# 4. Monitor: railway logs -f | grep webhook
```

### Build Fails
```bash
# Check build logs
# 1. Railway dashboard → Build Logs
# 2. Common issues:
#    - package.json syntax error
#    - Missing Dockerfile
#    - Disk space (usually not issue on Railway)
# 3. Push fix and rebuild:
#    git push origin main
```

---

## Success Indicators ✅

When all boxes are checked:

✅ App is live at `https://your-railway-domain.railway.app`  
✅ Health check passes: `/health` returns 200  
✅ Payment flow works end-to-end  
✅ Webhooks received successfully  
✅ No errors in logs  
✅ Performance metrics are good  
✅ Team can access and manage deployment  

---

## Post-Deployment Maintenance

**Daily:**
- [ ] Check logs for errors: `railway logs -f`
- [ ] Monitor payment transactions
- [ ] Verify health endpoint: `curl /health`

**Weekly:**
- [ ] Review performance metrics
- [ ] Check failed transactions
- [ ] Update security patches if needed

**Monthly:**
- [ ] Review and optimize costs
- [ ] Audit environment variables
- [ ] Test rollback procedure
- [ ] Update documentation

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Domain:** _________________  
**Status:** ✅ Production Ready

---

**Need Help?**
- 📖 Full Guide: `DEPLOY_PROD_RAILWAY.md`
- 🚀 Quick Start: `RAILWAY_QUICKSTART.md`
- 💬 Support: SwiftPay dashboard → Support
