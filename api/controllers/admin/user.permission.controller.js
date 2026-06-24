const mongoose = require("mongoose");
const { c_success, c_error, c_results, db, msgConf } = require("../../startup/commonModules");

const RoleModel = db.role;
const RolePermissionModel = db.rolePermission;
const ModuleModel = db.module;
const { loadRolePermissionsForAuth } = require("../../services/rolePermissionBootstrap.service");

function normalizeRoleObjectId(roleId) {
  if (roleId == null || roleId === "") return null;
  const s = String(roleId).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const oid = normalizeRoleObjectId(roleId);
    if (!oid) {
      return res
        .status(400)
        .json(c_error("Invalid role id", res.statusCode));
    }
    const role = await RoleModel.findById(oid);
    if (!role) {
      return res
        .status(404)
        .json(c_error("Role not found", res.statusCode));
    }

    const rolePermissions = await RolePermissionModel.findOne({ roleId: oid });
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Permissions fetched successfully", {
            roleId: String(oid),
            assigned: Boolean(rolePermissions),
            permissions: rolePermissions?.permissions || [],
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

/** Current user's effective permissions (from JWT roleId). */
exports.getMyPermissions = async (req, res) => {
  try {
    const oid = normalizeRoleObjectId(req.user?.roleId);
    if (!oid) {
      return res
        .status(400)
        .json(
          c_error(
            "roleId missing or invalid on session — re-login after your role is assigned",
            res.statusCode
          )
        );
    }

    const doc = await loadRolePermissionsForAuth(String(oid));

    return res.status(200).json(
      c_success(
        msgConf.success,
        c_results("Permissions fetched successfully", {
          roleId: String(oid),
          assigned: Boolean(doc?.permissions?.length),
          permissions: doc?.permissions || [],
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

exports.assignPermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions, replace } = req.body;

    const roleOid = normalizeRoleObjectId(roleId);
    if (!roleOid) {
      return res
        .status(400)
        .json(c_error("Invalid role id", res.statusCode));
    }

    const role = await RoleModel.findById(roleOid);
    if (!role) {
      return res
        .status(404)
        .json(c_error("Role not found", res.statusCode));
    }

    if (!Array.isArray(permissions)) {
      return res
        .status(400)
        .json(c_error("permissions must be an array", res.statusCode));
    }

    const replaceAll = Boolean(replace);

    // Normalize module ids and validate them against module master list
    const modules = await ModuleModel.find();
    const moduleById = new Map(modules.map((m) => [String(m._id), m.moduleName]));

    const moduleIdsInRequest = permissions
      .map((p) => String(p.moduleId || p.module || "").trim())
      .filter(Boolean);

    const invalidModuleIds = [...new Set(moduleIdsInRequest)].filter(
      (m) => !moduleById.has(m)
    );

    if (invalidModuleIds.length) {
      return res
        .status(400)
        .json(
          c_error(
            `Invalid moduleId(s): ${invalidModuleIds.join(", ")}`,
            res.statusCode
          )
        );
    }

    // Load existing permissions for this role so we can update/insert per module
    const existing = await RolePermissionModel.findOne({ roleId: roleOid });
    const existingMap = new Map(
      (existing?.permissions || []).map((p) => [String(p.moduleId), p])
    );

    // Build permission objects for incoming entries
    const incomingMap = new Map();
    for (const p of permissions) {
      const moduleIdString = String(p.moduleId || p.module || "").trim();
      if (!moduleIdString) continue;

      const access = p.access || {};
      const moduleObjectId = new mongoose.Types.ObjectId(moduleIdString);

      const permissionObj = {
        moduleId: moduleObjectId,
        moduleName: moduleById.get(moduleIdString) || "",
        access: {
          view: Boolean(access.view),
          add: Boolean(access.add),
          update: Boolean(access.update),
          delete: Boolean(access.delete),
        },
      };

      incomingMap.set(moduleIdString, permissionObj);
    }

    let mergedPermissions;
    if (replaceAll) {
      mergedPermissions = Array.from(incomingMap.values());
    } else {
      const mergedMap = new Map(existingMap);
      for (const [moduleIdString, perm] of incomingMap.entries()) {
        mergedMap.set(moduleIdString, perm);
      }
      mergedPermissions = Array.from(mergedMap.values());
    }

    const updated = await RolePermissionModel.findOneAndUpdate(
      { roleId: roleOid },
      { roleId: roleOid, permissions: mergedPermissions },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Role permissions updated successfully", updated),
          res.statusCode
        )
      );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

exports.copyPermissions = async (req, res) => {
  try {
    const { fromRoleId, toRoleId } = req.body;

    const fromOid = normalizeRoleObjectId(fromRoleId);
    const toOid = normalizeRoleObjectId(toRoleId);
    if (!fromOid || !toOid) {
      return res
        .status(400)
        .json(c_error("fromRoleId and toRoleId must be valid ids", res.statusCode));
    }

    const source = await RolePermissionModel.findOne({ roleId: fromOid });
    if (!source) {
      return res
        .status(404)
        .json(c_error("Source role has no permissions", res.statusCode));
    }

    const targetRole = await RoleModel.findById(toOid);
    if (!targetRole) {
      return res
        .status(404)
        .json(c_error("Target role not found", res.statusCode));
    }

    const copied = await RolePermissionModel.findOneAndUpdate(
      { roleId: toOid },
      { roleId: toOid, permissions: source.permissions },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Permissions copied successfully", copied),
          res.statusCode
        )
      );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};
