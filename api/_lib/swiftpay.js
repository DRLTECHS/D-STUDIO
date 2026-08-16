const crypto = require('crypto');

function hashParams(params) {
  const xParams = Object.keys(params || {})
    .filter((key) => key.startsWith('x_'))
    .sort((a, b) => a.localeCompare(b));
  return xParams.map((key) => `${key}${params[key]}`).join('');
}

function computeSignature(params, secretKey) {
  const message = hashParams(params);
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

module.exports = {
  computeSignature,
  getSwiftPayApiBase,
  getSwiftPayRedirectUrl,
  isSwiftPayConfigured
};
