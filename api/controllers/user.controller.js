const mongoose = require('mongoose');
const { c_success, c_error, c_results, db, msgConf, logger } = require('../startup/commonModules');
const { createLog } = require('../services/log.service');

const UserModel = db.user;
const RoleModel = db.role;
const { normalizeUserEmail, EMAIL_LOOKUP_COLLATION } = require('../utils/normalizeEmail');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
  };
}

function getRequestUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id || null;
}

// POST /api/users  — Register a new user (public)
exports.registerUser = async (req, res) => {
  try {
    const {
      userName,
      email,
      mobileNumber,
      dob,
      gender,
      imageUrl,
      password,
      roleId,
      status,
      departmentId,
    } = req.body;

    let finalImageUrl = imageUrl || '';
    if (req.file?.filename) {
      finalImageUrl = `/public/uploads/users/${req.file.filename}`;
    }

    // Check email uniqueness
    const existing = await UserModel.findOne({ email }).collation(EMAIL_LOOKUP_COLLATION);
    if (existing) {
      return res.status(400).json(c_error(msgConf.users.validation.emailExists, 400));
    }

    let role = null;
    if (roleId != null && String(roleId).trim() !== '') {
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json(c_error(msgConf.users.validation.roleIdInvalid, 400));
      }
      role = await RoleModel.findById(roleId);
      if (!role) {
        return res.status(400).json(c_error(msgConf.users.validation.roleIdNotFound, 400));
      }
    }

    const userPayload = {
      userName,
      email,
      mobileNumber,
      dob,
      gender,
      imageUrl: finalImageUrl || undefined,
      password,
      isActive: status !== undefined ? status : true,
    };
    if (role) {
      userPayload.roleId = role._id;
    }
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      userPayload.departmentId = departmentId;
    }

    const user = await UserModel.create(userPayload);

    // Audit log — creator is the new user themselves for self-registration
    await createLog({
      userId: user._id,
      role: role ? role.roleName : 'unknown',
      action: 'CREATE',
      module: 'users',
      recordId: user._id,
      description: `New user registered: ${email}`,
      newData: {
        userName,
        email,
        mobileNumber,
        dob,
        gender,
        imageUrl: user.imageUrl,
        roleId: user.roleId,
        departmentId: user.departmentId,
        isActive: user.isActive,
      },
      ...getRequestMeta(req),
    });

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json(
      c_success(msgConf.success, c_results(msgConf.users.userCreated, userObj), 201)
    );
  } catch (err) {
    logger.error(`registerUser: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userCreationFailed, 500));
  }
};

// GET /api/users  — Get all active users (auth required)
exports.getActiveUsers = async (req, res) => {
  try {
    const users = await UserModel.find({ isActive: true, isDeleted: false }).select('-password');
    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.usersFetchSuccess, users), 200)
    );
  } catch (err) {
    logger.error(`getAllUsers: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userFetchFailed, 500));
  }
};

// GET /api/users  — Get all active users (auth required)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select('-password');
    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.usersFetchSuccess, users), 200)
    );
  } catch (err) {
    logger.error(`getAllUsers: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userFetchFailed, 500));
  }
};

// GET /api/users/:id  — Get single user (auth required)
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(c_error(msgConf.users.validation.userIdInvalid, 400));
    }

    const user = await UserModel.findOne({ _id: id, isActive: true, isDeleted: false }).select('-password');
    if (!user) {
      return res.status(404).json(c_error(msgConf.users.validation.userNotFound, 404));
    }

    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.userFound, user), 200)
    );
  } catch (err) {
    logger.error(`getUser: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userFetchFailed, 500));
  }
};

