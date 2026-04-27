const Client = require('../models/client.model');
const { createLog } = require('../services/log.service');

// Helper to get IP and user agent
function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || ''
  };
}

exports.createClient = async (req, res) => {
  try {
    const {
      clientName,
      contactPerson,
      clientEmail,
      clientMobile,
      clientImage,
      clientAddress,
      trn,
    } = req.body;
    const createdBy = req.user.id || req.user._id || req.user.userId;
    const payload = {
      clientName: String(clientName).trim(),
      contactPerson,
      clientEmail,
      clientMobile,
      clientImage,
      clientAddress,
      trn,
    };
    if (createdBy) {
      payload.createdBy = createdBy;
    }
    const client = await Client.create(payload);
    if (createdBy) {
      const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
      await createLog({
        userId: createdBy,
        role,
        action: 'CREATE',
        module: 'clients',
        recordId: client._id,
        newData: client,
        ...getRequestMeta(req)
      });
    }
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ status: true });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClient = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, status: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, status: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const oldData = { ...client._doc };
    const updates = { ...req.body };
    if (updates.clientName !== undefined) {
      updates.clientName = String(updates.clientName).trim();
    }
    Object.assign(client, updates);
    await client.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'UPDATE',
      module: 'clients',
      recordId: client._id,
      oldData,
      newData: client,
      ...getRequestMeta(req)
    });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, status: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const oldData = { ...client._doc };
    client.status = false;
    await client.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'DELETE',
      module: 'clients',
      recordId: client._id,
      oldData,
      newData: client,
      ...getRequestMeta(req)
    });
    res.json({ message: 'Client soft deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, status: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const oldData = { ...client._doc };
    client.isActive = !client.isActive;
    await client.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'ACTIVATE',
      module: 'clients',
      recordId: client._id,
      oldData,
      newData: client,
      ...getRequestMeta(req)
    });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
