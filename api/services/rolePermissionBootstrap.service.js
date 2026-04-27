const mongoose = require("mongoose");
const { db } = require("../startup/commonModules");

const RolePermissionModel = db.rolePermission;
const ModuleModel = db.module;

const normalizeModuleName = (moduleName) =>
  String(moduleName || "").trim().toLowerCase();

/**
 * Seed minimal RolePermissions for roles that must work before an admin assigns modules
 * (same rules as getMyPermissions). Returns the updated document or null.
 */
async function ensureDefaultRolePermissionsIfMissing(roleId, roleName) {
  const rn = String(roleName || "").trim().toLowerCase();
  if (!roleId || !rn) return null;

  const defaultViewModulesByRole = {
    hod: ["dashboard", "vendor_hod_review"],
  };

  const moduleNames = defaultViewModulesByRole[rn];
  if (!Array.isArray(moduleNames) || moduleNames.length === 0) return null;

  const defaultModuleMeta = {
    dashboard: { description: "Dashboard", parentModule: null },
    vendor_hod_review: { description: "Vendor — HOD review", parentModule: "vendors" },
  };
  for (const rawName of moduleNames) {
    const name = normalizeModuleName(rawName);
    const meta = defaultModuleMeta[name] || { description: name, parentModule: null };
    try {
      await ModuleModel.updateOne(
        { moduleName: name },
        {
          $set: {
            description: meta.description,
            parentModule: meta.parentModule != null ? meta.parentModule : null,
          },
          $setOnInsert: { moduleName: name },
        },
        { upsert: true }
      );
    } catch {
      // ignore
    }
  }

  const modules = await ModuleModel.find({
    moduleName: { $in: moduleNames.map(normalizeModuleName) },
  });
  const byName = new Map(modules.map((m) => [String(m.moduleName), m]));

  const permissions = moduleNames
    .map((name) => {
      const key = normalizeModuleName(name);
      const m = byName.get(key);
      if (!m) return null;
      return {
        moduleId: m._id,
        moduleName: key,
        access: { view: true, add: false, update: false, delete: false },
      };
    })
    .filter(Boolean);

  if (permissions.length === 0) return null;

  return RolePermissionModel.findOneAndUpdate(
    { roleId },
    { roleId, permissions },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function hasAnyAccessFlag(permissions) {
  if (!Array.isArray(permissions) || !permissions.length) return false;
  return permissions.some(
    (p) =>
      p?.access?.view ||
      p?.access?.add ||
      p?.access?.update ||
      p?.access?.delete
  );
}

/**
 * When Admin/Manager (etc.) has no usable RolePermissions row, grant all modules so the app is usable.
 * Matches typical seed-rbac intent for those roles.
 */
const STANDARD_USER_VIEW_MODULES = [
  "dashboard",
  "so",
  "assigned_vendors",
  "vendor_hod_review",
  "vendor_finance_review",
  "projects_list",
  "clients_list",
  "vendor_list",
];

async function ensureStandardUserRoleIfMissing(roleId, roleName) {
  const rn = String(roleName || "").trim().toLowerCase();
  if (!roleId || rn !== "user") return null;

  const modules = await ModuleModel.find({
    moduleName: { $in: STANDARD_USER_VIEW_MODULES.map(normalizeModuleName) },
  });
  const byName = new Map(modules.map((m) => [String(m.moduleName), m]));
  const permissions = STANDARD_USER_VIEW_MODULES.map((name) => {
    const m = byName.get(normalizeModuleName(name));
    if (!m) return null;
    return {
      moduleId: m._id,
      moduleName: m.moduleName,
      access: { view: true, add: false, update: false, delete: false },
    };
  }).filter(Boolean);

  if (!permissions.length) return null;

  return RolePermissionModel.findOneAndUpdate(
    { roleId },
    { roleId, permissions },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensurePrivilegedRoleFullAccessIfMissing(roleId, roleName) {
  const rn = String(roleName || "").trim().toLowerCase();
  if (!roleId || !rn) return null;

  const fullAccessRoles = new Set(["admin", "super admin", "superadmin"]);
  const managerLikeRoles = new Set(["manager"]);

  const isFull = fullAccessRoles.has(rn);
  const isManager = managerLikeRoles.has(rn);
  if (!isFull && !isManager) return null;

  const modules = await ModuleModel.find().lean();
  if (!modules.length) return null;

  const permissions = modules.map((m) => ({
    moduleId: m._id,
    moduleName: m.moduleName,
    access: isManager
      ? { view: true, add: true, update: true, delete: false }
      : { view: true, add: true, update: true, delete: true },
  }));

  return RolePermissionModel.findOneAndUpdate(
    { roleId },
    { roleId, permissions },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Roles that never got a RolePermissions row (or only false flags): view-only on all modules
 * so directory APIs work until an admin assigns a proper matrix.
 */
async function ensureViewAllModulesForUnconfiguredRole(roleId) {
  const modules = await ModuleModel.find().lean();
  if (!modules.length) return null;
  const permissions = modules.map((m) => ({
    moduleId: m._id,
    moduleName: m.moduleName,
    access: { view: true, add: false, update: false, delete: false },
  }));
  return RolePermissionModel.findOneAndUpdate(
    { roleId },
    { roleId, permissions },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Load RolePermissions for authz checks, applying the same bootstrap as GET …/permissions/me
 * so permission checks do not 403 before rows exist (HOD, Admin/Manager with empty DB).
 */
async function loadRolePermissionsForAuth(roleId) {
  const oid = new mongoose.Types.ObjectId(roleId);
  let doc = await RolePermissionModel.findOne({ roleId: oid });
  if (hasAnyAccessFlag(doc?.permissions)) return doc;

  const RoleModel = db.role;
  const role = await RoleModel.findById(oid).select("roleName").lean();

  await ensureDefaultRolePermissionsIfMissing(oid, role?.roleName);
  doc = await RolePermissionModel.findOne({ roleId: oid });
  if (hasAnyAccessFlag(doc?.permissions)) return doc;

  await ensurePrivilegedRoleFullAccessIfMissing(oid, role?.roleName);
  doc = await RolePermissionModel.findOne({ roleId: oid });
  if (hasAnyAccessFlag(doc?.permissions)) return doc;

  await ensureStandardUserRoleIfMissing(oid, role?.roleName);
  doc = await RolePermissionModel.findOne({ roleId: oid });
  if (hasAnyAccessFlag(doc?.permissions)) return doc;

  await ensureViewAllModulesForUnconfiguredRole(oid);
  return RolePermissionModel.findOne({ roleId: oid });
}

module.exports = {
  ensureDefaultRolePermissionsIfMissing,
  loadRolePermissionsForAuth,
};
