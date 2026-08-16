# Admin Panel Quick Reference

## 🚀 Quick Start

1. **Access Admin Panel**
   ```
   https://your-domain.com/admin.html
   ```

2. **Default Login**
   - Password: `admin123`
   - ⚠️ Change in Settings immediately

3. **First Action**
   - Go to Settings → Change Admin Password

---

## 📊 Dashboard Tab

| Metric | Shows |
|--------|-------|
| 📊 Total Orders | All orders |
| ✓ Completed | Paid orders |
| ⏳ Pending | Awaiting payment |
| 💰 Total Revenue | Sum of completed |

**Recent Activity** - Last 5 orders with status

---

## 📦 Orders Management

**View all orders** with:
- Order ID
- Customer name
- Amount (₱ PHP)
- Status badge
- Order date

**Actions:**
- 🔍 Search by Order ID
- 🔽 Filter by Status (All, Pending, Completed, Failed)

---

## 🔔 Webhook Logs

**Track incoming webhooks** from SwiftPay:
- Order ID
- Status (✓ Success / ✗ Error)
- Timestamp
- Payment status

**Actions:**
- 📋 View last 20 logs
- 🗑️ Clear all logs
- 📋 Copy webhook URL
- 🧪 Test webhook

**Webhook URL:** `/api/swiftpay/webhook`

---

## ⚙️ Settings

### Password Management
```
1. Enter current password
2. Enter new password (min 6 chars)
3. Confirm password
4. Click "Update Password"
```

### SwiftPay Config
- 🔑 API Key (masked)
- 🔐 API Secret (masked)
- 🎯 Mode (sandbox/live)

**Action:** Click "Reveal" to show temporarily

### System Info
- 🌍 Environment (development/production)
- 🔗 Base URL
- ✓ Server Status

### Danger Zone
- 🔓 Clear All Sessions (logout all admins)
- 🔄 Reset Demo Data (reload sample orders)

---

## 🔐 Security Tips

✅ **DO:**
- Change default password first
- Use strong passwords (12+ chars)
- Log out when finished
- Keep browser updated
- Use HTTPS only

❌ **DON'T:**
- Share login credentials
- Use simple passwords
- Leave session open
- Click "Reveal" on shared screen
- Write password in public places

---

## ⌨️ Browser Tips

- Press **F12** to open developer console
- Check console for error messages
- Use **Ctrl+Shift+Delete** to clear cache
- Private mode doesn't save sessions

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Can't login | Check password, clear cache |
| Sessions not saving | Use normal mode (not private) |
| No orders showing | Reset data in Settings |
| Webhook logs empty | Use "Test Webhook" button |
| Forgot password | Clear localStorage, use default |

---

## 📞 Support

**Check these first:**
1. This quick reference
2. ADMIN_SETUP.md (detailed guide)
3. Browser console (F12)
4. Server logs: `railway logs -f`

---

## 🎯 Key URLs

| Page | URL |
|------|-----|
| Admin Panel | `/admin.html` |
| Webhook Endpoint | `/api/swiftpay/webhook` |
| System Status | `/api/admin/system` |
| Orders API | `/api/admin/orders` |
| Webhooks API | `/api/admin/webhooks` |

---

## ⏱️ Session Info

- **Duration:** 24 hours
- **Storage:** Browser localStorage
- **Auto-logout:** After 24 hours of inactivity
- **Session Token:** Automatically generated on login

---

## 🎨 UI Legend

### Status Badges
- 🟡 **Pending** - Awaiting payment
- ✅ **Completed** - Payment received
- ❌ **Failed** - Payment failed

### Color Coding
- 🟡 Yellow - Pending/Warning
- 🟢 Green - Success/Approved
- 🔴 Red - Error/Failed
- ⚪ Gray - Neutral/Info

### Icons
- 📊 Dashboard - Statistics
- 📦 Orders - Order management
- 🔔 Webhooks - Payment notifications
- ⚙️ Settings - Configuration
- 🚪 Logout - Sign out

---

**Need detailed help?** → See [ADMIN_SETUP.md](ADMIN_SETUP.md)

**Last Updated:** 2026-08-16
