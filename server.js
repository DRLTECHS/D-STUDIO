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

// Admin API Endpoints
app.get('/api/admin/system', (req, res) => {
  res.json({
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    swiftpayMode: process.env.SWIFTPAY_MODE || 'sandbox',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/orders', (req, res) => {
  // In production, this would fetch from a database
  // For now, return structured response for admin dashboard
  res.json({
    orders: [
      { orderId: 'DRL-001', customerName: 'Demo Customer', amount: 5000, currency: 'PHP', status: 'completed', timestamp: Date.now() - 86400000 },
      { orderId: 'DRL-002', customerName: 'Test User', amount: 3500, currency: 'PHP', status: 'pending', timestamp: Date.now() - 43200000 }
    ],
    count: 2
  });
});

app.get('/api/admin/webhooks', (req, res) => {
  // Return webhook logs for admin dashboard
  res.json({
    webhooks: [
      { orderId: 'DRL-001', success: true, status: 'completed', timestamp: Date.now() - 86400000 },
      { orderId: 'DRL-002', success: true, status: 'pending', timestamp: Date.now() - 43200000 }
    ],
    count: 2
  });
});

app.post('/api/admin/webhook-test', (req, res) => {
  // Test webhook endpoint
  console.log('Admin webhook test triggered');
  res.json({ ok: true, message: 'Webhook test sent successfully' });
});

// AI Content Generation Endpoint
app.post('/api/admin/generate-content', (req, res) => {
  try {
    const {
      platform,
      contentType,
      productName,
      keywords,
      tone,
      targetAudience,
      cta
    } = req.body;

    // Template-based content generation (can be replaced with OpenAI/Claude API)
    const templates = {
      product: [
        `🚀 Introducing ${productName}!\n\nTransform your ${targetAudience} experience with our cutting-edge solution. ${keywords}.\n\n✨ Features:\n• Innovative design\n• Secure & Reliable\n• Easy to use\n\n${cta ? `👉 ${cta}` : 'Learn more today!'}`,
        `Meet ${productName} - The perfect solution for ${targetAudience}.\n\n${keywords}\n\nWhy choose us?\n✓ Trusted by thousands\n✓ 24/7 Support\n✓ Best value guaranteed\n\n${cta || 'Get started now!'}`,
      ],
      promotion: [
        `⏰ Limited Time Offer! ⏰\n\n${productName} is now available at an unbeatable price!\n\n🎁 Exclusive benefits:\n${keywords}\n\n🔥 Don't miss out! ${cta || 'Grab yours today!'}\n\n*Offer valid this month*`,
      ],
      announcement: [
        `📢 Big News! 📢\n\n${productName} is here!\n\nWe're excited to announce our newest innovative solution.\n\nKey highlights:\n${keywords}\n\nPerfect for: ${targetAudience}\n\n${cta || 'Learn more'}`,
      ],
      testimonial: [
        `⭐⭐⭐⭐⭐\n\n"${productName} has been a game-changer for us!"\n\n${targetAudience} across the industry are loving these ${keywords}.\n\n✅ Results speak for themselves\n✅ Trusted by leading companies\n\n${cta || 'Join satisfied customers'}`,
      ],
      educational: [
        `📚 Did You Know? 📚\n\nLearn how ${productName} can help your ${targetAudience}:\n\n1️⃣ ${keywords}\n2️⃣ Better outcomes\n3️⃣ Maximum productivity\n\n🎓 Master these skills with ${productName}\n\n${cta || 'Get your free guide'}`,
      ],
      engagement: [
        `🤔 Quick Question!\n\nWhich matters most to you?\n${keywords}\n\nTell us in the comments! 👇\n\n${cta || 'Join the conversation'}`,
      ]
    };

    const typeTemplates = templates[contentType] || templates.product;
    const content = typeTemplates[Math.floor(Math.random() * typeTemplates.length)];

    res.json({
      ok: true,
      content,
      platform,
      contentType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate content',
      details: error.message
    });
  }
});

// Social Media Publishing Endpoint
app.post('/api/admin/publish-social', (req, res) => {
  try {
    const {
      content,
      platform,
      scheduledTime,
      addHashtags
    } = req.body;

    if (!content || !platform) {
      return res.status(400).json({
        ok: false,
        error: 'Missing content or platform'
      });
    }

    // Add hashtags if requested
    let finalContent = content;
    if (addHashtags) {
      const hashtags = '\n\n#DRLTechs #Innovation #SoftwareTrading #BusinessSolutions';
      finalContent += hashtags;
    }

    // Mock social media publishing
    // In production, this would integrate with:
    // - Facebook Graph API
    // - Instagram Graph API
    // - Twitter API v2
    // - LinkedIn API
    // - TikTok API
    
    console.log(`[PUBLISH] Platform: ${platform}, Scheduled: ${scheduledTime ? 'Yes' : 'Immediately'}`);
    console.log(`[CONTENT] ${finalContent.substring(0, 100)}...`);

    res.json({
      ok: true,
      message: `Content queued for ${platform}`,
      platform,
      status: scheduledTime ? 'scheduled' : 'published',
      scheduledTime: scheduledTime || null,
      timestamp: new Date().toISOString(),
      contentLength: finalContent.length,
      postId: `post-${Date.now()}`
    });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to publish content',
      details: error.message
    });
  }
});

