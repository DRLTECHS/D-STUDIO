# PostgreSQL Setup for Railway Deployment

## Overview

This guide walks you through adding a PostgreSQL database to your D-STUDIO Railway deployment for persistent order tracking and data storage.

---

## Step 1: Add PostgreSQL to Railway

### In Railway Dashboard

1. Go to your project
2. Click **"+ Create"** (top right)
3. Select **"Database"** → **"PostgreSQL"**
4. Wait ~30 seconds for provisioning
5. Copy the connection string (it appears in the "Variables" tab)

### Environment Variable

Railway automatically creates:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

This is automatically available in your app's environment.

---

## Step 2: Database Schema

Create these tables for D-STUDIO:

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  orderId VARCHAR(50) UNIQUE NOT NULL,
  customerName VARCHAR(255),
  customerEmail VARCHAR(255),
  customerPhone VARCHAR(20),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PHP',
  status VARCHAR(50) DEFAULT 'pending',
  items JSONB,
  paymentMethod VARCHAR(100),
  transactionId VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_createdAt ON orders(createdAt DESC);
```

### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  image VARCHAR(500),
  stock INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Webhooks Log Table
```sql
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  orderId VARCHAR(50),
  eventType VARCHAR(100),
  status VARCHAR(50),
  payload JSONB,
  success BOOLEAN DEFAULT false,
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_orderId ON webhook_logs(orderId);
CREATE INDEX idx_webhooks_createdAt ON webhook_logs(createdAt DESC);
```

### Admin Users Table
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  apiKey VARCHAR(255) UNIQUE,
  lastLogin TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Step 3: Install PostgreSQL Client

Add to `package.json` dependencies:

```bash
npm install pg
```

---

## Step 4: Create Database Connection Module

Create `api/_lib/db.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
```

---

## Step 5: Migrate Order Storage to PostgreSQL

### Current (Mock Data in Memory)
```javascript
let orders = []; // stored in memory, lost on restart
```

### Updated (PostgreSQL)

Replace the mock order handling in `server.js`:

```javascript
const db = require('./api/_lib/db');

// Get all orders
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders ORDER BY createdAt DESC'
    );
    res.json({ orders: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
app.get('/api/admin/orders/:orderId', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE orderId = $1',
      [req.params.orderId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
app.post('/api/swiftpay/create-order', async (req, res) => {
  const { orderId, amount, currency, customerName, customerEmail, items } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO orders 
       (orderId, amount, currency, customerName, customerEmail, items, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [orderId, amount, currency || 'PHP', customerName, customerEmail, JSON.stringify(items || [])]
    );

    res.json({
      ok: true,
      order: result.rows[0],
      checkoutUrl: `https://pay.swiftpay.ph/...` // SwiftPay checkout
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (via webhook)
app.post('/api/swiftpay/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // ... verify signature ...

  try {
    const orderId = payload.x_reference_no;
    const status = payload.paymentStatus === 'success' ? 'completed' : 'failed';

    await db.query(
      'UPDATE orders SET status = $1, updatedAt = CURRENT_TIMESTAMP, completedAt = CASE WHEN $1 = \'completed\' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE orderId = $2',
      [status, orderId]
    );

    // Log webhook
    await db.query(
      `INSERT INTO webhook_logs (orderId, eventType, status, payload, success) 
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, 'payment', status, JSON.stringify(payload), status === 'completed']
    );

    res.json({ ok: true, orderId, status });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

---

## Step 6: Run Schema on Railway

### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Connect to your project
railway link

# Run SQL directly
railway run psql -c "CREATE TABLE orders (...)"
```

### Option B: Using pgAdmin (GUI)

1. Get PostgreSQL connection details from Railway
2. Use pgAdmin or DBeaver
3. Execute the schema SQL directly

### Option C: Automatic Migration Script

Create `scripts/init-db.js`:

```javascript
const db = require('../api/_lib/db');

const schema = `
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    orderId VARCHAR(50) UNIQUE NOT NULL,
    customerName VARCHAR(255),
    customerEmail VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',
    status VARCHAR(50) DEFAULT 'pending',
    items JSONB,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    orderId VARCHAR(50),
    eventType VARCHAR(100),
    status VARCHAR(50),
    payload JSONB,
    success BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function initDatabase() {
  try {
    await db.query(schema);
    console.log('✅ Database initialized');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database init failed:', error);
    process.exit(1);
  }
}

initDatabase();
```

Add to `package.json`:
```json
"scripts": {
  "init-db": "node scripts/init-db.js"
}
```

---

## Step 7: Deploy with Database

### In Railway

1. Add `DATABASE_URL` to Variables (done automatically)
2. Redeploy the service
3. Run init script: `railway run npm run init-db`
4. Verify in logs

### Health Check

```bash
# Test database connection
curl https://your-railway-app.railway.app/health

# Should return:
# {"ok":true,"service":"d-studio-swiftpay","mode":"live","database":"connected"}
```

---

## Step 8: Add Database Health Check

Update `server.js`:

```javascript
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      ok: true,
      service: 'd-studio-swiftpay',
      mode: process.env.SWIFTPAY_MODE || 'sandbox',
      database: result.rows[0] ? 'connected' : 'error'
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      service: 'd-studio-swiftpay',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

---

## Migration: Mock Data → PostgreSQL

When ready to migrate existing mock data:

```javascript
// scripts/migrate-mock-data.js
const db = require('../api/_lib/db');

// Import from memory (if saved) or reload from localStorage
const mockOrders = [
  { orderId: 'DRL-001', customerName: 'John Doe', amount: 5000, ... },
  // ... all existing orders
];

async function migrate() {
  for (const order of mockOrders) {
    await db.query(
      `INSERT INTO orders (orderId, customerName, amount, currency, status, createdAt) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.orderId, order.customerName, order.amount, 'PHP', order.status, new Date()]
    );
  }
  console.log('✅ Migration complete');
}

migrate();
```

---

## Backup & Maintenance

### Automated Backups (Railway)
- Railway provides automated daily backups
- Go to PostgreSQL service → Backups tab
- No additional setup needed

### Manual Backup
```bash
# Dump database
railway run pg_dump -U postgres > backup.sql

# Restore
railway run psql -U postgres < backup.sql
```

### Monitoring
- Railway dashboard shows database CPU, memory, connections
- Use `railway logs -f` to watch for errors

---

## Cost Considerations

**Railway Pricing:**
- PostgreSQL: $12/month (free tier available)
- Includes: 5GB storage, automated backups
- Scales as needed

---

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED
```
- Check `DATABASE_URL` is set in Railway
- Verify database is running in Railway dashboard
- Check firewall rules (Railway handles this)

### SSL Error
```
Error: self-signed certificate
```
```javascript
ssl: { rejectUnauthorized: false } // Added in db.js
```

### Query Errors
- Check table names match schema
- Verify column names and types
- Check prepared statement syntax

---

## Next Steps

1. ✅ Develop with mock data (current)
2. ✅ Deploy to Railway (current)
3. Add PostgreSQL to Railway (this guide)
4. Update code to use database
5. Run migrations
6. Test payment flow with real database
7. Monitor production

---

## Resources

- [Railway PostgreSQL Docs](https://docs.railway.app/guides/databases)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node pg Library](https://node-postgres.com/)
- [pgAdmin GUI](https://www.pgadmin.org/)
