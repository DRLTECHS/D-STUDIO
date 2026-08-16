const fetch = global.fetch || require('node-fetch');
const { getSwiftPayApiBase } = require('../_lib/swiftpay');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!(process.env.SWIFTPAY_API_KEY && process.env.SWIFTPAY_API_SECRET)) {
    return res.status(500).json({ error: 'SwiftPay is not configured. Set SWIFTPAY_API_KEY and SWIFTPAY_API_SECRET.' });
  }

  try {
    const apiBase = getSwiftPayApiBase();
    const response = await fetch(`${apiBase}/api/institutions`, { method: 'GET', headers: { Accept: 'application/json' } });
    const text = await response.text();
    let payload = [];
    try { payload = JSON.parse(text); } catch (e) { payload = []; }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'SwiftPay institutions request failed', details: payload.message || payload.error || text || 'Unknown error' });
    }

    res.json(Array.isArray(payload) ? payload : [payload]);
  } catch (err) {
    console.error('institutions error', err);
    res.status(500).json({ error: 'Unable to fetch SwiftPay institutions', details: err.message });
  }
};