// GET /api/users/me  — Get currently authenticated user profile
exports.getMyProfile = async (req, res) => {
  try {
    const requestUserId = getRequestUserId(req);
    if (!requestUserId || !mongoose.Types.ObjectId.isValid(String(requestUserId))) {
      return res.status(401).json(c_error("Unauthorized!", 401));
    }

    const user = await UserModel.findOne({
      _id: requestUserId,
      isActive: true,
      isDeleted: false,
    }).select("-password");

    if (!user) {
      return res.status(404).json(c_error(msgConf.users.validation.userNotFound, 404));
    }

    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.userFound, user), 200)
    );
  } catch (err) {
    logger.error(`getMyProfile: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userFetchFailed, 500));
  }
};

// PUT /api/users/:id  — Update user (auth required)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(c_error(msgConf.users.validation.userIdInvalid, 400));
    }

    const value = { ...req.body };
    if (req.file?.filename) {
      value.imageUrl = `/public/uploads/users/${req.file.filename}`;
    }

    const user = await UserModel.findOne({ _id: id, isActive: true, isDeleted: false });
    if (!user) {
      return res.status(404).json(c_error(msgConf.users.validation.userNotFound, 404));
    }

    // If email is being changed, check it's not already taken
    if (value.email && value.email !== user.email) {
      const emailTaken = await UserModel.findOne({ email: value.email, _id: { $ne: id } }).collation(
        EMAIL_LOOKUP_COLLATION
      );
      if (emailTaken) {
        return res.status(400).json(c_error(msgConf.users.validation.emailExists, 400));
      }
    }

    // If roleId is being changed, verify it exists
    if (value.roleId) {
      const roleExists = await RoleModel.findById(value.roleId);
      if (!roleExists) {
        return res.status(400).json(c_error(msgConf.users.validation.roleIdNotFound, 400));
      }
    }

    // Capture old data before update (exclude password)
    const oldData = user.toObject();
    delete oldData.password;

    // Map status → isActive if provided
    if (value.status !== undefined) {
      value.isActive = value.status;
      delete value.status;
    }

    // Apply changes — use save() so password pre-save hook fires if password changed
    Object.assign(user, value);
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    const requestorId = req.user.userId || req.user.id || req.user._id;
    const requestorRole = req.user.roleId || req.user.role || 'unknown';

    await createLog({
      userId: requestorId,
      role: String(requestorRole),
      action: 'UPDATE',
      module: 'users',
      recordId: user._id,
      description: `User updated: ${user.email}`,
      oldData,
      newData: updatedUser,
      ...getRequestMeta(req),
    });

    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.userUpdated, updatedUser), 200)
    );
  } catch (err) {
    logger.error(`updateUser: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userUpdateFailed, 500));
  }
};

