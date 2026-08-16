# AI & Social Media Integration Guide

This guide explains how to integrate real AI services and social media platforms with your admin panel.

---

## Table of Contents

1. [AI Services Setup](#ai-services-setup)
2. [Social Media API Integration](#social-media-api-integration)
3. [Backend Configuration](#backend-configuration)
4. [Testing & Deployment](#testing--deployment)

---

## AI Services Setup

### Option 1: OpenAI Integration

#### 1. Get API Keys

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up / Login
3. Go to API Keys section
4. Create new secret key
5. Copy and save securely

#### 2. Install SDK

```bash
npm install openai
```

#### 3. Update Environment Variables

Add to your `.env` or Railway variables:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=500
```

#### 4. Update Backend Code

Modify `/api/admin/generate-content` in `server.js`:

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/admin/generate-content', async (req, res) => {
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

    // Create platform-specific prompt
    const platformGuide = {
      facebook: 'Optimize for Facebook with longer captions (up to 500 chars)',
      instagram: 'Optimize for Instagram with emojis and hashtags (250 chars max)',
      twitter: 'Keep it concise for Twitter (280 chars max)',
      linkedin: 'Professional tone for LinkedIn (up to 3000 chars)',
      tiktok: 'Trendy and energetic for TikTok (shorter is better)',
      all: 'Create multiple versions optimized for each platform'
    };

    const prompt = `
      Generate marketing content for ${platform} (${platformGuide[platform]})
      
      Content Type: ${contentType}
      Product/Service: ${productName}
      Key Features: ${keywords}
      Target Audience: ${targetAudience}
      Tone: ${tone}
      Call-to-Action: ${cta || 'Not specified'}
      
      Create engaging, platform-optimized content that converts.
      Include relevant hashtags and emojis.
    `;

    const message = await openai.messages.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || 500),
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.content[0].text;

    res.json({
      ok: true,
      content,
      platform,
      contentType,
      model: process.env.OPENAI_MODEL,
      usage: message.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate content with OpenAI',
      details: error.message
    });
  }
});
```

### Option 2: Anthropic Claude Integration

#### 1. Get API Key

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Sign up / Login
3. Create new API key
4. Copy and save

#### 2. Install SDK

```bash
npm install @anthropic-ai/sdk
```

#### 3. Add Environment Variable

```
ANTHROPIC_API_KEY=sk-ant-...
```

#### 4. Update Backend

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/admin/generate-content', async (req, res) => {
  try {
    const { platform, contentType, productName, keywords, tone, targetAudience, cta } = req.body;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Create marketing content for ${platform} about "${productName}".
          Type: ${contentType}
          Tone: ${tone}
          Audience: ${targetAudience}
          Features: ${keywords}
          CTA: ${cta}
          
          Make it engaging and platform-optimized.`
        }
      ]
    });

    res.json({
      ok: true,
      content: message.content[0].text,
      platform,
      contentType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Claude generation failed',
      details: error.message
    });
  }
});
```

---

## Social Media API Integration

### Facebook & Instagram Graph API

#### Setup

1. Create [Facebook Developer Account](https://developers.facebook.com)
2. Create an App
3. Get User Access Token with `publish_pages` permission
4. Get Page ID

#### Installation

```bash
npm install axios
```

#### Environment Variables

```
FACEBOOK_ACCESS_TOKEN=your_access_token
FACEBOOK_PAGE_ID=your_page_id
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
```

#### Integration

```javascript
const axios = require('axios');

async function publishToFacebook(content, accessToken, pageId) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        message: content,
        access_token: accessToken
      }
    );
    return response.data;
  } catch (error) {
    console.error('Facebook API Error:', error);
    throw error;
  }
}

async function publishToInstagram(content, accessToken, accountId) {
  try {
    // First create media container
    const mediaResponse = await axios.post(
      `https://graph.instagram.com/v18.0/${accountId}/media`,
      {
        media_type: 'CAROUSEL',
        children: [
          { media_type: 'IMAGE', image_url: 'https://your-image-url.jpg' }
        ],
        caption: content,
        access_token: accessToken
      }
    );

    // Then publish
    const publishResponse = await axios.post(
      `https://graph.instagram.com/v18.0/${accountId}/media_publish`,
      {
        creation_id: mediaResponse.data.id,
        access_token: accessToken
      }
    );

    return publishResponse.data;
  } catch (error) {
    console.error('Instagram API Error:', error);
    throw error;
  }
}
```

### Twitter/X API v2

#### Setup

1. Create [Twitter Developer Account](https://developer.twitter.com)
2. Create an App
3. Generate API Keys and Tokens
4. Enable v2 endpoints

#### Installation

```bash
npm install twitter-api-v2
```

#### Environment Variables

```
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

#### Integration

```javascript
const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

async function publishToTwitter(content) {
  try {
    const tweet = await rwClient.v2.tweet(content);
    return tweet.data;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw error;
  }
}
```

### LinkedIn API

#### Setup

1. Create [LinkedIn Developer Account](https://linkedin.com/developers)
2. Create an App
3. Get Access Token
4. Get Organization ID / Person ID

#### Installation

```bash
npm install axios
```

#### Environment Variables

```
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_ORGANIZATION_ID=your_org_id
LINKEDIN_PERSON_ID=your_person_id
```

#### Integration

```javascript
async function publishToLinkedIn(content, accessToken, orgId) {
  try {
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:organization:${orgId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('LinkedIn API Error:', error);
    throw error;
  }
}
```

### TikTok API

#### Setup

1. Create [TikTok Developer Account](https://developers.tiktok.com)
2. Create an App
3. Get Client Key and Secret
4. Get User Access Token

#### Environment Variables

```
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_ACCESS_TOKEN=your_access_token
TIKTOK_VIDEO_URL=https://your-video-url.mp4
```

#### Integration

```javascript
async function publishToTikTok(videoUrl, caption, accessToken) {
  try {
    // Note: TikTok API has stricter requirements
    // Usually requires server-side rendering and video upload
    
    const response = await axios.post(
      'https://open.tiktok.com/v1/video/upload',
      {
        data: {
          video: videoUrl,
          description: caption,
          privacy_level: 0 // Public
        },
        params: {
          access_token: accessToken
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('TikTok API Error:', error);
    throw error;
  }
}
```

---

## Backend Configuration

### Complete Integration Example

```javascript
// In server.js - Complete /api/admin/publish-social endpoint

app.post('/api/admin/publish-social', async (req, res) => {
  try {
    const {
      content,
      platform,
      scheduledTime,
      addHashtags
    } = req.body;

    if (!content || !platform) {
      return res.status(400).json({ ok: false, error: 'Missing content or platform' });
    }

    // Add hashtags if requested
    let finalContent = content;
    if (addHashtags) {
      const hashtags = '\n\n#DRLTechs #Innovation #SoftwareTrading #BusinessSolutions';
      finalContent += hashtags;
    }

    // If scheduled, store in database and process later
    if (scheduledTime) {
      const publishTime = new Date(scheduledTime);
      const delay = publishTime - Date.now();
      
      if (delay > 0) {
        // Schedule for later
        setTimeout(async () => {
          await publishToAllPlatforms(finalContent, [platform]);
        }, delay);

        return res.json({
          ok: true,
          message: `Content scheduled for ${publishTime}`,
          status: 'scheduled',
          scheduledTime,
          postId: `scheduled-${Date.now()}`
        });
      }
    }

    // Publish immediately
    const result = await publishToAllPlatforms(finalContent, [platform]);

    res.json({
      ok: true,
      message: 'Content published',
      platform,
      status: 'published',
      result,
      postId: `post-${Date.now()}`
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Publication failed',
      details: error.message
    });
  }
});

async function publishToAllPlatforms(content, platforms) {
  const results = {};

  for (const platform of platforms) {
    try {
      switch (platform) {
        case 'facebook':
          results.facebook = await publishToFacebook(
            content,
            process.env.FACEBOOK_ACCESS_TOKEN,
            process.env.FACEBOOK_PAGE_ID
          );
          break;
        case 'instagram':
          results.instagram = await publishToInstagram(
            content,
            process.env.INSTAGRAM_ACCESS_TOKEN,
            process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
          );
          break;
        case 'twitter':
          results.twitter = await publishToTwitter(content);
          break;
        case 'linkedin':
          results.linkedin = await publishToLinkedIn(
            content,
            process.env.LINKEDIN_ACCESS_TOKEN,
            process.env.LINKEDIN_ORGANIZATION_ID
          );
          break;
        case 'tiktok':
          results.tiktok = await publishToTikTok(
            process.env.TIKTOK_VIDEO_URL,
            content,
            process.env.TIKTOK_ACCESS_TOKEN
          );
          break;
      }
    } catch (error) {
      results[platform] = { error: error.message };
    }
  }

  return results;
}
```

---

## Testing & Deployment

### Local Testing

```bash
# Test with mock mode (default)
npm start

# Environment: development
NODE_ENV=development npm start
```

### Production Deployment

#### 1. Set API Keys in Railway

Go to your Railway project:
- Settings → Variables
- Add all API keys and tokens

```
OPENAI_API_KEY=sk-...
FACEBOOK_ACCESS_TOKEN=...
TWITTER_BEARER_TOKEN=...
LINKEDIN_ACCESS_TOKEN=...
```

#### 2. Update Code

```bash
git add .
git commit -m "Add AI and social media integrations"
git push origin main
```

#### 3. Verify Deployment

```bash
# Check logs
railway logs -f

# Test endpoint
curl -X POST https://your-domain.com/api/admin/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "contentType": "product",
    "productName": "D-STUDIO",
    "keywords": "innovative",
    "tone": "professional",
    "targetAudience": "Developers",
    "cta": "Learn More"
  }'
```

### Testing Checklist

- [ ] AI content generation works
- [ ] Content is platform-optimized
- [ ] Social media publishing succeeds
- [ ] Scheduled posts work
- [ ] Hashtags are added correctly
- [ ] Campaign history saves properly
- [ ] No API key leaks in logs
- [ ] Error handling works

---

## Cost Considerations

### OpenAI Pricing
- GPT-4: ~$0.03 per 1K tokens
- Average post: 100-300 tokens
- Estimate: $0.003-0.009 per post

### Social Media APIs
- Most are free (Facebook, Instagram, LinkedIn, Twitter v2)
- TikTok may have limitations for new apps
- No per-post costs

### Total Monthly Estimate
- 100 posts/month with OpenAI: ~$0.30-0.90
- Additional posts: minimal cost
- Social media APIs: Free

---

## Troubleshooting Integration

### API Key Issues
```bash
# Verify environment variables are set
echo $OPENAI_API_KEY

# Check Railway variables
railway vars
```

### Rate Limiting
- OpenAI: 3 RPM for free tier, 60 for paid
- Twitter: 300 posts/15 min limit
- Facebook: 200 calls/hour
- LinkedIn: Varies by API endpoint

### Authentication Errors
- Verify tokens haven't expired
- Regenerate access tokens if needed
- Check permissions/scopes

### Publishing Fails
- Check character limits per platform
- Verify media uploads if including images
- Check platform-specific requirements

---

## Next Steps

1. Choose AI service (OpenAI recommended to start)
2. Get API keys
3. Update environment variables
4. Modify backend endpoints
5. Test locally
6. Deploy to production
7. Monitor logs and errors
8. Add more platforms as needed

---

**Your AI and social media integration is ready! 🚀**