// ============ IMAGE GENERATION ENDPOINT ============
app.post('/api/admin/generate-image', express.json(), async (req, res) => {
  try {
    const { model, imageType, style, prompt, size, quality } = req.body;

    if (!model || !imageType || !style || !prompt) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields'
      });
    }

    // Mock implementation
    // In production, integrate with:
    // - OpenAI DALL-E 3 API
    // - Midjourney API
    // - Stability AI (Stable Diffusion)
    // - Adobe Firefly API
    
    console.log(`[IMAGE_GEN] Model: ${model}, Type: ${imageType}, Style: ${style}`);
    console.log(`[IMAGE_PROMPT] ${prompt.substring(0, 100)}...`);

    // Simulate processing
    const sizeMap = {
      'square': '1024x1024',
      'portrait': '1024x1792',
      'landscape': '1792x1024',
      'social': '1200x630',
      '4k': '3840x2160'
    };

    // In demo mode, return placeholder
    // In production, call actual AI image generation API
    const imageUrl = `https://via.placeholder.com/${sizeMap[size] || '1024x1024'}/3498db/ffffff?text=${encodeURIComponent(imageType)}+${encodeURIComponent(style)}`;

    res.json({
      ok: true,
      imageUrl,
      model,
      imageType,
      style,
      size: sizeMap[size],
      quality,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 30) + 10 + 's',
      message: 'Demo mode: Using placeholder. For production, connect to DALL-E, Midjourney, or Stable Diffusion API'
    });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate image',
      details: error.message
    });
  }
});

// ============ VIDEO GENERATION ENDPOINT ============
app.post('/api/admin/generate-video', express.json(), async (req, res) => {
  try {
    const {
      model,
      videoType,
      duration,
      script,
      style,
      voice,
      aspect,
      includeMusic,
      includeSubtitles
    } = req.body;

    if (!model || !videoType || !duration || !script) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields'
      });
    }

    // Mock implementation
    // In production, integrate with:
    // - Runway ML API
    // - Synthesia AI
    // - Descript API
    // - ElevenLabs Video API
    // - HeyGen API
    
    console.log(`[VIDEO_GEN] Model: ${model}, Type: ${videoType}, Duration: ${duration}s, Style: ${style}`);
    console.log(`[VIDEO_SCRIPT] ${script.substring(0, 100)}...`);
    console.log(`[VIDEO_SETTINGS] Voice: ${voice}, Music: ${includeMusic}, Subtitles: ${includeSubtitles}`);

    // Simulate processing
    const aspectMap = {
      '16:9': 'landscape',
      '9:16': 'portrait',
      '1:1': 'square',
      '4:5': 'instagram'
    };

    // In demo mode, return placeholder
    // In production, call actual AI video generation API
    const videoUrl = `https://www.w3schools.com/html/mov_bbb.mp4`; // Demo video

    res.json({
      ok: true,
      videoUrl,
      model,
      videoType,
      duration: parseInt(duration),
      style,
      voice,
      aspect: aspectMap[aspect],
      includeMusic,
      includeSubtitles,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 120) + 60 + 's',
      status: 'completed',
      message: 'Demo mode: Using sample video. For production, connect to Runway, Synthesia, or HeyGen API'
    });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate video',
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
