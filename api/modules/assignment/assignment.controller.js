const Assignment = require('./assignment.model');
const { checkConflict } = require('./assignment.service');
const { createLog } = require('../../services/log.service');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'] || ''
  };
}

function getUserInfo(req) {
  return {
    userId: req.user.id || req.user._id || req.user.userId,
    role: req.user.role || req.user.userRole || req.user.type || 'unknown'
  };
}

function isAuthorized(req) {
  const role = (req.user.role || req.user.userRole || req.user.type || '').toLowerCase();
  return role === 'hod' || role === 'admin';
}

function populateAssignment(query) {
  return query
    .populate('clientId',     'clientName')
    .populate('projectId',    'projectName')
    .populate('departmentId', 'departmentName')
    .populate('resources.employeeId', 'userName email')
    .populate('createdBy',    'userName')
    .populate('updatedBy',    'userName');
}

// POST /api/assignments
exports.createAssignment = async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(403).json({ message: 'Access denied. Only HOD or ADMIN can create assignments.' });
    }

    const { clientId, projectId, departmentId, taskDescription, resources } = req.body;
    const { userId, role } = getUserInfo(req);

    const conflictResult = await checkConflict(resources);
    if (conflictResult) {
      return res.status(409).json({
        message: `Resource already booked for this date range. Please choose another date or resource.`
      });
    }

    const assignment = await Assignment.create({
      clientId, projectId, departmentId, taskDescription, resources,
      createdBy: userId
    });

    await createLog({
      userId, role,
      action: 'CREATE',
      module: 'ASSIGNMENT',
      recordId: assignment._id,
      newData: assignment.toObject(),
      ...getRequestMeta(req)
    });

    const populated = await populateAssignment(Assignment.findById(assignment._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/assignments
exports.getAssignments = async (req, res) => {
  try {
    const { employeeId, projectId, departmentId, startDate, endDate } = req.query;
    const filter = { status: true };

    if (projectId)    filter.projectId    = projectId;
    if (departmentId) filter.departmentId = departmentId;

    // Filter by employeeId inside nested resources array
    if (employeeId) {
      filter['resources.employeeId'] = employeeId;
    }

    // Filter by allocation date range inside nested resources
    if (startDate || endDate) {
      const allocationFilter = {};
      if (endDate)   allocationFilter.startDate = { $lte: new Date(endDate) };
      if (startDate) allocationFilter.endDate   = { $gte: new Date(startDate) };
      filter.resources = {
        $elemMatch: {
          allocations: { $elemMatch: allocationFilter }
        }
      };
    }

    const assignments = await populateAssignment(
      Assignment.find(filter).sort({ createdAt: -1 })
    );

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/assignments/calendar?startDate=&endDate=
exports.getCalendar = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required for calendar view.' });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    const assignments = await Assignment.find({
      status: true,
      resources: {
        $elemMatch: {
          allocations: {
            $elemMatch: {
              startDate: { $lte: end },
              endDate:   { $gte: start }
            }
          }
        }
      }
    })
      .populate('projectId',           'projectName')
      .populate('clientId',            'clientName')
      .populate('departmentId',        'departmentName')
      .populate('resources.employeeId','userName email')
      .lean();

    // Group by employee — one entry per employee across all assignments
    const employeeMap = {};

    for (const a of assignments) {
      for (const resource of a.resources) {
        const empId   = (resource.employeeId?._id || resource.employeeId)?.toString();
        const empName = resource.employeeId?.userName || 'Unknown';

        if (!employeeMap[empId]) {
          employeeMap[empId] = { employeeId: empId, employeeName: empName, assignments: [] };
        }

        const overlapping = resource.allocations.filter(
          alloc => new Date(alloc.startDate) <= end && new Date(alloc.endDate) >= start
        );

        for (const alloc of overlapping) {
          employeeMap[empId].assignments.push({
            assignmentId:   a._id,
            projectId:      a.projectId?._id,
            projectName:    a.projectId?.projectName || 'Unknown',
            clientName:     a.clientId?.clientName   || 'Unknown',
            departmentName: a.departmentId?.departmentName || 'Unknown',
            taskDescription: a.taskDescription,
            startDate:       alloc.startDate,
            endDate:         alloc.endDate,
            allocationStatus: alloc.allocationStatus,
            notes:           alloc.notes
          });
        }
      }
    }

    res.json(Object.values(employeeMap));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/assignments/:id
exports.updateAssignment = async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(403).json({ message: 'Access denied. Only HOD or ADMIN can update assignments.' });
    }

    const assignment = await Assignment.findOne({ _id: req.params.id, status: true });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    const oldData = assignment.toObject();
    const { taskDescription, resources } = req.body;
    const { userId, role } = getUserInfo(req);

    if (resources) {
      const conflictResult = await checkConflict(resources, assignment._id);
      if (conflictResult) {
        return res.status(409).json({
          message: `Resource already booked for this date range. Please choose another date or resource.`
        });
      }
      assignment.resources = resources;
    }

    if (taskDescription !== undefined) assignment.taskDescription = taskDescription;
    assignment.updatedBy = userId;

    await assignment.save();

    await createLog({
      userId, role,
      action: 'UPDATE',
      module: 'ASSIGNMENT',
      recordId: assignment._id,
      oldData,
      newData: assignment.toObject(),
      ...getRequestMeta(req)
    });

    const populated = await populateAssignment(Assignment.findById(assignment._id));
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/assignments/:id  (soft delete)
exports.deleteAssignment = async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(403).json({ message: 'Access denied. Only HOD or ADMIN can delete assignments.' });
    }

    const assignment = await Assignment.findOne({ _id: req.params.id, status: true });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    const oldData = assignment.toObject();
    const { userId, role } = getUserInfo(req);

    assignment.status    = false;
    assignment.updatedBy = userId;
    await assignment.save();

    await createLog({
      userId, role,
      action: 'DELETE',
      module: 'ASSIGNMENT',
      recordId: assignment._id,
      oldData,
      newData: assignment.toObject(),
      ...getRequestMeta(req)
    });

    res.json({ message: 'Assignment deleted successfully.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};