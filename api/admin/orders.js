const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!auth.requireAdmin(req, res)) return;

  // Support GET /api/admin/orders and GET /api/admin/orders?orderId=DRL-001
  if (req.method === 'GET') {
    const { status, limit = 10, offset = 0, sortBy = 'timestamp', orderId } = req.query;

    const allOrders = [
      { orderId: 'DRL-001', customerName: 'Demo Customer', amount: 5000, currency: 'PHP', status: 'completed', timestamp: Date.now() - 86400000 },
      { orderId: 'DRL-002', customerName: 'Test User', amount: 3500, currency: 'PHP', status: 'pending', timestamp: Date.now() - 43200000 },
      { orderId: 'DRL-003', customerName: 'Jane Smith', amount: 7200, currency: 'PHP', status: 'completed', timestamp: Date.now() - 172800000 },
      { orderId: 'DRL-004', customerName: 'John Doe', amount: 4500, currency: 'PHP', status: 'failed', timestamp: Date.now() - 259200000 }
    ];

    if (orderId) {
      const found = allOrders.find(o => o.orderId === orderId);
      if (!found) return res.status(404).json({ error: 'Order not found' });
      return res.json(found);
    }

    let filtered = status ? allOrders.filter(o => o.status === status) : allOrders.slice();
    filtered = filtered.sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'name') return a.customerName.localeCompare(b.customerName);
      return b.timestamp - a.timestamp;
    });

    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ orders: paginated, count: paginated.length, total: filtered.length, limit: Number(limit), offset: Number(offset) });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
