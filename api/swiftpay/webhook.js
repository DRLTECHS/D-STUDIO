const crypto = require('crypto');
const { getSwiftPayApiBase, getSwiftPayRedirectUrl } = require('../_lib/swiftpay');

// helper to read raw body
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const raw = await readRawBody(req);
    const rawText = raw.toString('utf8');
    let payload = {};
    try { payload = rawText ? JSON.parse(rawText) : {}; } catch (e) { return res.status(400).json({ ok: false, error: 'Invalid webhook payload' }); }

    const secretKey = (process.env.SWIFTPAY_WEBHOOK_SECRET || process.env.SWIFTPAY_API_SECRET || '').trim();
    const incomingSignature = (
      req.headers['x-signature'] || req.headers['x-swiftpay-signature'] || req.headers['signature'] || ''
    );

    if (secretKey && incomingSignature) {
      const signatureParts = Object.keys(payload || {})
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

    console.log('SwiftPay webhook received', { orderId, status });
    return res.status(200).json({ ok: true, message: 'SwiftPay webhook accepted', orderId, status });
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).json({ ok: false, error: 'Webhook processing error', details: err.message });
  }
};
