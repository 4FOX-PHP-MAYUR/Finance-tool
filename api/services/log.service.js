const Log = require('../models/log.model');


async function createLog({ userId, role, action, module, recordId, description, oldData, newData, ipAddress, userAgent }) {
  try {
    console.log('[createLog] Params:', {
      userId, role, action, module, recordId, description, oldData, newData, ipAddress, userAgent
    });
    const log = await Log.create({
      userId,
      role,
      action,
      module,
      recordId,
      description,
      oldData,
      newData,
      ipAddress,
      userAgent
    });
    console.log('[createLog] Log created:', log._id);
  } catch (err) {
    console.error('[createLog] Log creation failed:', err);
  }
}

module.exports = { createLog };
