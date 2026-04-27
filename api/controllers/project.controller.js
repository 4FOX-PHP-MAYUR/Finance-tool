const Project = require('../models/project.model');
const { createLog } = require('../services/log.service');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || ''
  };
}

exports.createProject = async (req, res) => {
  try {
    const { projectName, projectDescription, projectImage, isCompleted, projectPercentageCompleted, startDate, endDate, status, clientId } = req.body;
    const createdBy = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    if (!createdBy) return res.status(400).json({ message: 'User ID not found in token.' });
    const project = await Project.create({
      projectName, projectDescription, projectImage, isCompleted, projectPercentageCompleted, startDate, endDate, status, createdBy, clientId
    });
    await createLog({
      userId: createdBy,
      role,
      action: 'CREATE',
      module: 'projects',
      recordId: project._id,
      newData: project,
      ...getRequestMeta(req)
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: true });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, status: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, status: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const oldData = { ...project._doc };
    Object.assign(project, req.body);
    await project.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'UPDATE',
      module: 'projects',
      recordId: project._id,
      oldData,
      newData: project,
      ...getRequestMeta(req)
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, status: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const oldData = { ...project._doc };
    project.status = false;
    await project.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'DELETE',
      module: 'projects',
      recordId: project._id,
      oldData,
      newData: project,
      ...getRequestMeta(req)
    });
    res.json({ message: 'Project soft deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, status: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const oldData = { ...project._doc };
    const { projectPercentageCompleted } = req.body;
    project.projectPercentageCompleted = projectPercentageCompleted;
    if (projectPercentageCompleted === 100) project.isCompleted = true;
    await project.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'PROGRESS UPDATE',
      module: 'projects',
      recordId: project._id,
      oldData,
      newData: project,
      ...getRequestMeta(req)
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.markComplete = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, status: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const oldData = { ...project._doc };
    project.isCompleted = true;
    project.projectPercentageCompleted = 100;
    await project.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'COMPLETE',
      module: 'projects',
      recordId: project._id,
      oldData,
      newData: project,
      ...getRequestMeta(req)
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
