# GitHub Actions Railway Deployment Setup

This guide walks you through setting up automated Railway deployments with GitHub Actions.

## 📋 Prerequisites

- Railway account with active project
- GitHub repository (already connected)
- Railway CLI installed locally (for testing)

## 🔑 Step 1: Get Your Railway Token

### Via Railway Dashboard:
1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click your profile → **Account**
3. Scroll to **API Tokens**
4. Click **+ New Token**
5. Name it: `github-actions`
6. Copy the token (you'll need it in Step 2)

### Via Railway CLI (if installed):
```bash
railway token
```

## 🔐 Step 2: Add GitHub Secrets

1. Go to your GitHub repository
2. Settings → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `RAILWAY_TOKEN` | Your Railway API token from Step 1 |
| `RAILWAY_DOMAIN` | Your Railway domain (e.g., `d-studio-production.railway.app`) |

> **Find your domain:** Railway Dashboard → Your Project → Deployments → View Domain

## 🚀 Step 3: Link Railway Project to Deployment

### Option A: Using GitHub (Recommended)
Railway can auto-detect your GitHub repo:

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Select your project
3. Click **Settings**
4. Under **GitHub**, connect your repo
5. Railway will auto-deploy on push to main

### Option B: Using Railway CLI
```bash
# Login to Railway
railway login

# Set project
railway link

# Test deployment
railway deploy
```

## ✅ Step 4: Verify the Workflow

### Check Workflow Status:
1. Go to your GitHub repo → **Actions**
2. Look for the **Deploy to Railway** workflow
3. Click on a run to see detailed logs

### Common Workflow States:
- 🟢 **Green/Success**: Deployment completed successfully
- 🟡 **Yellow/Queued**: Workflow is waiting to run
- 🔴 **Red/Failed**: Deployment failed (check logs)

## 🧪 Test the Automation

1. Make a small change to `server.js` or `package.json`
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "test: trigger railway deployment"
   git push origin main
   ```
3. Watch the GitHub Actions workflow run:
   ```bash
   # View real-time logs
   gh run list --workflow=railway-deploy.yml
   ```

## 📊 Monitoring Deployments

### GitHub Actions:
- Repo → **Actions** tab shows all workflow runs
- Each run shows build, test, and deployment logs
- Failed steps show detailed error messages

### Railway Dashboard:
- **Deployments** tab shows all service versions
- Click any deployment to see logs
- **Metrics** tab shows CPU, memory, and request rates

## 🔧 Customizing the Workflow

Edit `.github/workflows/railway-deploy.yml` to:

### Disable Health Check:
```yaml
- name: Health check
  if: false  # Skip this step
```

### Deploy Only on Release Tags:
```yaml
on:
  push:
    branches: [main]
    tags: ['v*.*.*']
```

### Add Slack Notifications:
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🚀 D-STUDIO deployed to Railway!"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 🐛 Troubleshooting

### Workflow doesn't trigger:
- Check branch is `main` (not `master`)
- Verify workflow file is in `.github/workflows/`
- Check GitHub Actions is enabled in repo settings

### Railway deployment fails:
- Verify `RAILWAY_TOKEN` is valid
- Check Railway project exists
- Review Railway logs in dashboard

### Health check fails:
- Ensure `RAILWAY_DOMAIN` is correct
- Verify `/health` endpoint is responding
- Check app logs: Railway Dashboard → Deployments → Logs

### Service won't start:
- Run `npm ci && npm run build` locally
- Check `server.js` for syntax errors
- Verify dependencies in `package.json`

## 📝 Environment Variables

Railway automatically reads from these sources in order:
1. `.env.railway` (local testing)
2. Railway dashboard variables
3. GitHub Actions secrets (if using custom scripts)

Add to Railway dashboard:
```
PORT=3001
NODE_ENV=production
BASE_URL=https://your-railway-domain.railway.app
ADMIN_API_KEY=your-secure-key
SWIFTPAY_API_KEY=your-key
SWIFTPAY_API_SECRET=your-secret
SWIFTPAY_WEBHOOK_SECRET=your-secret
SWIFTPAY_MODE=live
```

## 🎯 Next Steps

1. ✅ Add `RAILWAY_TOKEN` and `RAILWAY_DOMAIN` secrets
2. ✅ Test with a small commit to main
3. ✅ Monitor first deployment in GitHub Actions
4. ✅ Check health endpoint on Railway domain
5. ✅ Monitor Railway logs for issues

## 📚 Resources

- [Railway Docs](https://docs.railway.app)
- [Railway GitHub Integration](https://docs.railway.app/guides/github)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [D-STUDIO Railway Quickstart](./RAILWAY_QUICKSTART.md)
