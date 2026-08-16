const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  // GET /api/admin/generated-videos
  if (req.method === 'GET') {
    const { model, videoType, limit = 10, offset = 0 } = req.query;
    const allVideos = [
      { videoId: 'vid-1', model: 'runway-ml', videoType: 'product-demo', duration: 30, script: 'Showcase product features', style: 'professional', voice: 'en-US-male', aspect: '16:9', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', timestamp: Date.now() - 259200000, status: 'completed' },
      { videoId: 'vid-2', model: 'synthesia', videoType: 'explainer', duration: 45, script: 'How to use our platform', style: 'engaging', voice: 'en-US-female', aspect: '9:16', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', timestamp: Date.now() - 172800000, status: 'completed' }
    ];

    let filtered = allVideos;
    if (model) filtered = filtered.filter(v => v.model === model);
    if (videoType) filtered = filtered.filter(v => v.videoType === videoType);
    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ videos: paginated, count: paginated.length, total: filtered.length, limit: Number(limit), offset: Number(offset) });
  }

  // PUT /api/admin/generated-videos/:videoId
  if (req.method === 'PUT') {
    const { videoId } = req.query;
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
    const { script, style, voice, includeMusic, includeSubtitles } = req.body || {};
    return res.json({ ok: true, message: 'Video metadata updated successfully', videoId, updates: { script, style, voice, includeMusic, includeSubtitles }, updatedAt: new Date().toISOString() });
  }

  // DELETE /api/admin/generated-videos/:videoId
  if (req.method === 'DELETE') {
    const { videoId } = req.query;
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
    return res.json({ ok: true, message: 'Video deleted successfully', videoId, deletedAt: new Date().toISOString() });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
