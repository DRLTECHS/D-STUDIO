module.exports = {
  isAdmin(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return !!(token && process.env.ADMIN_API_KEY && token === process.env.ADMIN_API_KEY);
  },

  requireAdmin(req, res) {
    if (!this.isAdmin(req)) {
      res.status(401).json({ ok: false, error: 'Missing or invalid ADMIN_API_KEY' });
      return false;
    }
    return true;
  }
};
