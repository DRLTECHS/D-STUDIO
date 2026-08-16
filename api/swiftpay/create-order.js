const fetch = global.fetch || require('node-fetch');
const { computeSignature, getSwiftPayApiBase, getSwiftPayRedirectUrl, isSwiftPayConfigured } = require('../_lib/swiftpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Missing or invalid amount' });
    if (!isSwiftPayConfigured()) return res.status(500).json({ error: 'SwiftPay is not configured. Set SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET.' });

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
      return res.status(response.status).json({ error: 'SwiftPay order creation failed', details: payload.message || payload.error || text || 'Unknown SwiftPay error' });
    }

    const checkoutUrl = payload.customerRedirectUrl || payload.redirect_url || payload.checkoutUrl || payload.checkout_url || payload.url;
    if (!checkoutUrl) return res.status(502).json({ error: 'SwiftPay did not return a checkout URL', payload });

    res.json({ ok: true, checkoutId: String(orderId), checkoutUrl, institutionCode: institutionCode || null, response: payload });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).json({ error: 'Unexpected SwiftPay backend error', details: err.message });
  }
};
