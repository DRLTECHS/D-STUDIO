const crypto = require('crypto');

function computeSignature(params, secretKey) {
  const xParams = Object.keys(params || {})
    .filter((key) => key.startsWith('x_'))
    .sort((a, b) => a.localeCompare(b));

  const message = xParams.map((key) => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
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

function getSwiftPayRedirectUrl(type) {
  const keyMap = {
    success: 'SWIFTPAY_SUCCESS_URL',
    failure: 'SWIFTPAY_FAILURE_URL',
    cancel: 'SWIFTPAY_CANCEL_URL'
  };
  const envValue = process.env[keyMap[type]] || '';
  if (!envValue) return '';
  const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
  return envValue
    .replace('{BASE_URL}', BASE_URL)
    .replace('{ORDER_NO}', 'DRL-ORDER')
    .replace('{STATUS}', type);
}

function isSwiftPayConfigured() {
  return !!(process.env.SWIFTPAY_API_KEY && process.env.SWIFTPAY_API_SECRET);
}

module.exports = async (req, res) => {
  // catch-all for /api/swiftpay/*
  const slug = Array.isArray(req.query.slug) ? req.query.slug : (req.query.slug ? [req.query.slug] : []);
  const subpath = slug[0] || '';

  try {
    if (subpath === 'webhook' && req.method === 'POST') {
      // webhook: verify signature if secret present
      const secretKey = (process.env.SWIFTPAY_WEBHOOK_SECRET || process.env.SWIFTPAY_API_SECRET || '').trim();
      const payload = req.body || {};
      const incomingSignature = (
        req.headers['x-signature'] || req.headers['x-swiftpay-signature'] || req.headers['signature'] || ''
      );

      if (secretKey && incomingSignature) {
        const signatureParts = Object.keys(payload)
          .filter((key) => key.startsWith('x_'))
          .sort((a, b) => a.localeCompare(b));
        const expected = signatureParts.map((key) => `${key}${payload[key]}`).join('');
        const computed = crypto.createHmac('sha256', secretKey).update(expected).digest('hex');
        if (String(incomingSignature).toLowerCase() !== computed.toLowerCase()) {
          res.status(400).json({ ok: false, error: 'Invalid SwiftPay webhook signature' });
          return;
        }
      }

      const status = payload.paymentStatus || payload.status || payload.transactionStatus || 'pending';
      const orderId = payload.x_reference_no || payload.referenceNo || payload.reference_no || payload.orderId || payload.order_id || 'unknown';
      console.log('SwiftPay webhook received', { orderId, status });
      res.json({ ok: true, message: 'SwiftPay webhook accepted', orderId, status });
      return;
    }

    if (subpath === 'institutions' && req.method === 'GET') {
      if (!isSwiftPayConfigured()) {
        res.status(500).json({ error: 'SwiftPay is not configured. Set SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET.' });
        return;
      }
      const apiBase = getSwiftPayApiBase();
      const response = await fetch(`${apiBase}/api/institutions`, { method: 'GET', headers: { Accept: 'application/json' } });
      const text = await response.text();
      let payload = [];
      try { payload = JSON.parse(text); } catch (e) { payload = []; }
      if (!response.ok) {
        res.status(response.status).json({ error: 'SwiftPay institutions request failed', details: payload.message || payload.error || text || 'Unknown error' });
        return;
      }
      res.json(Array.isArray(payload) ? payload : [payload]);
      return;
    }

    if (subpath === 'create-order' && req.method === 'POST') {
      const body = req.body || {};
      const { orderId, amount, currency = 'PHP', customerName = '', customerEmail = '', customerPhone = '', institutionCode = null, items = [] } = body;
      if (!orderId) { res.status(400).json({ error: 'Missing orderId' }); return; }
      if (!amount || Number(amount) <= 0) { res.status(400).json({ error: 'Missing or invalid amount' }); return; }
      if (!isSwiftPayConfigured()) { res.status(500).json({ error: 'SwiftPay is not configured. Set SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET.' }); return; }

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
        success_url: getSwiftPayRedirectUrl('success') || `${process.env.BASE_URL || ''}/order-tracking.html?orderId=${encodeURIComponent(orderId)}`,
        failure_url: getSwiftPayRedirectUrl('failure') || `${process.env.BASE_URL || ''}/checkout.html?status=failed&orderId=${encodeURIComponent(orderId)}`,
        cancel_url: getSwiftPayRedirectUrl('cancel') || `${process.env.BASE_URL || ''}/checkout.html?status=cancelled&orderId=${encodeURIComponent(orderId)}`
      };

      if (institutionCode) params.institution_code = String(institutionCode);
      params.signature = computeSignature(params, secretKey);

      const response = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(params)
      });

      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch (e) { payload = {}; }
      if (!response.ok) {
        res.status(response.status).json({ error: 'SwiftPay order creation failed', details: payload.message || payload.error || text || 'Unknown SwiftPay error' });
        return;
      }

      const checkoutUrl = payload.customerRedirectUrl || payload.redirect_url || payload.checkoutUrl || payload.checkout_url || payload.url;
      if (!checkoutUrl) { res.status(502).json({ error: 'SwiftPay did not return a checkout URL', payload }); return; }

      res.json({ ok: true, checkoutId: String(orderId), checkoutUrl, institutionCode: institutionCode || null, response: payload });
      return;
    }

    // Not found
    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('swiftpay api error', err);
    res.status(500).json({ error: 'Unexpected SwiftPay backend error', details: err.message });
  }
};
