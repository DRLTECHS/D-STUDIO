const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  // GET /api/admin/social-posts
  if (req.method === 'GET') {
    const { platform, status, limit = 10, offset = 0 } = req.query;
    const allPosts = [
      { postId: 'post-1', platform: 'instagram', content: '🚀 Introducing our latest product!', status: 'published', timestamp: Date.now() - 86400000, engagement: { likes: 245, comments: 18, shares: 12 } },
      { postId: 'post-2', platform: 'facebook', content: '⏰ Limited Time Offer!', status: 'published', timestamp: Date.now() - 43200000, engagement: { likes: 156, comments: 9, shares: 7 } },
      { postId: 'post-3', platform: 'linkedin', content: '📢 Big News!', status: 'scheduled', timestamp: Date.now() + 86400000 }
    ];

    let filtered = allPosts;
    if (platform) filtered = filtered.filter(p => p.platform === platform);
    if (status) filtered = filtered.filter(p => p.status === status);
    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ posts: paginated, count: paginated.length, total: filtered.length, limit: Number(limit), offset: Number(offset) });
  }

  // PUT /api/admin/social-posts/:postId
  if (req.method === 'PUT') {
    const { postId } = req.query; if (!postId) return res.status(400).json({ error: 'Missing postId' });
    const { content, status, scheduledTime } = req.body || {};
    return res.json({ ok: true, message: 'Social post updated successfully', postId, updates: { content, status, scheduledTime }, updatedAt: new Date().toISOString() });
  }

  // DELETE /api/admin/social-posts/:postId
  if (req.method === 'DELETE') {
    const { postId } = req.query; if (!postId) return res.status(400).json({ error: 'Missing postId' });
    return res.json({ ok: true, message: 'Social post deleted successfully', postId, deletedAt: new Date().toISOString() });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
