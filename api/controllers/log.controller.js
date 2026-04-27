const Log = require('../models/log.model');

// GET /api/logs?userId=&module=&action=&from=&to=&role=
exports.getLogs = async (req, res) => {
  try {
    const { userId, module, action, from, to, role } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (role) filter.role = role;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const logs = await Log.find(filter).sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
