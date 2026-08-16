# Media AI Services Integration Setup

Complete setup guides for integrating real AI image and video generation services.

---

## Table of Contents

1. [Image Generation Services](#image-generation-services)
2. [Video Generation Services](#video-generation-services)
3. [Backend Implementation](#backend-implementation)
4. [Testing Guide](#testing-guide)
5. [Deployment to Production](#deployment-to-production)

---

## Image Generation Services

### DALL-E 3 (OpenAI) - Recommended ⭐

**Best for:** High-quality, realistic images with excellent prompt following.

#### Step 1: Get API Key

```bash
# Visit: https://platform.openai.com/api/keys
# 1. Click "Create new secret key"
# 2. Copy the key immediately (you won't see it again)
# 3. Save securely
```

#### Step 2: Install SDK

```bash
npm install openai
```

#### Step 3: Set Environment Variables

**Local (.env):**
```
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_IMAGE_MODEL=dall-e-3
OPENAI_IMAGE_MAX_TOKENS=1024
```

**Railway Production:**
- Go to Railway Dashboard
- Select your project
- Variables tab
- Add `OPENAI_API_KEY`

#### Step 4: Update Backend

Replace `/api/admin/generate-image` in `server.js`:

```javascript
const OpenAI = require('openai');

app.post('/api/admin/generate-image', express.json(), async (req, res) => {
  try {
    const { model, imageType, style, prompt, size, quality } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        ok: false,
        error: 'OpenAI API key not configured'
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create detailed prompt from user input
    const enhancedPrompt = `Create a ${imageType} image with these specifications:
    Style: ${style}
    Description: ${prompt}
    Quality: ${quality === 'ultra' ? 'ultra-detailed, professional grade' : 'high quality'}
    
    Ensure the image is professional, clear, and suitable for ${imageType} use.`;

    // Map size to DALL-E dimensions
    const sizeMap = {
      'square': '1024x1024',
      'portrait': '1024x1792',
      'landscape': '1792x1024',
      'social': '1024x1024', // Convert 1200x630 to 1024x1024 (DALL-E limitation)
      '4k': '1024x1024'
    };

    console.log(`[DALL-E] Generating ${imageType} image, style: ${style}`);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: sizeMap[size] || "1024x1024",
      quality: quality === 'ultra' ? 'hd' : 'standard',
      style: style === 'photorealistic' ? 'natural' : 'vivid'
    });

    const imageUrl = response.data[0].url;

    res.json({
      ok: true,
      imageUrl,
      model: 'dall-e-3',
      imageType,
      style,
      size: sizeMap[size],
      quality,
      timestamp: new Date().toISOString(),
      expiresIn: '1 hour', // DALL-E URLs expire after 1 hour
      note: 'Download image within 1 hour or it will expire'
    });

  } catch (error) {
    console.error('[DALL-E Error]', error);
    
    // Handle specific errors
    if (error.status === 401) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid OpenAI API key'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        ok: false,
        error: 'Rate limit exceeded. Please wait before generating another image.'
      });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to generate image with DALL-E',
      details: error.message
    });
  }
});
```

#### Step 5: Test

```bash
# Local test
NODE_ENV=development node server.js

# Test endpoint with curl
curl -X POST http://localhost:3001/api/admin/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "imageType": "product",
    "style": "photorealistic",
    "prompt": "Professional product photo of modern smartwatch",
    "size": "square",
    "quality": "hd"
  }'
```

#### Step 6: Deploy

```bash
git add .
git commit -m "Integrate OpenAI DALL-E 3 for image generation"
git push origin main

# Railway automatically redeploys
# Check: railway logs -f
```

---

### Stable Diffusion (Stability AI)

**Best for:** Cost-effective, open-source alternative with good quality.

#### Setup

```bash
npm install @stability-ai/sdk
```

**Environment:**
```
STABILITY_API_KEY=sk-your-key
STABILITY_ENGINE_ID=stable-diffusion-xl-1024-v1-0
```

**Backend Code:**

```javascript
const { Client, MODELS } = require("@stability-ai/sdk");

app.post('/api/admin/generate-image', express.json(), async (req, res) => {
  try {
    const { imageType, style, prompt, size, quality } = req.body;

    if (!process.env.STABILITY_API_KEY) {
      return res.status(400).json({
        ok: false,
        error: 'Stability AI API key not configured'
      });
    }

    const client = new Client({
      apiKey: process.env.STABILITY_API_KEY,
      engine: process.env.STABILITY_ENGINE_ID,
      hostname: "https://api.stability.ai",
    });

    const resp = await client.textToImage({
      prompt: `${imageType}: ${prompt}. Style: ${style}. High quality, professional`,
      steps: quality === 'ultra' ? 50 : quality === 'hd' ? 35 : 25,
      width: 1024,
      height: 1024,
      samples: 1,
      cfg_scale: 7,
    });

    const imageData = resp.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${imageData}`;

    res.json({
      ok: true,
      imageUrl,
      model: 'stable-diffusion',
      imageType,
      style,
      size,
      quality,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Stable Diffusion Error]', error);
    res.status(500).json({
      ok: false,
      error: 'Stable Diffusion generation failed',
      details: error.message
    });
  }
});
```

---

### Midjourney API

**Best for:** Artistic, high-quality images with unique styles.

#### Setup

```bash
npm install midjourney
```

**Environment:**
```
MIDJOURNEY_BOT_TOKEN=your-token
MIDJOURNEY_CHANNEL_ID=your-channel-id
MIDJOURNEY_SERVER_ID=your-server-id
```

**Backend Code:**

```javascript
const MidJourney = require('midjourney');

const mjClient = new MidJourney({
  BotToken: process.env.MIDJOURNEY_BOT_TOKEN,
  ChannelId: process.env.MIDJOURNEY_CHANNEL_ID,
  ServerId: process.env.MIDJOURNEY_SERVER_ID,
  SalaiToken: process.env.MIDJOURNEY_SALAI_TOKEN,
});

app.post('/api/admin/generate-image', express.json(), async (req, res) => {
  try {
    const { imageType, style, prompt, size, quality } = req.body;

    const fullPrompt = `${prompt} --style ${style} --q ${quality === 'ultra' ? 2 : 1}`;

    console.log(`[Midjourney] Prompt: ${fullPrompt}`);

    const result = await mjClient.Imagine(fullPrompt);

    res.json({
      ok: true,
      imageUrl: result.ImageUrl,
      model: 'midjourney',
      imageType,
      style,
      size,
      quality,
      timestamp: new Date().toISOString(),
      jobId: result.MessageId
    });

  } catch (error) {
    console.error('[Midjourney Error]', error);
    res.status(500).json({
      ok: false,
      error: 'Midjourney generation failed',
      details: error.message
    });
  }
});
```

---

## Video Generation Services

### Runway ML - Recommended ⭐

**Best for:** Professional video generation with multiple features.

#### Setup

```bash
npm install @runwayml/sdk axios
```

**Environment:**
```
RUNWAY_API_KEY=your-api-key
RUNWAY_API_URL=https://api.runwayml.com
```

**Backend Code:**

```javascript
const axios = require('axios');

app.post('/api/admin/generate-video', express.json(), async (req, res) => {
  try {
    const {
      videoType,
      duration,
      script,
      style,
      voice,
      aspect,
      includeMusic,
      includeSubtitles
    } = req.body;

    if (!process.env.RUNWAY_API_KEY) {
      return res.status(400).json({
        ok: false,
        error: 'Runway ML API key not configured'
      });
    }

    console.log(`[Runway] Generating ${videoType} video, ${duration}s`);

    // Convert aspect ratio to resolution
    const resolutionMap = {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '1:1': '1024x1024',
      '4:5': '1080x1350'
    };

    const response = await axios.post(
      'https://api.runwayml.com/v1/videos/generate',
      {
        prompt: script,
        duration: parseInt(duration),
        mode: style === 'screen-record' ? 'screen_recording' : style,
        aspect_ratio: aspect,
        resolution: resolutionMap[aspect],
        include_audio: voice !== 'none',
        include_subtitles: includeSubtitles,
        language: 'en',
        quality: 'high'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const taskId = response.data.id;

    // Poll for completion (optional - Runway will callback)
    console.log(`[Runway] Task created: ${taskId}`);

    res.json({
      ok: true,
      taskId,
      model: 'runway-ml',
      videoType,
      duration,
      style,
      aspect,
      timestamp: new Date().toISOString(),
      status: 'processing',
      message: 'Video is being generated. This may take several minutes.',
      checkStatusUrl: `/api/admin/check-video-status/${taskId}`
    });

  } catch (error) {
    console.error('[Runway Error]', error);
    res.status(500).json({
      ok: false,
      error: 'Video generation failed',
      details: error.message
    });
  }
});

// Check video generation status
app.get('/api/admin/check-video-status/:taskId', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.runwayml.com/v1/videos/${req.params.taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`
        }
      }
    );

    res.json({
      ok: true,
      status: response.data.status,
      videoUrl: response.data.status === 'completed' ? response.data.url : null,
      progress: response.data.progress || 0
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Failed to check status',
      details: error.message
    });
  }
});
```

---

### Synthesia (AI Avatars)

**Best for:** Testimonials and personalized video messages.

#### Setup

```bash
npm install axios
```

**Environment:**
```
SYNTHESIA_API_KEY=your-api-key
SYNTHESIA_API_URL=https://api.synthesia.io/v1
```

**Backend Code:**

```javascript
app.post('/api/admin/generate-video', express.json(), async (req, res) => {
  try {
    const { script, voice, duration, aspect } = req.body;

    const response = await axios.post(
      'https://api.synthesia.io/v1/videos',
      {
        scriptText: script,
        outputFormat: 'mp4',
        styleConfig: {
          size: 'medium',
          position: 'center'
        },
        avatarConfig: {
          avatarName: voice === 'male' ? 'james' : 'amelia',
          avatarStyle: 'professional'
        },
        voiceConfig: {
          voiceId: voice === 'male' ? 'en-US-AvaMultilingualNeural' : 'en-US-AriaNeural',
          voiceStyle: 'default',
          speed: 1.0
        },
        videoResolution: '1080p',
        aspectRatio: aspect || '16:9'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SYNTHESIA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      ok: true,
      videoId: response.data.id,
      model: 'synthesia',
      status: 'processing',
      timestamp: new Date().toISOString(),
      estimatedTime: '2-5 minutes'
    });

  } catch (error) {
    console.error('[Synthesia Error]', error);
    res.status(500).json({
      ok: false,
      error: 'Synthesia generation failed',
      details: error.message
    });
  }
});
```

---

### HeyGen API

**Best for:** Quick, affordable AI avatar videos.

#### Setup

```bash
npm install axios
```

**Environment:**
```
HEYGEN_API_KEY=your-api-key
```

**Backend Code:**

```javascript
app.post('/api/admin/generate-video', express.json(), async (req, res) => {
  try {
    const { script, voice, duration } = req.body;

    const response = await axios.post(
      'https://api.heygen.com/v1/videos',
      {
        scriptText: script,
        avatarId: 'chelsea',
        voiceId: voice === 'male' ? 'john-us' : 'anna-us',
        outputFormat: 'mp4'
      },
      {
        headers: {
          'X-API-Key': process.env.HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      ok: true,
      videoUrl: response.data.video_url,
      model: 'heygen',
      status: 'completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[HeyGen Error]', error);
    res.status(500).json({
      ok: false,
      error: 'HeyGen generation failed',
      details: error.message
    });
  }
});
```

---

## Backend Implementation

### Complete Example (DALL-E + Runway)

```javascript
// server.js - Complete media generation setup

const express = require('express');
const OpenAI = require('openai');
const axios = require('axios');

const app = express();

// ============ IMAGE GENERATION (DALL-E) ============

app.post('/api/admin/generate-image', express.json(), async (req, res) => {
  try {
    const { model, imageType, style, prompt, size, quality } = req.body;

    if (model === 'dall-e-3') {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const enhancedPrompt = `${prompt}. Style: ${style}. Quality: ${quality}. For ${imageType}.`;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: quality === 'ultra' ? 'hd' : 'standard',
      });

      return res.json({
        ok: true,
        imageUrl: response.data[0].url,
        model: 'dall-e-3',
        imageType,
        style,
        size,
        quality,
        timestamp: new Date().toISOString()
      });
    }

    res.status(400).json({ ok: false, error: 'Unknown model' });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Image generation failed',
      details: error.message
    });
  }
});

// ============ VIDEO GENERATION (RUNWAY) ============

app.post('/api/admin/generate-video', express.json(), async (req, res) => {
  try {
    const { model, videoType, duration, script, style, voice, aspect } = req.body;

    if (model === 'runway') {
      const response = await axios.post(
        'https://api.runwayml.com/v1/videos/generate',
        {
          prompt: script,
          duration: parseInt(duration),
          aspect_ratio: aspect,
          quality: 'high'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return res.json({
        ok: true,
        taskId: response.data.id,
        model: 'runway',
        videoType,
        duration,
        aspect,
        status: 'processing',
        timestamp: new Date().toISOString()
      });
    }

    res.status(400).json({ ok: false, error: 'Unknown model' });

  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Video generation failed',
      details: error.message
    });
  }
});

// ============ CHECK VIDEO STATUS ============

app.get('/api/admin/video-status/:taskId', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.runwayml.com/v1/videos/${req.params.taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`
        }
      }
    );

    res.json({
      ok: true,
      status: response.data.status,
      videoUrl: response.data.status === 'completed' ? response.data.url : null,
      progress: response.data.progress || 0
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Status check failed',
      details: error.message
    });
  }
});

module.exports = app;
```

---

## Testing Guide

### Local Testing

**1. Set up environment:**
```bash
cp .env.example .env

# Add your API keys
echo "OPENAI_API_KEY=sk-your-key" >> .env
echo "RUNWAY_API_KEY=your-runway-key" >> .env
```

**2. Start development server:**
```bash
npm start
```

**3. Test image generation:**
```bash
curl -X POST http://localhost:3001/api/admin/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "imageType": "product",
    "style": "photorealistic",
    "prompt": "Modern laptop on wooden desk",
    "size": "square",
    "quality": "hd"
  }'
