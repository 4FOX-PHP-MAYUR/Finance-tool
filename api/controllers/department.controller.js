const Department = require('../models/department.model');
const { validationResult } = require('express-validator');
const createLog = require('../services/log.service').createLog;

exports.createDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { departmentName, departmentDescription } = req.body;
    const department = await Department.create({
      departmentName,
      departmentDescription,
      createdBy: req.user.userId || req.user.userId || req.user.id || req.user._id || req.user._id,
      status: true
    });
    await createLog({
      userId: req.user.userId || req.user.userId || req.user.id || req.user._id || req.user._id,
      role: req.user.role,
      action: 'CREATE',
      module: 'departments',
      recordId: department._id,
      newData: department,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/departments?search=abc&page=1&limit=10
exports.getDepartments = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, includeDeleted = false } = req.query;
    const query = {
      ...(includeDeleted === 'true' ? {} : { status: true }),
      departmentName: { $regex: search, $options: 'i' }
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [departments, total] = await Promise.all([
      Department.find(query).skip(skip).limit(parseInt(limit)),
      Department.countDocuments(query)
    ]);
    res.json({
      data: departments,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// PATCH /api/departments/:id/restore
exports.restoreDepartment = async (req, res) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, status: false });
    if (!department) return res.status(404).json({ error: 'Department not found or not deleted' });
    const oldData = { ...department._doc };
    department.status = true;
    await department.save();
    await createLog({
      userId: req.user.userId || req.user.id || req.user._id,
      role: req.user.role,
      action: 'UPDATE',
      module: 'departments',
      recordId: department._id,
      oldData,
      newData: department,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ message: 'Department restored', department });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, status: true });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    res.json(department);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const department = await Department.findOne({ _id: req.params.id, status: true });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    const oldData = { ...department._doc };
    if (req.body.departmentName !== undefined) department.departmentName = req.body.departmentName;
    if (req.body.departmentDescription !== undefined) department.departmentDescription = req.body.departmentDescription;
    await department.save();
    await createLog({
      userId: req.user.userId || req.user.id || req.user._id,
      role: req.user.role,
      action: 'UPDATE',
      module: 'departments',
      recordId: department._id,
      oldData,
      newData: department,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json(department);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, status: true });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    const oldData = { ...department._doc };
    department.status = false;
    await department.save();
    await createLog({
      userId: req.user.userId || req.user.id || req.user._id,
      role: req.user.role,
      action: 'DELETE',
      module: 'departments',
      recordId: department._id,
      oldData,
      newData: department,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ message: 'Department deleted (soft delete)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
