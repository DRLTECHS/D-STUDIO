const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  // GET /api/admin/generated-content
  if (req.method === 'GET') {
    const { platform, status, limit = 10, offset = 0 } = req.query;
    const allContents = [
      { id: 'content-1', platform: 'instagram', contentType: 'product', content: '🚀 Introducing our latest product!', timestamp: Date.now() - 86400000, status: 'published' },
      { id: 'content-2', platform: 'facebook', contentType: 'promotion', content: '⏰ Limited Time Offer!', timestamp: Date.now() - 43200000, status: 'published' },
      { id: 'content-3', platform: 'twitter', contentType: 'announcement', content: "📢 Big News!", timestamp: Date.now() - 3600000, status: 'draft' }
    ];

    let filtered = allContents;
    if (platform) filtered = filtered.filter(c => c.platform === platform);
    if (status) filtered = filtered.filter(c => c.status === status);

    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ contents: paginated, count: paginated.length, total: filtered.length, limit: Number(limit), offset: Number(offset) });
  }

  // PUT /api/admin/generated-content/:contentId -> update
  if (req.method === 'PUT') {
    const { contentId } = req.query;
    if (!contentId) return res.status(400).json({ error: 'Missing contentId' });
    const { content, status: newStatus, platform } = req.body || {};
    return res.json({ ok: true, message: 'Content updated successfully', contentId, updates: { content, status: newStatus, platform }, updatedAt: new Date().toISOString() });
  }

  // DELETE /api/admin/generated-content/:contentId
  if (req.method === 'DELETE') {
    const { contentId } = req.query;
    if (!contentId) return res.status(400).json({ error: 'Missing contentId' });
    return res.json({ ok: true, message: 'Content deleted successfully', contentId, deletedAt: new Date().toISOString() });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