// PUT /api/users/me  — Update currently authenticated user profile
exports.updateMyProfile = async (req, res) => {
  try {
    const requestUserId = getRequestUserId(req);
    if (!requestUserId || !mongoose.Types.ObjectId.isValid(String(requestUserId))) {
      return res.status(401).json(c_error("Unauthorized!", 401));
    }

    const user = await UserModel.findOne({
      _id: requestUserId,
      isActive: true,
      isDeleted: false,
    });
    if (!user) {
      return res.status(404).json(c_error(msgConf.users.validation.userNotFound, 404));
    }

    const value = { ...req.body };
    if (req.file?.filename) {
      value.imageUrl = `/public/uploads/users/${req.file.filename}`;
    }

    // Self profile can update only basic own details.
    const allowedKeys = ["userName", "email", "mobileNumber", "dob", "gender", "password", "imageUrl"];
    const safeValue = Object.fromEntries(
      Object.entries(value).filter(([key]) => allowedKeys.includes(key))
    );

    if (safeValue.email != null && String(safeValue.email).trim() !== '') {
      safeValue.email = normalizeUserEmail(safeValue.email);
    }

    if (safeValue.email && safeValue.email !== user.email) {
      const emailTaken = await UserModel.findOne({
        email: safeValue.email,
        _id: { $ne: requestUserId },
      }).collation(EMAIL_LOOKUP_COLLATION);
      if (emailTaken) {
        return res.status(400).json(c_error(msgConf.users.validation.emailExists, 400));
      }
    }

    if (safeValue.mobileNumber && safeValue.mobileNumber !== user.mobileNumber) {
      const mobileTaken = await UserModel.findOne({
        mobileNumber: safeValue.mobileNumber,
        _id: { $ne: requestUserId },
      });
      if (mobileTaken) {
        return res.status(400).json(c_error("Mobile Number already exists", 400));
      }
    }

    const oldData = user.toObject();
    delete oldData.password;

    Object.assign(user, safeValue);
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    const requestorRole = req.user.roleId || req.user.role || "unknown";
    await createLog({
      userId: requestUserId,
      role: String(requestorRole),
      action: "UPDATE",
      module: "users",
      recordId: user._id,
      description: `User profile updated: ${user.email}`,
      oldData,
      newData: updatedUser,
      ...getRequestMeta(req),
    });

    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.userUpdated, updatedUser), 200)
    );
  } catch (err) {
    logger.error(`updateMyProfile: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userUpdateFailed, 500));
  }
};

// DELETE /api/users/:id  — Soft delete (status = false / isActive = false) (auth required)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(c_error(msgConf.users.validation.userIdInvalid, 400));
    }

    const user = await UserModel.findOne({ _id: id, isActive: true, isDeleted: false });
    if (!user) {
      return res.status(404).json(c_error(msgConf.users.validation.userNotFound, 404));
    }

    const oldData = user.toObject();
    delete oldData.password;

    // Soft delete: mark inactive
    user.isActive = false;
    user.isDeleted = true;
    await user.save();

    const requestorId = req.user.userId || req.user.id || req.user._id;
    const requestorRole = req.user.roleId || req.user.role || 'unknown';

    await createLog({
      userId: requestorId,
      role: String(requestorRole),
      action: 'DELETE',
      module: 'users',
      recordId: user._id,
      description: `User soft-deleted: ${user.email}`,
      oldData,
      newData: { isActive: false, isDeleted: true },
      ...getRequestMeta(req),
    });

    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.userDeleted, { _id: user._id }), 200)
    );
  } catch (err) {
    logger.error(`deleteUser: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userDeleteFailed, 500));
  }
};

// GET /api/users/department/:departmentId  — Get active users in a department (auth required)
exports.getUsersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json(c_error('Invalid department ID', 400));
    }

    // .lean() bypasses autopopulate so departmentId stays a raw ObjectId string —
    // avoids the ObjectId vs string comparison bug on the frontend.
    const users = await UserModel.find({ departmentId, isActive: true, isDeleted: false })
      .select('_id userName email departmentId roleId')
      .lean();

    return res.status(200).json(
      c_success(msgConf.success, c_results('Users fetched successfully', users), 200)
    );
  } catch (err) {
    logger.error(`getUsersByDepartment: ${err.message}`);
    return res.status(500).json(c_error(err.message || 'Failed to fetch users', 500));
  }
};

// PATCH /api/users/:id/restore  — Restore a soft-deleted user (auth required)
exports.restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(c_error(msgConf.users.validation.userIdInvalid, 400));
    }

    const user = await UserModel.findOne({ _id: id, isDeleted: true });
    if (!user) {
      return res.status(404).json(c_error(msgConf.users.validation.userNotFound, 404));
    }

    user.isActive = true;
    user.isDeleted = false;
    await user.save();

    const requestorId = req.user.userId || req.user.id || req.user._id;
    const requestorRole = req.user.roleId || req.user.role || 'unknown';

    await createLog({
      userId: requestorId,
      role: String(requestorRole),
      action: 'UPDATE',
      module: 'users',
      recordId: user._id,
      description: `User restored: ${user.email}`,
      oldData: { isActive: false, isDeleted: true },
      newData: { isActive: true, isDeleted: false },
      ...getRequestMeta(req),
    });

    return res.status(200).json(
      c_success(msgConf.success, c_results(msgConf.users.userRestored, { _id: user._id }), 200)
    );
  } catch (err) {
    logger.error(`restoreUser: ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.users.userRestoreFailed, 500));
  }
};