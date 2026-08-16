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

// ============ AUTHENTICATION MIDDLEWARE ============
function authenticateAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_API_KEY || 'demo-token';
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  if (token !== adminToken) {
    return res.status(403).json({ ok: false, error: 'Invalid or unauthorized token' });
  }

  next();
}

// Optional auth middleware (logs warning if missing token but allows access)
function optionalAuthAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  req.isAdmin = token === (process.env.ADMIN_API_KEY || 'demo-token');
  next();
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

app.get('/api/admin/orders', optionalAuthAdmin, (req, res) => {
  // Support query parameters for filtering and pagination
  const { status, limit = 10, offset = 0, sortBy = 'timestamp' } = req.query;
  
  const allOrders = [
    { orderId: 'DRL-001', customerName: 'Demo Customer', amount: 5000, currency: 'PHP', status: 'completed', timestamp: Date.now() - 86400000 },
    { orderId: 'DRL-002', customerName: 'Test User', amount: 3500, currency: 'PHP', status: 'pending', timestamp: Date.now() - 43200000 },
    { orderId: 'DRL-003', customerName: 'Jane Smith', amount: 7200, currency: 'PHP', status: 'completed', timestamp: Date.now() - 172800000 },
    { orderId: 'DRL-004', customerName: 'John Doe', amount: 4500, currency: 'PHP', status: 'failed', timestamp: Date.now() - 259200000 }
  ];

  let filtered = status ? allOrders.filter(o => o.status === status) : allOrders;
  
  filtered = filtered.sort((a, b) => {
    if (sortBy === 'amount') return b.amount - a.amount;
    if (sortBy === 'name') return a.customerName.localeCompare(b.customerName);
    return b.timestamp - a.timestamp;
  });

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    orders: paginated,
    count: paginated.length,
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset)
  });
});

app.get('/api/admin/orders/:orderId', optionalAuthAdmin, (req, res) => {
  const { orderId } = req.params;
  
  // Mock order details
  const orderDetails = {
    orderId,
    customerName: 'Demo Customer',
    customerEmail: 'customer@example.com',
    customerPhone: '+63-XXX-XXX-XXXX',
    amount: 5000,
    currency: 'PHP',
    status: 'completed',
    items: [
      { name: 'Product A', quantity: 2, unitPrice: 2000, totalPrice: 4000 },
      { name: 'Product B', quantity: 1, unitPrice: 1000, totalPrice: 1000 }
    ],
    paymentMethod: 'swiftpay',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 82800000).toISOString(),
    trackingUrl: `${BASE_URL}/order-tracking.html?orderId=${orderId}`
  };

  res.json(orderDetails);
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

// ============ GET GENERATED CONTENT ENDPOINT ============
app.get('/api/admin/generated-content', optionalAuthAdmin, (req, res) => {
  const { platform, status, limit = 10, offset = 0 } = req.query;
  
  const allContents = [
    {
      id: 'content-1',
      platform: 'instagram',
      contentType: 'product',
      content: '🚀 Introducing our latest product! Transform your experience with cutting-edge innovation.',
      timestamp: Date.now() - 86400000,
      status: 'published'
    },
    {
      id: 'content-2',
      platform: 'facebook',
      contentType: 'promotion',
      content: '⏰ Limited Time Offer! Exclusive benefits available this month.',
      timestamp: Date.now() - 43200000,
      status: 'published'
    },
    {
      id: 'content-3',
      platform: 'twitter',
      contentType: 'announcement',
      content: '📢 Big News! We\'re excited to announce our newest innovative solution.',
      timestamp: Date.now() - 3600000,
      status: 'draft'
    }
  ];

  let filtered = allContents;
  if (platform) filtered = filtered.filter(c => c.platform === platform);
  if (status) filtered = filtered.filter(c => c.status === status);

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
  
  res.json({
    contents: paginated,
    count: paginated.length,
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset)
  });
});

// ============ PUT UPDATE CONTENT ENDPOINT ============
app.put('/api/admin/generated-content/:contentId', authenticateAdmin, (req, res) => {
  const { contentId } = req.params;
  const { content, status, platform } = req.body;

  if (!content && !status) {
    return res.status(400).json({ ok: false, error: 'Provide content or status to update' });
  }

  res.json({
    ok: true,
    message: 'Content updated successfully',
    contentId,
    updates: { content, status, platform },
    updatedAt: new Date().toISOString()
  });
});