```

**4. Test video generation:**
```bash
curl -X POST http://localhost:3001/api/admin/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "model": "runway",
    "videoType": "product-demo",
    "duration": "30",
    "script": "Show modern software interface with animations",
    "style": "modern",
    "voice": "none",
    "aspect": "16:9"
  }'
```

### Frontend Testing

1. Open Admin Panel: `http://localhost:3001/admin.html`
2. Navigate to 🎨 Media Gen tab
3. Fill in form fields
4. Click Generate
5. Verify image/video appears
6. Test download functionality

### Error Handling Tests

```bash
# Test missing API key
# Remove OPENAI_API_KEY and try generating

# Test rate limiting
# Generate multiple images rapidly

# Test invalid prompt
# Send empty or very long prompts

# Test network errors
# Disconnect internet and try
```

---

## Deployment to Production

### Step 1: Commit Changes

```bash
git add .
git commit -m "Add DALL-E 3 and Runway ML integration for media generation"
git push origin main
```

### Step 2: Set Railway Variables

```bash
# Via Railway CLI
railway variables add OPENAI_API_KEY sk-your-key
railway variables add RUNWAY_API_KEY your-runway-key

# Or via Railway Dashboard:
# Project → Variables → Add variables
```

### Step 3: Verify Deployment

```bash
# Check logs
railway logs -f

# Test deployed endpoint
curl -X POST https://your-railway-domain.com/api/admin/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "imageType": "product",
    "style": "photorealistic",
    "prompt": "Test image",
    "size": "square",
    "quality": "hd"
  }'
```

