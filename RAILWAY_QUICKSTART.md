# Quick Railway Deployment Checklist

## 🚀 Deploy in 5 Minutes

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Railway production deployment config"
git push origin main
```

### 2. Connect to Railway
- Visit https://railway.app
- Click "New Project" → "Deploy from GitHub"
- Select DRLTECHS/D-STUDIO repository
- Wait for initial build & deployment

### 3. Configure Environment Variables
In Railway dashboard, go to your service's "Variables" tab and add:

```
BASE_URL = https://your-app-name.railway.app
NODE_ENV = production

SWIFTPAY_API_KEY = [from SwiftPay dashboard]
SWIFTPAY_API_SECRET = [from SwiftPay dashboard]
SWIFTPAY_WEBHOOK_SECRET = [from SwiftPay dashboard]

SWIFTPAY_SUCCESS_URL = https://your-app-name.railway.app/order-tracking
SWIFTPAY_FAILURE_URL = https://your-app-name.railway.app/checkout
SWIFTPAY_CANCEL_URL = https://your-app-name.railway.app/products
```

Click "Save" - Railway will redeploy automatically.

### 4. Register Webhook
1. Get your Railway domain from dashboard (Deployments tab)
2. In SwiftPay dashboard: Settings → Webhooks → Add New
3. Webhook URL: `https://your-railway-domain.railway.app/api/swiftpay/webhook`
4. Test webhook and verify in Railway logs

### 5. Verify Deployment
```bash
# Test the API
curl https://your-app-name.railway.app/health

# View live logs
npm install -g @railway/cli
railway login
railway logs -f
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `Procfile` | Tells Railway how to start the app |
| `railway.json` | Build configuration for Railway |
| `.env.railway` | Environment variable template |
| `DEPLOY_RAILWAY.md` | Full deployment guide with troubleshooting |

---

## 📋 Troubleshooting Quick Links

- **Build failing?** Check "Build Logs" in Railway dashboard
- **App crashing?** Check "Logs" tab - look for error messages
- **Webhook not working?** Verify URL and check logs with `railway logs -f`
- **Want to rollback?** Go to Deployments tab, click Redeploy on previous version

---

## 🎯 Next Steps

1. ✅ Push repository to GitHub
2. ✅ Connect to Railway
3. ✅ Set environment variables
4. ✅ Register webhook in SwiftPay
5. ✅ Test payment flow
6. ✅ Monitor logs: `railway logs -f`
7. ✅ Configure custom domain (optional)
8. ✅ Set up error tracking (Sentry/Rollbar)

**Your production app is now live on Railway! 🎉**
