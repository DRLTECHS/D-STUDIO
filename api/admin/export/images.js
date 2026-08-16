const auth = require('../../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  const { format = 'json' } = req.query;
  const images = [
    { imageId: 'img-1', model: 'dall-e-3', style: 'modern', imageUrl: 'https://via.placeholder.com/1024x1024/3498db/ffffff?text=Product+Modern', timestamp: new Date(Date.now() - 172800000).toISOString() },
    { imageId: 'img-2', model: 'midjourney', style: 'cinematic', imageUrl: 'https://via.placeholder.com/1792x1024/2ecc71/ffffff?text=Marketing', timestamp: new Date(Date.now() - 86400000).toISOString() }
  ];

  if (format === 'csv') {
    const csv = 'Image ID,Model,Style,URL,Timestamp\n' + images.map(i => `"${i.imageId}","${i.model}","${i.style}","${i.imageUrl}","${i.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="images-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.json({ data: images, count: images.length, exportedAt: new Date().toISOString() });
  }
};
