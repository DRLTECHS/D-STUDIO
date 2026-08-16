const auth = require('../../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  const { format = 'json', status } = req.query;
  const contents = [
    { id: 'content-1', platform: 'instagram', status: 'published', content: '🚀 Introducing...', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 'content-2', platform: 'facebook', status: 'published', content: '⏰ Limited Time...', timestamp: new Date(Date.now() - 43200000).toISOString() },
    { id: 'content-3', platform: 'twitter', status: 'draft', content: '📢 Big News...', timestamp: new Date(Date.now() - 3600000).toISOString() }
  ];

  const filtered = status ? contents.filter(c => c.status === status) : contents;

  if (format === 'csv') {
    const csv = 'ID,Platform,Status,Content,Timestamp\n' + filtered.map(c => `"${c.id}","${c.platform}","${c.status}","${c.content.replace(/"/g,'""')}","${c.timestamp}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="content-export.csv"');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.json({ data: filtered, count: filtered.length, exportedAt: new Date().toISOString() });
  }
};
