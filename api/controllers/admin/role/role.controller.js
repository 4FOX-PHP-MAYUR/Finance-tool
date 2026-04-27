const { c_success, c_error, db } = require('../../../startup/commonModules');
const { createLog } = require('../../../services/log.service');

const RoleModel = db.role;

// Resolve role name from req.user.roleId for audit logs
async function resolveRoleName(roleId) {
  try {
    const role = await RoleModel.findById(roleId).lean();
    return role ? role.roleName : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// POST /api/admin/role
exports.addRole = async (req, res) => {
  try {
    const { roleName, description, status } = req.body;

    const existing = await RoleModel.findOne({ roleName: { $regex: new RegExp(`^${roleName}$`, 'i') } });
    if (existing) {
      return res.status(400).json(c_error('Role with this name already exists', 400));
    }

    const role = await RoleModel.create({ roleName, description, status, createdBy: req.user.userId });
    const roleName_ = await resolveRoleName(req.user.roleId);

    await createLog({
      userId: req.user.userId,
      role: roleName_,
      action: 'CREATE',
      module: 'roles',
      recordId: role._id,
      description: `Role "${role.roleName}" created`,
      oldData: null,
      newData: role.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(c_success('Role created successfully', role, 201));
  } catch (err) {
    return res.status(500).json(c_error(err.message, 500));
  }
};

// GET /api/admin/role?page=1&limit=10&search=admin&status=true
exports.getRoles = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // By default, list active roles only.
    // Pass status=all to include both active and soft-deleted.
    if (req.query.status === "all") {
      // no status filter
    } else if (req.query.status !== undefined) {
      filter.status = req.query.status === 'true';
    } else {
      filter.status = true;
    }

    // Case-insensitive search by roleName
    if (req.query.search) {
      filter.roleName = { $regex: req.query.search, $options: 'i' };
    }

    const [roles, total] = await Promise.all([
      RoleModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      RoleModel.countDocuments(filter),
    ]);

    return res.status(200).json(c_success('Roles fetched successfully', {
      roles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }, 200));
  } catch (err) {
    return res.status(500).json(c_error(err.message, 500));
  }
};

// GET /api/admin/role/:id
exports.getRoleById = async (req, res) => {
  try {
    const role = await RoleModel.findOne({ _id: req.params.id, status: true });
    if (!role) {
      return res.status(404).json(c_error('Role not found', 404));
    }
    return res.status(200).json(c_success('Role fetched successfully', role, 200));
  } catch (err) {
    return res.status(500).json(c_error(err.message, 500));
  }
};

// PUT /api/admin/role/:id
exports.updateRole = async (req, res) => {
  try {
    const { roleName, description, status } = req.body;

    const role = await RoleModel.findOne({ _id: req.params.id, status: true });
    if (!role) {
      return res.status(404).json(c_error('Role not found', 404));
    }

    // Check uniqueness if roleName is being changed
    if (roleName && roleName.toLowerCase() !== role.roleName.toLowerCase()) {
      const duplicate = await RoleModel.findOne({
        roleName: { $regex: new RegExp(`^${roleName}$`, 'i') },
        _id: { $ne: role._id },
      });
      if (duplicate) {
        return res.status(400).json(c_error('Role with this name already exists', 400));
      }
    }

    const oldData = role.toObject();

    if (roleName !== undefined) role.roleName = roleName;
    if (description !== undefined) role.description = description;
    if (status !== undefined) role.status = status;

    const updatedRole = await role.save();
    const roleName_ = await resolveRoleName(req.user.roleId);

    await createLog({
      userId: req.user.userId,
      role: roleName_,
      action: 'UPDATE',
      module: 'roles',
      recordId: role._id,
      description: `Role "${updatedRole.roleName}" updated`,
      oldData,
      newData: updatedRole.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json(c_success('Role updated successfully', updatedRole, 200));
  } catch (err) {
    return res.status(500).json(c_error(err.message, 500));
  }
};

// DELETE /api/admin/role/:id  (soft delete)
exports.deleteRole = async (req, res) => {
  try {
    const role = await RoleModel.findById(req.params.id);
    if (!role) {
      return res.status(404).json(c_error('Role not found', 404));
    }

    // Idempotent delete: if already soft-deleted, return success.
    if (role.status === false) {
      return res.status(200).json(c_success('Role already deleted', null, 200));
    }

    const oldData = role.toObject();
    role.status = false;
    await role.save();
    const roleName_ = await resolveRoleName(req.user.roleId);

    await createLog({
      userId: req.user.userId,
      role: roleName_,
      action: 'DELETE',
      module: 'roles',
      recordId: role._id,
      description: `Role "${role.roleName}" soft-deleted`,
      oldData,
      newData: { ...oldData, status: false },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json(c_success('Role deleted successfully', null, 200));
  } catch (err) {
    return res.status(500).json(c_error(err.message, 500));
  }
};
