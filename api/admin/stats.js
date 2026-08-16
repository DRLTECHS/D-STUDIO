const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  // GET /api/admin/stats
  if (req.method === 'GET') {
    const { period = '7d' } = req.query;
    const periodMap = { '24h':1, '7d':7, '30d':30, '90d':90 };
    const days = periodMap[period] || 7;

    res.json({ period, daysAnalyzed: days, stats: {
      orders: { total: 127, completed: 98, pending: 18, failed: 11, totalRevenue: 487500, currency: 'PHP', averageOrderValue: 3842 },
      content: { generated: 234, published: 189, drafted: 45, byPlatform: { instagram: 78, facebook: 56, twitter: 41, linkedin: 14, tiktok: 9 } },
      media: { imagesGenerated: 156, videosGenerated: 34, totalImages: 456, totalVideos: 89 },
      social: { postsPublished: 189, totalEngagement: { likes: 12456, comments: 1234, shares: 456 }, averageEngagementRate: '8.4%' },
      performance: { apiResponseTime: '245ms', generationAverageTime: '32s', uptime: '99.8%' }
    }, timestamp: new Date().toISOString() });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
