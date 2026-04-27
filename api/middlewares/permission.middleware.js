const mongoose = require("mongoose");
const { c_error } = require("../startup/commonModules");
const { loadRolePermissionsForAuth } = require("../services/rolePermissionBootstrap.service");

/** Lazily filled map: module ObjectId string → lowercase moduleName (fixes rows with empty moduleName). */
let moduleIdToNameCache = null;

async function warmModuleIdNameCache() {
  if (moduleIdToNameCache) return;
  const { db } = require("../startup/commonModules");
  const rows = await db.module.find().select("moduleName").lean();
  moduleIdToNameCache = new Map(
    rows.map((m) => [String(m._id), String(m.moduleName || "").trim().toLowerCase()])
  );
}

function effectiveModuleKey(p) {
  const byName = String(p.moduleName || "").trim().toLowerCase();
  if (byName) return byName;
  if (!p?.moduleId || !moduleIdToNameCache) return "";
  return moduleIdToNameCache.get(String(p.moduleId)) || "";
}

/** Sub-module key → older coarse moduleName rows in RolePermissions (align with front permissionService). */
const LEGACY_COARSE_PARENT = {
  users_add: "users",
  users_list: "users",
  roles_add: "roles",
  roles_list: "roles",
  permissions_assign: "permissions",
  permissions_manage: "permissions",
  clients_add: "clients",
  clients_list: "clients",
  vendor_add: "vendors",
  vendor_list: "vendors",
  assign_vendor: "vendors",
  assigned_vendors: "vendors",
  vendor_hod_review: "vendors",
  vendor_finance_review: "vendors",
  projects_add: "projects",
  projects_list: "projects",
};

async function resolveRolePermissionsFromRequest(req, res) {
  const rawRoleId = req.user && req.user.roleId;
  const roleId =
    typeof rawRoleId === "string"
      ? rawRoleId
      : rawRoleId?._id
      ? String(rawRoleId._id)
      : "";
  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return { error: res.status(401).json(c_error("Unauthorized", res.statusCode)) };
  }
  await warmModuleIdNameCache();
  const rolePermissions = await loadRolePermissionsForAuth(roleId);
  if (!rolePermissions || !Array.isArray(rolePermissions.permissions)) {
    return { error: res.status(403).json(c_error("Forbidden", res.statusCode)) };
  }
  if (!rolePermissions.permissions.length) {
    return { error: res.status(403).json(c_error("Forbidden", res.statusCode)) };
  }
  return { rolePermissions };
}

function hasAccess(rolePermissions, moduleName, action) {
  const rawKey = String(moduleName || "").trim();
  const moduleKey = mongoose.Types.ObjectId.isValid(rawKey)
    ? rawKey
    : rawKey.toLowerCase();
  const actionKey = String(action || "").trim().toLowerCase();

  const findPerm = (key) => {
    const keyAsOid = mongoose.Types.ObjectId.isValid(key);
    return rolePermissions.permissions.find((p) => {
      if (keyAsOid) {
        return String(p.moduleId) === key;
      }
      return effectiveModuleKey(p) === key;
    });
  };

  let modulePermissions = findPerm(moduleKey);
  if (!modulePermissions) {
    const legacyParent = LEGACY_COARSE_PARENT[moduleKey];
    if (legacyParent) {
      modulePermissions = findPerm(legacyParent);
    }
  }
  return Boolean(modulePermissions?.access?.[actionKey]);
}

/**
 * Middleware generator to check if the logged in user has permission
 * for a given module + action.
 *
 * Usage: checkPermission('users','add')
 */
const checkPermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      const resolved = await resolveRolePermissionsFromRequest(req, res);
      if (resolved.error) return resolved.error;
      if (!hasAccess(resolved.rolePermissions, moduleName, action)) {
        return res.status(403).json(c_error("Forbidden", res.statusCode));
      }

      next();
    } catch (err) {
      return res.status(500).json(c_error(err.message || "Forbidden", res.statusCode));
    }
  };
};

/**
 * Allow request if user has ANY one of the supplied permission tuples.
 * Usage: checkAnyPermission([["assigned_vendors","view"],["vendor_hod_review","view"]])
 */
const checkAnyPermission = (requirements = []) => {
  return async (req, res, next) => {
    try {
      const resolved = await resolveRolePermissionsFromRequest(req, res);
      if (resolved.error) return resolved.error;

      const allowed = requirements.some(([moduleName, action]) =>
        hasAccess(resolved.rolePermissions, moduleName, action)
      );
      if (!allowed) {
        return res.status(403).json(c_error("Forbidden", res.statusCode));
      }
      next();
    } catch (err) {
      return res.status(500).json(c_error(err.message || "Forbidden", res.statusCode));
    }
  };
};

/**
 * Assign-vendor form loads clients/projects/vendors/users. Roles often grant `assign_vendor` add * without `clients_list` / `projects_list` / `vendor_list` view — allow master-data GET in that case.
 */
const ASSIGN_VENDOR_MASTER_DATA_ALTS = [
  ["assign_vendor", "view"],
  ["assign_vendor", "add"],
  ["assign_vendor", "update"],
  ["assigned_vendors", "view"],
];

/**
 * Relaxed READ access for user directory APIs (GET list / GET :id).
 * Any of these is enough to load users for admin forms, vendor review, etc.
 */
const USER_DIRECTORY_READ_ALTS = [
  ["users_list", "view"],
  ["users_add", "view"],
  ["vendor_hod_review", "view"],
  ["vendor_finance_review", "view"],
  ["roles_list", "view"],
  ["roles_add", "view"],
  ["permissions_assign", "view"],
  ["permissions_manage", "view"],
  ["departments", "view"],
  ["assign_vendor", "view"],
  ["assign_vendor", "add"],
  ["assign_vendor", "update"],
  ["assigned_vendors", "view"],
  ["resource_allocation", "view"],
  ["projects_list", "view"],
  ["projects_add", "view"],
  ["clients_list", "view"],
  ["clients_add", "view"],
  ["vendor_list", "view"],
  ["vendor_add", "view"],
  ["so", "view"],
];

/** GET /api/role — roles dropdown + permission screens need this without strict roles_list-only. */
const ROLE_DIRECTORY_READ_ALTS = [
  ["roles_list", "view"],
  ["roles_add", "view"],
  ["permissions_assign", "view"],
  ["permissions_manage", "view"],
  ["users_list", "view"],
  ["users_list", "update"],
  ["users_add", "add"],
  ["users_add", "update"],
  ["users_add", "view"],
];

/** GET /api/departments — user/department forms and allocations need the list. */
const DEPARTMENT_DIRECTORY_READ_ALTS = [
  ["departments", "view"],
  ["departments", "add"],
  ["users_list", "view"],
  ["users_add", "view"],
  ["resource_allocation", "view"],
  ["assign_vendor", "view"],
  ["assign_vendor", "add"],
  ["assign_vendor", "update"],
  ["assigned_vendors", "view"],
  ["vendor_hod_review", "view"],
  ["vendor_finance_review", "view"],
];

module.exports = {
  checkPermission,
  checkAnyPermission,
  ASSIGN_VENDOR_MASTER_DATA_ALTS,
  USER_DIRECTORY_READ_ALTS,
  ROLE_DIRECTORY_READ_ALTS,
  DEPARTMENT_DIRECTORY_READ_ALTS,
};
