const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const PUBLIC_DIR = path.join(__dirname, 'public');
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

app.post('/api/swiftpay/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const secretKey = (process.env.SWIFTPAY_WEBHOOK_SECRET || process.env.SWIFTPAY_API_SECRET || '').trim();
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const incomingSignature = (
      req.headers['x-signature'] ||
      req.headers['x-swiftpay-signature'] ||
      req.headers['signature'] ||
      ''
    );

    if (secretKey && incomingSignature) {
      const signatureParts = Object.keys(payload)
        .filter((key) => key.startsWith('x_'))
        .sort((a, b) => a.localeCompare(b));

      const expected = signatureParts.map((key) => `${key}${payload[key]}`).join('');
      const computed = crypto.createHmac('sha256', secretKey).update(expected).digest('hex');

      if (String(incomingSignature).toLowerCase() !== computed.toLowerCase()) {
        return res.status(400).json({ ok: false, error: 'Invalid SwiftPay webhook signature' });
      }
    }

    const status = payload.paymentStatus || payload.status || payload.transactionStatus || 'pending';
    const orderId = payload.x_reference_no || payload.referenceNo || payload.reference_no || payload.orderId || payload.order_id || 'unknown';

    console.log('SwiftPay webhook received', { orderId, status, payload });

    return res.status(200).json({
      ok: true,
      message: 'SwiftPay webhook accepted',
      orderId,
      status
    });
  } catch (error) {
    console.error('SwiftPay webhook parse error:', error);
    return res.status(400).json({ ok: false, error: 'Invalid webhook payload' });
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function getSwiftPayRedirectUrl(type) {
  const keyMap = {
    success: 'SWIFTPAY_SUCCESS_URL',
    failure: 'SWIFTPAY_FAILURE_URL',
    cancel: 'SWIFTPAY_CANCEL_URL'
  };

  const envValue = process.env[keyMap[type]] || '';
  if (!envValue) return '';

  return envValue
    .replace('{BASE_URL}', BASE_URL)
    .replace('{ORDER_NO}', 'DRL-ORDER')
    .replace('{STATUS}', type);
}

function getSwiftPayApiBase() {
  const custom = (process.env.SWIFTPAY_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (custom) return custom;

  const mode = (process.env.SWIFTPAY_MODE || 'sandbox').toLowerCase();
  const hosts = {
    sandbox: 'https://api.pay.sandbox.live.swiftpay.ph',
    live: 'https://api.pay.live.swiftpay.ph'
  };
  return hosts[mode] || hosts.sandbox;
}

function computeSignature(params, secretKey) {
  const xParams = Object.keys(params)
    .filter((key) => key.startsWith('x_'))
    .sort((a, b) => a.localeCompare(b));

  const message = xParams.map((key) => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function isSwiftPayConfigured() {
  return !!(process.env.SWIFTPAY_API_KEY && process.env.SWIFTPAY_API_SECRET);
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'd-studio-swiftpay', mode: process.env.SWIFTPAY_MODE || 'sandbox' });
});

app.get('/api/swiftpay/institutions', async (req, res) => {
  if (!isSwiftPayConfigured()) {
    return res.status(500).json({ error: 'SwiftPay is not configured. Set SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET.' });
  }

  try {
    const apiBase = getSwiftPayApiBase();
    const response = await fetch(`${apiBase}/api/institutions`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const text = await response.text();
    let payload = [];
    try { payload = JSON.parse(text); } catch (error) { payload = []; }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'SwiftPay institutions request failed',
        details: payload.message || payload.error || text || 'Unknown error'
      });
    }

    res.json(Array.isArray(payload) ? payload : [payload]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch SwiftPay institutions', details: error.message });
  }
});

app.post('/api/swiftpay/create-order', async (req, res) => {
  try {
    const {
      orderId,
      amount,
      currency = 'PHP',
      customerName = '',
      customerEmail = '',
      customerPhone = '',
      institutionCode = null,
      items = []
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Missing or invalid amount' });
    }

    if (!isSwiftPayConfigured()) {
      return res.status(500).json({ error: 'SwiftPay is not configured. Set SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET.' });
    }

    const accessKey = process.env.SWIFTPAY_API_KEY.trim();
    const secretKey = process.env.SWIFTPAY_API_SECRET.trim();
    const apiBase = getSwiftPayApiBase();
    const normalizedAmount = Number(amount).toFixed(2);

    const params = {
      x_access_key: accessKey,
      x_reference_no: String(orderId),
      x_amount: normalizedAmount,
      x_currency: String(currency).toUpperCase(),
      details: [
        {
          customerName: String(customerName || ''),
          customerEmail: String(customerEmail || ''),
          customerPhone: String(customerPhone || ''),
          items: (items.length ? items : [{ name: `Order #${orderId}`, quantity: 1, amount: normalizedAmount }]).map((item) => ({
            name: String(item.name || `Order #${orderId}`),
            quantity: Number(item.quantity || 1),
            amount: Number(item.amount || normalizedAmount).toFixed(2)
          }))
        }
      ],
      generate_customer_redirect_url: true,
      success_url: getSwiftPayRedirectUrl('success') || `${BASE_URL}/order-tracking.html?orderId=${encodeURIComponent(orderId)}`,
      failure_url: getSwiftPayRedirectUrl('failure') || `${BASE_URL}/checkout.html?status=failed&orderId=${encodeURIComponent(orderId)}`,
      cancel_url: getSwiftPayRedirectUrl('cancel') || `${BASE_URL}/checkout.html?status=cancelled&orderId=${encodeURIComponent(orderId)}`
    };

    if (institutionCode) {
      params.institution_code = String(institutionCode);
    }

    params.signature = computeSignature(params, secretKey);

    const response = await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(params)
    });

    const text = await response.text();
    let payload = {};
    try { payload = JSON.parse(text); } catch (error) { payload = {}; }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'SwiftPay order creation failed',
        details: payload.message || payload.error || text || 'Unknown SwiftPay error'
      });
    }

    const checkoutUrl = payload.customerRedirectUrl || payload.redirect_url || payload.checkoutUrl || payload.checkout_url || payload.url;
    if (!checkoutUrl) {
      return res.status(502).json({
        error: 'SwiftPay did not return a checkout URL',
        payload
      });
    }

    return res.json({
      ok: true,
      checkoutId: String(orderId),
      checkoutUrl,
      institutionCode: institutionCode || null,
      response: payload
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Unexpected SwiftPay backend error',
      details: error.message
    });
  }
});

app.use(express.static(PUBLIC_DIR));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DRL Techs SwiftPay backend listening on http://localhost:${PORT}`);
});
