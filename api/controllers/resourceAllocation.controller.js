const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const ResourceAllocation = require('../models/resourceAllocation.model');
const { db } = require('../startup/commonModules');
const { createLog } = require('../services/log.service');

function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id;
}

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
  };
}

/**
 * Check for overlapping allocations for the same resource + project.
 * Excludes `excludeId` when updating (so the record being edited is ignored).
 */
async function hasOverlap(resourceId, projectId, startDate, endDate, excludeId = null) {
  const query = {
    resourceId,
    projectId,
    isActive: true,
    // Overlap condition: existing.start <= newEnd AND existing.end >= newStart
    startDate: { $lte: new Date(endDate) },
    endDate:   { $gte: new Date(startDate) },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const count = await ResourceAllocation.countDocuments(query);
  return count > 0;
}

// POST /api/resource-allocations
exports.createResourceAllocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      projectId, departmentId, resourceId,
      startDate, endDate, allocationPercentage, status, description,
    } = req.body;

    // Validate department owns this resource
    const user = await db.user.findOne({ _id: resourceId, departmentId, isActive: true });
    if (!user) {
      return res.status(400).json({
        error: 'Resource does not belong to the selected department or does not exist',
      });
    }

    // Duplicate/overlap check
    const overlap = await hasOverlap(resourceId, projectId, startDate, endDate);
    if (overlap) {
      return res.status(409).json({
        error: 'This resource already has an overlapping allocation for the selected project and date range',
      });
    }

    const createdBy = getUserId(req);
    const allocation = await ResourceAllocation.create({
      projectId, departmentId, resourceId,
      startDate, endDate, allocationPercentage,
      status: status || 'Active',
      description: description || '',
      createdBy,
    });

    await createLog({
      userId: createdBy,
      role: req.user?.role,
      action: 'CREATE',
      module: 'resource_allocations',
      recordId: allocation._id,
      newData: allocation,
      ...getRequestMeta(req),
    });

    res.status(201).json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/resource-allocations?search=&page=1&limit=10&projectId=&departmentId=&status=
exports.getResourceAllocations = async (req, res) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
      projectId,
      departmentId,
      status,
    } = req.query;

    const query = { isActive: true };
    if (projectId    && mongoose.Types.ObjectId.isValid(projectId))    query.projectId    = projectId;
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) query.departmentId = departmentId;
    if (status)                                                         query.status       = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let allocations = await ResourceAllocation.find(query)
      .populate('projectId',    'projectName')
      .populate('departmentId', 'departmentName')
      .populate('resourceId',   'firstName lastName userName email')
      .populate('createdBy',    'userName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Client-side search filter on resource name / project name
    if (search) {
      const s = search.toLowerCase();
      allocations = allocations.filter((a) => {
        const resName = `${a.resourceId?.firstName || ''} ${a.resourceId?.lastName || ''}`.toLowerCase();
        const projName = (a.projectId?.projectName || '').toLowerCase();
        return resName.includes(s) || projName.includes(s);
      });
    }

    const total = await ResourceAllocation.countDocuments(query);

    res.json({ data: allocations, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/resource-allocations/:id
exports.getResourceAllocation = async (req, res) => {
  try {
    const allocation = await ResourceAllocation.findOne({ _id: req.params.id, isActive: true })
      .populate('projectId',    'projectName')
      .populate('departmentId', 'departmentName')
      .populate('resourceId',   'firstName lastName userName email')
      .populate('createdBy',    'userName email');

    if (!allocation) return res.status(404).json({ error: 'Resource allocation not found' });
    res.json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/resource-allocations/:id
exports.updateResourceAllocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const allocation = await ResourceAllocation.findOne({ _id: req.params.id, isActive: true });
    if (!allocation) return res.status(404).json({ error: 'Resource allocation not found' });

    const oldData = allocation.toObject();

    const {
      projectId, departmentId, resourceId,
      startDate, endDate, allocationPercentage, status, description,
    } = req.body;

    // Use incoming values or fall back to existing ones
    const newProjectId    = projectId    || allocation.projectId;
    const newDepartmentId = departmentId || allocation.departmentId;
    const newResourceId   = resourceId   || allocation.resourceId;
    const newStartDate    = startDate    || allocation.startDate;
    const newEndDate      = endDate      || allocation.endDate;

    // Validate department/resource relationship if either changed
    if (resourceId || departmentId) {
      const user = await db.user.findOne({
        _id: newResourceId,
        departmentId: newDepartmentId,
        isActive: true,
      });
      if (!user) {
        return res.status(400).json({
          error: 'Resource does not belong to the selected department or does not exist',
        });
      }
    }

    // Overlap check (exclude self)
    const overlap = await hasOverlap(newResourceId, newProjectId, newStartDate, newEndDate, req.params.id);
    if (overlap) {
      return res.status(409).json({
        error: 'This resource already has an overlapping allocation for the selected project and date range',
      });
    }

    if (projectId            !== undefined) allocation.projectId            = projectId;
    if (departmentId         !== undefined) allocation.departmentId         = departmentId;
    if (resourceId           !== undefined) allocation.resourceId           = resourceId;
    if (startDate            !== undefined) allocation.startDate            = startDate;
    if (endDate              !== undefined) allocation.endDate              = endDate;
    if (allocationPercentage !== undefined) allocation.allocationPercentage = allocationPercentage;
    if (status               !== undefined) allocation.status               = status;
    if (description          !== undefined) allocation.description          = description;

    allocation.updatedBy = getUserId(req);
    await allocation.save();

    await createLog({
      userId: getUserId(req),
      role: req.user?.role,
      action: 'UPDATE',
      module: 'resource_allocations',
      recordId: allocation._id,
      oldData,
      newData: allocation,
      ...getRequestMeta(req),
    });

    res.json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/resource-allocations/:id  (soft delete)
exports.deleteResourceAllocation = async (req, res) => {
  try {
    const allocation = await ResourceAllocation.findOne({ _id: req.params.id, isActive: true });
    if (!allocation) return res.status(404).json({ error: 'Resource allocation not found' });

    const oldData = allocation.toObject();
    allocation.isActive  = false;
    allocation.updatedBy = getUserId(req);
    await allocation.save();

    await createLog({
      userId: getUserId(req),
      role: req.user?.role,
      action: 'DELETE',
      module: 'resource_allocations',
      recordId: allocation._id,
      oldData,
      newData: allocation,
      ...getRequestMeta(req),
    });

    res.json({ message: 'Resource allocation deleted (soft delete)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};