// ============ DELETE CONTENT ENDPOINT ============
app.delete('/api/admin/generated-content/:contentId', authenticateAdmin, (req, res) => {
  const { contentId } = req.params;

  res.json({
    ok: true,
    message: 'Content deleted successfully',
    contentId,
    deletedAt: new Date().toISOString()
  });
});

// ============ GET SOCIAL POSTS ENDPOINT ============
app.get('/api/admin/social-posts', optionalAuthAdmin, (req, res) => {
  const { platform, status, limit = 10, offset = 0 } = req.query;
  
  const allPosts = [
    {
      postId: 'post-1',
      platform: 'instagram',
      content: '🚀 Introducing our latest product! Transform your experience with cutting-edge innovation. #DRLTechs #Innovation',
      status: 'published',
      timestamp: Date.now() - 86400000,
      engagement: { likes: 245, comments: 18, shares: 12 }
    },
    {
      postId: 'post-2',
      platform: 'facebook',
      content: '⏰ Limited Time Offer! Exclusive benefits available this month. #SoftwareTrading #BusinessSolutions',
      status: 'published',
      timestamp: Date.now() - 43200000,
      engagement: { likes: 156, comments: 9, shares: 7 }
    },
    {
      postId: 'post-3',
      platform: 'linkedin',
      content: '📢 Big News! We\'re excited to announce our newest innovative solution. #Innovation #BusinessSolutions',
      status: 'scheduled',
      timestamp: Date.now() + 86400000,
      scheduledTime: new Date(Date.now() + 86400000).toISOString()
    }
  ];

  let filtered = allPosts;
  if (platform) filtered = filtered.filter(p => p.platform === platform);
  if (status) filtered = filtered.filter(p => p.status === status);

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    posts: paginated,
    count: paginated.length,
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset)
  });
});

// ============ PUT UPDATE SOCIAL POST ENDPOINT ============
app.put('/api/admin/social-posts/:postId', authenticateAdmin, (req, res) => {
  const { postId } = req.params;
  const { content, status, scheduledTime } = req.body;

  if (!content && !status) {
    return res.status(400).json({ ok: false, error: 'Provide content or status to update' });
  }

  res.json({
    ok: true,
    message: 'Social post updated successfully',
    postId,
    updates: { content, status, scheduledTime },
    updatedAt: new Date().toISOString()
  });
});

// ============ DELETE SOCIAL POST ENDPOINT ============
app.delete('/api/admin/social-posts/:postId', authenticateAdmin, (req, res) => {
  const { postId } = req.params;

  res.json({
    ok: true,
    message: 'Social post deleted successfully',
    postId,
    deletedAt: new Date().toISOString()
  });
});

// ============ GET GENERATED IMAGES ENDPOINT ============
app.get('/api/admin/generated-images', optionalAuthAdmin, (req, res) => {
  const { model, style, limit = 10, offset = 0 } = req.query;
  
  const allImages = [
    {
      imageId: 'img-1',
      model: 'dall-e-3',
      imageType: 'product',
      style: 'modern',
      prompt: 'Professional product showcase with modern design',
      imageUrl: 'https://via.placeholder.com/1024x1024/3498db/ffffff?text=Product+Modern',
      size: '1024x1024',
      quality: 'high',
      timestamp: Date.now() - 172800000,
      status: 'completed'
    },
    {
      imageId: 'img-2',
      model: 'midjourney',
      imageType: 'marketing',
      style: 'cinematic',
      prompt: 'Cinematic marketing banner for tech startup',
      imageUrl: 'https://via.placeholder.com/1792x1024/2ecc71/ffffff?text=Marketing+Cinematic',
      size: '1792x1024',
      quality: 'ultra',
      timestamp: Date.now() - 86400000,
      status: 'completed'
    },
    {
      imageId: 'img-3',
      model: 'stable-diffusion',
      imageType: 'social',
      style: 'minimalist',
      prompt: 'Minimalist social media post design',
      imageUrl: 'https://via.placeholder.com/1200x630/e74c3c/ffffff?text=Social+Minimalist',
      size: '1200x630',
      quality: 'medium',
      timestamp: Date.now() - 43200000,
      status: 'completed'
    }
  ];

  let filtered = allImages;
  if (model) filtered = filtered.filter(i => i.model === model);
  if (style) filtered = filtered.filter(i => i.style === style);

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    images: paginated,
    count: paginated.length,
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset)
  });
});