### Step 4: Monitor Usage

```bash
# Check API costs
# DALL-E: platform.openai.com/account/usage
# Runway: app.runwayml.com/account/billing
```

### Step 5: Set Limits (Optional)

Add usage limits to prevent unexpected charges:

```javascript
// server.js - Add rate limiting

const rateLimit = require('express-rate-limit');

const mediaGenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 generations per hour
  message: 'Too many generations. Please try again later.'
});

app.post('/api/admin/generate-image', mediaGenLimiter, express.json(), async (req, res) => {
  // ... image generation code
});

app.post('/api/admin/generate-video', mediaGenLimiter, express.json(), async (req, res) => {
  // ... video generation code
});
```

---

## Troubleshooting Production

### Issue: API Key Not Found

```bash
# Verify variable is set
railway variables

# Check spelling matches code exactly
# OPENAI_API_KEY (not OPENAI_API or OPENAI_KEY)
```

### Issue: Requests Timeout

```bash
# Increase timeout in server.js
const timeout = require('connect-timeout');
app.use(timeout('120s')); // 2 minutes

# Or stream the response for long operations
res.writeHead(200, {
  'Transfer-Encoding': 'chunked'
});
```

### Issue: Memory Limit Exceeded

```javascript
// Implement cleanup for base64 images
if (imageData.length > 5000000) { // 5MB
  console.warn('Image too large, implementing compression');
  // Compress or stream instead of storing in memory
}
```

---

## Cost Optimization

### Reduce Costs

1. **Use Stable Diffusion** instead of DALL-E (10x cheaper)
2. **Use standard quality** instead of ultra
3. **Implement caching** - store generated images
4. **Batch process** - generate multiple at once
5. **Set usage limits** on API keys

### Monitor Costs

```bash
# Daily cost tracking
echo "Daily AI media generation cost: $"
curl -s https://api.openai.com/v1/billing/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY" | grep -i cost
```

---

**Integration complete! Your media generation is now connected to real AI services!** 🎨🎬
