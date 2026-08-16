# Admin Panel Setup Guide

## Overview

The D-STUDIO Admin Panel is a secure dashboard for managing orders, monitoring webhooks, and configuring system settings. The panel features a modern dark UI with real-time statistics and comprehensive management tools.

---

## Accessing the Admin Panel

### URL
```
https://your-domain.com/admin.html
```

### Default Credentials
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change the default password immediately after first login in the Settings tab.

---

## Features

### 📊 Dashboard
- **Total Orders** - Count of all orders in the system
- **Completed Orders** - Successfully processed payments
- **Pending Orders** - Orders awaiting payment confirmation
- **Total Revenue** - Sum of all completed payments
- **Recent Activity** - Last 5 orders with status and timestamps

### 📦 Orders Management
- View all orders with order ID, customer name, amount, status, and date
- **Search** - Find orders by Order ID
- **Filter** - Filter by status (Pending, Completed, Failed)
- Real-time status updates

### 🔔 Webhook Logs
- Monitor all incoming webhooks from SwiftPay
- Track webhook success/failure status
- View webhook timestamps and payload details
- Last 20 webhook logs displayed
- Clear logs function for maintenance

### ⚙️ Settings
- **Change Admin Password** - Update login credentials
- **View SwiftPay Configuration** - See API Key and Secret (masked for security)
- **System Information** - Environment, Base URL, Server Status
- **Clear Sessions** - Log out all admin users
- **Reset Demo Data** - Restore initial demo orders and logs

---

## Security Features

1. **Session Management**
   - Sessions stored in browser localStorage
   - Automatic session expiration after 24 hours
   - Session token generated on successful login

2. **Password Protection**
   - Minimum 6 characters required
   - Stored securely in browser
   - Can be changed anytime from Settings

3. **Masked Credentials**
   - API keys and secrets are masked by default
   - Click "Reveal" to temporarily show (for copying)
   - All credentials are client-side only (not transmitted)

4. **Reduced Motion Support**
   - Respects user's motion preferences
   - Animations disabled for accessibility

---

## First-Time Setup

### Step 1: Access Admin Panel
1. Navigate to `https://your-domain.com/admin.html`
2. Enter default password: `admin123`
3. Click "Sign In"

### Step 2: Change Default Password
1. Go to **Settings** tab
2. Under "Password" section:
   - Enter current password: `admin123`
   - Enter new password (minimum 6 characters)
   - Confirm new password
3. Click "Update Password"
4. Success! Your new password is now saved

### Step 3: Configure Dashboard
1. Review **Dashboard** for order statistics
2. Check **Orders** tab for existing orders
3. Monitor **Webhooks** tab for incoming payments
4. Verify **Settings** shows correct SwiftPay configuration

---

## Daily Operations

### Monitoring Orders
1. Go to **Orders** tab
2. Search or filter orders as needed
3. Status indicators show order state:
   - 🟡 Pending (payment pending)
   - ✅ Completed (payment received)
   - ❌ Failed (payment failed)

### Checking Webhooks
1. Go to **Webhooks** tab
2. View last 20 incoming webhook events
3. Each log shows:
   - Order ID
   - Success/Error status
   - Timestamp
   - Payment status from SwiftPay

### System Health Check
1. Go to **Settings** tab
2. Check "Server Status" - should show ✓ Online
3. Verify Base URL matches your domain
4. Confirm SwiftPay Mode is correct (sandbox/live)

---

## API Endpoints

Admin API endpoints for integrating with external systems:

### Get System Status
```bash
GET /api/admin/system
```
Response:
```json
{
  "status": "online",
  "environment": "production",
  "swiftpayMode": "live",
  "uptime": 3600,
  "timestamp": "2026-08-16T10:30:00Z"
}
```

### Get Orders
```bash
GET /api/admin/orders
```
Response:
```json
{
  "orders": [
    {
      "orderId": "DRL-001",
      "customerName": "John Doe",
      "amount": 5000,
      "currency": "PHP",
      "status": "completed",
      "timestamp": 1692180000000
    }
  ],
  "count": 1
}
```

### Get Webhook Logs
```bash
GET /api/admin/webhooks
```
Response:
```json
{
  "webhooks": [
    {
      "orderId": "DRL-001",
      "success": true,
      "status": "completed",
      "timestamp": 1692180000000
    }
  ],
  "count": 1
}
```

### Test Webhook
```bash
POST /api/admin/webhook-test
```

---

## Troubleshooting

### Lost Admin Password
**Solution:** Use browser developer tools to clear localStorage:
```javascript
// In browser console (F12)
localStorage.clear();
// Then reload and use default password: admin123
```

### Sessions Not Persisting
**Possible Causes:**
- Private/Incognito mode doesn't support persistent storage
- Browser localStorage is disabled
- Browser cache cleared

**Solution:**
- Use normal browsing mode
- Check browser storage settings
- Re-login to recreate session

### Orders Not Showing
**Solution:**
1. Go to Settings → "Reset Demo Data" to load sample orders
2. Check browser console for errors (F12)
3. Verify `/api/admin/orders` endpoint is accessible

### Webhook Logs Empty
**Solution:**
1. Webhook logs start empty
2. First webhook will appear when SwiftPay sends payment notification
3. Use "Test Webhook" button in Webhooks tab to trigger test

### Can't Login
**Solution:**
1. Check password hasn't been changed
2. Clear browser cache and try again
3. Reset to default: `admin123` by clearing localStorage

---

## Best Practices

1. **Security**
   - Change default password immediately
   - Use strong, unique password (12+ characters recommended)
   - Don't share login credentials
   - Log out when finished

2. **Monitoring**
   - Check dashboard daily for order statistics
   - Monitor webhook logs for payment failures
   - Review pending orders regularly

3. **Maintenance**
   - Clear webhook logs periodically to free space
   - Keep browser updated for security
   - Use HTTPS only (never HTTP)

4. **Backup**
   - Export order data regularly
   - Keep records of important transactions
   - Document any manual adjustments

---

## Keyboard Shortcuts

Coming soon - Custom shortcuts for power users

---

## Support & Help

For issues or questions:
1. Check this guide first
2. Review browser console (F12) for error messages
3. Check server logs: `railway logs -f`
4. Contact support with screenshot and error details

---

## Version Information

- **Admin Panel Version:** 1.0.0
- **Release Date:** 2026-08-16
- **Compatible with:** DRL Techs v1.0.0+
- **Browser Support:** Chrome, Firefox, Safari, Edge (latest versions)

---

## Features Coming Soon

- 📈 Advanced reporting and analytics
- 📊 Chart visualizations for sales trends
- 🔐 Multi-admin user management
- 📧 Email notifications for orders
- 💾 Database integration for persistence
- 🌐 API token management
- 📱 Mobile-responsive admin app

---

**Your Admin Panel is ready to use! 🎉**