// ============ PUT UPDATE IMAGE ENDPOINT ============
app.put('/api/admin/generated-images/:imageId', authenticateAdmin, (req, res) => {
  const { imageId } = req.params;
  const { prompt, style, quality } = req.body;

  if (!prompt && !style && !quality) {
    return res.status(400).json({ ok: false, error: 'Provide prompt, style, or quality to update' });
  }

  res.json({
    ok: true,
    message: 'Image metadata updated successfully',
    imageId,
    updates: { prompt, style, quality },
    updatedAt: new Date().toISOString()
  });
});

// ============ DELETE IMAGE ENDPOINT ============
app.delete('/api/admin/generated-images/:imageId', authenticateAdmin, (req, res) => {
  const { imageId } = req.params;

  res.json({
    ok: true,
    message: 'Image deleted successfully',
    imageId,
    deletedAt: new Date().toISOString()
  });
});

// ============ GET GENERATED VIDEOS ENDPOINT ============
app.get('/api/admin/generated-videos', optionalAuthAdmin, (req, res) => {
  const { model, videoType, limit = 10, offset = 0 } = req.query;
  
  const allVideos = [
    {
      videoId: 'vid-1',
      model: 'runway-ml',
      videoType: 'product-demo',
      duration: 30,
      script: 'Showcase our innovative product features',
      style: 'professional',
      voice: 'en-US-male',
      aspect: '16:9',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      timestamp: Date.now() - 259200000,
      status: 'completed',
      includeMusic: true,
      includeSubtitles: true
    },
    {
      videoId: 'vid-2',
      model: 'synthesia',
      videoType: 'explainer',
      duration: 45,
      script: 'How to use our platform - Step by step guide',
      style: 'engaging',
      voice: 'en-US-female',
      aspect: '9:16',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      timestamp: Date.now() - 172800000,
      status: 'completed',
      includeMusic: true,
      includeSubtitles: true
    },
    {
      videoId: 'vid-3',
      model: 'heygen',
      videoType: 'testimonial',
      duration: 60,
      script: 'Customer success story and testimonial',
      style: 'authentic',
      voice: 'en-US-male',
      aspect: '1:1',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      timestamp: Date.now() - 86400000,
      status: 'completed',
      includeMusic: false,
      includeSubtitles: true
    }
  ];

  let filtered = allVideos;
  if (model) filtered = filtered.filter(v => v.model === model);
  if (videoType) filtered = filtered.filter(v => v.videoType === videoType);

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    videos: paginated,
    count: paginated.length,
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset)
  });
});

// ============ PUT UPDATE VIDEO ENDPOINT ============
app.put('/api/admin/generated-videos/:videoId', authenticateAdmin, (req, res) => {
  const { videoId } = req.params;
  const { script, style, voice, includeMusic, includeSubtitles } = req.body;

  if (!script && !style && !voice && includeMusic === undefined && includeSubtitles === undefined) {
    return res.status(400).json({ ok: false, error: 'Provide script, style, voice, or subtitle settings to update' });
  }

  res.json({
    ok: true,
    message: 'Video metadata updated successfully',
    videoId,
    updates: { script, style, voice, includeMusic, includeSubtitles },
    updatedAt: new Date().toISOString()
  });
});

// ============ DELETE VIDEO ENDPOINT ============
app.delete('/api/admin/generated-videos/:videoId', authenticateAdmin, (req, res) => {
  const { videoId } = req.params;

  res.json({
    ok: true,
    message: 'Video deleted successfully',
    videoId,
    deletedAt: new Date().toISOString()
  });
});

