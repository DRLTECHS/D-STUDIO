const auth = require('../../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  const { format = 'json' } = req.query;
  const videos = [
    { videoId: 'vid-1', model: 'runway-ml', videoType: 'product-demo', duration: 30, videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', timestamp: new Date(Date.now() - 259200000).toISOString() },
    { videoId: 'vid-2', model: 'synthesia', videoType: 'explainer', duration: 45, videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', timestamp: new Date(Date.now() - 172800000).toISOString() }
  ];

  if (format === 'csv') {
    const csv = 'Video ID,Model,Type,Duration (sec),URL,Timestamp\n' + videos.map(v => `"${v.videoId}","${v.model}","${v.videoType}",${v.duration},"${v.videoUrl}","${v.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="videos-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.json({ data: videos, count: videos.length, exportedAt: new Date().toISOString() });
  }
};
