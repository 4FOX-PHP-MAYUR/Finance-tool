const { c_success, c_error, c_results, db, msgConf } = require("../../startup/commonModules");
const {
  ASSIGN_MODULE_KEY,
  ASSIGN_ROLES,
} = require("../../models/assign/assignModuleRole.model");

const AssignModuleRoleModel = db.assignModuleRole;
const UserModel = db.user;

const allowedRoles = [ASSIGN_ROLES.USER, ASSIGN_ROLES.ADMIN];

/**
 * POST /api/admin/assign-module-roles
 * Upserts which sub-role (user/admin) a user has for a logical module key (e.g. assign-vendor).
 */
exports.assignModuleRole = async (req, res) => {
  try {
    const { userId, moduleKey, role } = req.body;
    const key = (moduleKey || ASSIGN_MODULE_KEY).toString().trim().toLowerCase();

    if (!allowedRoles.includes(role)) {
      return res
        .status(400)
        .json(c_error(`role must be one of: ${allowedRoles.join(", ")}`, res.statusCode));
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json(c_error("User not found", res.statusCode));
    }

    const doc = await AssignModuleRoleModel.findOneAndUpdate(
      { userId, moduleKey: key },
      { userId, moduleKey: key, role },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("userId", "userName email");

    return res.status(200).json(
      c_success(
        msgConf.success,
        c_results("Module role assigned successfully", doc),
        res.statusCode
      )
    );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

/**
 * GET /api/admin/assign-module-roles
 * Optional filters: userId, moduleKey, page, limit
 */
exports.listAssignModuleRoles = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    if (req.query.moduleKey) {
      filter.moduleKey = String(req.query.moduleKey).trim().toLowerCase();
    }
    if (req.query.role && allowedRoles.includes(req.query.role)) {
      filter.role = req.query.role;
    }

    const [items, total] = await Promise.all([
      AssignModuleRoleModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "userName email"),
      AssignModuleRoleModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      c_success(
        msgConf.success,
        c_results("Assign module roles fetched successfully", {
          items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
          },
        }),
        res.statusCode
      )
    );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

/**
 * GET /api/admin/assign-module-roles/user/:userId
 * All module-role rows for one user.
 */
exports.getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId).select("_id userName email");
    if (!user) {
      return res.status(404).json(c_error("User not found", res.statusCode));
    }

    const items = await AssignModuleRoleModel.find({ userId })
      .sort({ moduleKey: 1 })
      .populate("userId", "userName email");

    return res.status(200).json(
      c_success(
        msgConf.success,
        c_results("User module roles fetched successfully", { user, assignments: items }),
        res.statusCode
      )
    );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

/**
 * DELETE /api/admin/assign-module-roles/:userId
 * Query: moduleKey (defaults to assign module)
 */
exports.removeAssignModuleRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const moduleKey = (req.query.moduleKey || ASSIGN_MODULE_KEY).toString().trim().toLowerCase();

    const removed = await AssignModuleRoleModel.findOneAndDelete({ userId, moduleKey });
    if (!removed) {
      return res.status(404).json(c_error("Assignment not found", res.statusCode));
    }

    return res.status(200).json(
      c_success(
        msgConf.success,
        c_results("Module role assignment removed", removed),
        res.statusCode
      )
    );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

exports.ASSIGN_MODULE_KEY = ASSIGN_MODULE_KEY;
exports.ASSIGN_ROLES = ASSIGN_ROLES;