// ============ ANALYTICS/STATS ENDPOINT ============
app.get('/api/admin/stats', optionalAuthAdmin, (req, res) => {
  const { period = '7d' } = req.query; // 24h, 7d, 30d, 90d

  const periodMap = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90
  };

  const days = periodMap[period] || 7;

  res.json({
    period,
    daysAnalyzed: days,
    stats: {
      orders: {
        total: 127,
        completed: 98,
        pending: 18,
        failed: 11,
        totalRevenue: 487500,
        currency: 'PHP',
        averageOrderValue: 3842
      },
      content: {
        generated: 234,
        published: 189,
        drafted: 45,
        byPlatform: {
          instagram: 78,
          facebook: 56,
          twitter: 41,
          linkedin: 14,
          tiktok: 9
        }
      },
      media: {
        imagesGenerated: 156,
        videosGenerated: 34,
        totalImages: 456,
        totalVideos: 89
      },
      social: {
        postsPublished: 189,
        totalEngagement: {
          likes: 12456,
          comments: 1234,
          shares: 456
        },
        averageEngagementRate: '8.4%'
      },
      performance: {
        apiResponseTime: '245ms',
        generationAverageTime: '32s',
        uptime: '99.8%'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ============ DOWNLOAD/EXPORT CONTENT ENDPOINT ============
app.get('/api/admin/export/content', authenticateAdmin, (req, res) => {
  const { format = 'json', status } = req.query; // json, csv

  const contents = [
    { id: 'content-1', platform: 'instagram', status: 'published', content: '🚀 Introducing...', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 'content-2', platform: 'facebook', status: 'published', content: '⏰ Limited Time...', timestamp: new Date(Date.now() - 43200000).toISOString() },
    { id: 'content-3', platform: 'twitter', status: 'draft', content: '📢 Big News...', timestamp: new Date(Date.now() - 3600000).toISOString() }
  ];

  const filtered = status ? contents.filter(c => c.status === status) : contents;

  if (format === 'csv') {
    const csv = 'ID,Platform,Status,Content,Timestamp\n' + 
      filtered.map(c => `"${c.id}","${c.platform}","${c.status}","${c.content.replace(/"/g, '""')}","${c.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="content-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="content-export.json"');
    res.json({ data: filtered, count: filtered.length, exportedAt: new Date().toISOString() });
  }
});

// ============ DOWNLOAD/EXPORT IMAGES ENDPOINT ============
app.get('/api/admin/export/images', authenticateAdmin, (req, res) => {
  const { format = 'json' } = req.query; // json, csv

  const images = [
    { imageId: 'img-1', model: 'dall-e-3', style: 'modern', imageUrl: 'https://...', timestamp: new Date(Date.now() - 172800000).toISOString() },
    { imageId: 'img-2', model: 'midjourney', style: 'cinematic', imageUrl: 'https://...', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { imageId: 'img-3', model: 'stable-diffusion', style: 'minimalist', imageUrl: 'https://...', timestamp: new Date(Date.now() - 43200000).toISOString() }
  ];

  if (format === 'csv') {
    const csv = 'Image ID,Model,Style,URL,Timestamp\n' + 
      images.map(i => `"${i.imageId}","${i.model}","${i.style}","${i.imageUrl}","${i.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="images-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="images-export.json"');
    res.json({ data: images, count: images.length, exportedAt: new Date().toISOString() });
  }
});

// ============ DOWNLOAD/EXPORT VIDEOS ENDPOINT ============
app.get('/api/admin/export/videos', authenticateAdmin, (req, res) => {
  const { format = 'json' } = req.query; // json, csv

  const videos = [
    { videoId: 'vid-1', model: 'runway-ml', videoType: 'product-demo', duration: 30, videoUrl: 'https://...', timestamp: new Date(Date.now() - 259200000).toISOString() },
    { videoId: 'vid-2', model: 'synthesia', videoType: 'explainer', duration: 45, videoUrl: 'https://...', timestamp: new Date(Date.now() - 172800000).toISOString() },
    { videoId: 'vid-3', model: 'heygen', videoType: 'testimonial', duration: 60, videoUrl: 'https://...', timestamp: new Date(Date.now() - 86400000).toISOString() }
  ];

  if (format === 'csv') {
    const csv = 'Video ID,Model,Type,Duration (sec),URL,Timestamp\n' + 
      videos.map(v => `"${v.videoId}","${v.model}","${v.videoType}",${v.duration},"${v.videoUrl}","${v.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="videos-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="videos-export.json"');
    res.json({ data: videos, count: videos.length, exportedAt: new Date().toISOString() });
  }
});

// ============ DOWNLOAD/EXPORT ORDERS ENDPOINT ============
app.get('/api/admin/export/orders', authenticateAdmin, (req, res) => {
  const { format = 'json', status } = req.query; // json, csv

  const orders = [
    { orderId: 'DRL-001', customerName: 'Demo Customer', amount: 5000, status: 'completed', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { orderId: 'DRL-002', customerName: 'Test User', amount: 3500, status: 'pending', timestamp: new Date(Date.now() - 43200000).toISOString() },
    { orderId: 'DRL-003', customerName: 'Jane Smith', amount: 7200, status: 'completed', timestamp: new Date(Date.now() - 172800000).toISOString() }
  ];

  const filtered = status ? orders.filter(o => o.status === status) : orders;

  if (format === 'csv') {
    const csv = 'Order ID,Customer Name,Amount (PHP),Status,Timestamp\n' + 
      filtered.map(o => `"${o.orderId}","${o.customerName}",${o.amount},"${o.status}","${o.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.json"');
    res.json({ data: filtered, count: filtered.length, exportedAt: new Date().toISOString() });
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
