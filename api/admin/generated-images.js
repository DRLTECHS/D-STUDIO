const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  // GET /api/admin/generated-images
  if (req.method === 'GET') {
    const { model, style, limit = 10, offset = 0 } = req.query;
    const allImages = [
      { imageId: 'img-1', model: 'dall-e-3', imageType: 'product', style: 'modern', prompt: 'Professional product showcase', imageUrl: 'https://via.placeholder.com/1024x1024/3498db/ffffff?text=Product+Modern', size: '1024x1024', quality: 'high', timestamp: Date.now() - 172800000, status: 'completed' },
      { imageId: 'img-2', model: 'midjourney', imageType: 'marketing', style: 'cinematic', prompt: 'Cinematic marketing banner', imageUrl: 'https://via.placeholder.com/1792x1024/2ecc71/ffffff?text=Marketing', size: '1792x1024', quality: 'ultra', timestamp: Date.now() - 86400000, status: 'completed' }
    ];

    let filtered = allImages;
    if (model) filtered = filtered.filter(i => i.model === model);
    if (style) filtered = filtered.filter(i => i.style === style);
    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ images: paginated, count: paginated.length, total: filtered.length, limit: Number(limit), offset: Number(offset) });
  }

  // PUT /api/admin/generated-images/:imageId
  if (req.method === 'PUT') {
    const { imageId } = req.query;
    if (!imageId) return res.status(400).json({ error: 'Missing imageId' });
    const { prompt, style, quality } = req.body || {};
    return res.json({ ok: true, message: 'Image metadata updated successfully', imageId, updates: { prompt, style, quality }, updatedAt: new Date().toISOString() });
  }

  // DELETE /api/admin/generated-images/:imageId
  if (req.method === 'DELETE') {
    const { imageId } = req.query;
    if (!imageId) return res.status(400).json({ error: 'Missing imageId' });
    return res.json({ ok: true, message: 'Image deleted successfully', imageId, deletedAt: new Date().toISOString() });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
