/**
 * Role ↔ module permissions — backed by /api/admin/permissions and /api/admin/modules.
 */

import { authFetch, getBackendBaseUrl } from "./nodeAuthService";
import { getRoles } from "./roleService";

export const PERMS = ["view", "add", "update", "delete"];

const base = () => `${getBackendBaseUrl()}/api/admin`;

async function parseJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.message || json?.error || `Request failed (${res.status})`
    );
  }
  return json;
}

function unwrapData(json) {
  const r = json.results;
  if (r && typeof r === "object" && "data" in r) return r.data;
  return r ?? json;
}

function formatModuleTitle(moduleName) {
  const s = String(moduleName || "").trim();
  if (!s) return "";
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Sub-module key → legacy coarse module key (older roles only had e.g. `vendors` view). */
export const LEGACY_COARSE_PARENT = {
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

export function formatParentSectionLabel(parentModule) {
  if (!parentModule) return "General";
  return formatModuleTitle(parentModule);
}

export function sortPermissionGrid(grid) {
  return [...grid].sort((a, b) => {
    const pa = String(a.parentModule || "")
      .toLowerCase()
      .trim();
    const pb = String(b.parentModule || "")
      .toLowerCase()
      .trim();
    if (pa !== pb) {
      if (!pa) return -1;
      if (!pb) return 1;
      return pa.localeCompare(pb);
    }
    return String(a.moduleSlug || "").localeCompare(String(b.moduleSlug || ""));
  });
}

function isModuleKeyAllowed(allowedSet, moduleKey) {
  const k = String(moduleKey || "")
    .toLowerCase()
    .trim();
  if (!k) return false;
  if (allowedSet.has(k)) return true;
  const legacy = LEGACY_COARSE_PARENT[k];
  return legacy ? allowedSet.has(legacy) : false;
}

/** GET /api/admin/modules — list module master rows (seeds defaults when empty). */
export async function fetchModules() {
  const res = await authFetch(`${base()}/modules`, { method: "GET" });
  const json = await parseJson(res);
  const data = unwrapData(json);
  const list = Array.isArray(data) ? data : [];
  return list;
}

/** GET /api/admin/permissions/me — current user's module permissions. */
export async function fetchMyPermissions() {
  const res = await authFetch(`${base()}/permissions/me`, { method: "GET" });
  const json = await parseJson(res);
  return unwrapData(json);
}

/** GET /api/admin/permissions/roles/:roleId */
export async function fetchRolePermissions(roleId) {
  if (!roleId) {
    return { roleId: null, assigned: false, permissions: [] };
  }
  const res = await authFetch(`${base()}/permissions/roles/${roleId}`, {
    method: "GET",
  });
  const json = await parseJson(res);
  return unwrapData(json);
}

/**
 * Build UI grid rows from module list + stored permissions.
 */
export function mergeModulesWithPermissions(modules, permList) {
  const byId = new Map(
    (permList || []).map((p) => [String(p.moduleId), p])
  );
  const byName = new Map(
    (permList || []).map((p) => [
      String(p.moduleName || "")
        .trim()
        .toLowerCase(),
      p,
    ])
  );

  const rows = modules.map((m) => {
    const id = String(m._id);
    const name = String(m.moduleName || "")
      .trim()
      .toLowerCase();
    const entry = byId.get(id) || byName.get(name);
    const a = entry?.access || {};
    const label =
      (m.description && String(m.description).trim()) ||
      formatModuleTitle(m.moduleName);
    return {
      moduleId: id,
      moduleSlug: name,
      parentModule: m.parentModule || null,
      module: label,
      view: Boolean(a.view),
      add: Boolean(a.add),
      update: Boolean(a.update),
      delete: Boolean(a.delete),
    };
  });
  return sortPermissionGrid(rows);
}

export function buildDefaultGridFromModules(modules) {
  return mergeModulesWithPermissions(modules, []);
}

/**
 * POST /api/admin/permissions/roles/:roleId — replace full permission matrix.
 * @param {Array<{ moduleId: string, view, add, update, delete }>} grid
 */
export async function saveRolePermissions(roleId, grid) {
  const permissions = grid.map((row) => ({
    moduleId: row.moduleId,
    access: {
      view: Boolean(row.view),
      add: Boolean(row.add),
      update: Boolean(row.update),
      delete: Boolean(row.delete),
    },
  }));

  const res = await authFetch(`${base()}/permissions/roles/${roleId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions, replace: true }),
  });
  await parseJson(res);
  return { success: true };
}

export async function resetRolePermissions(roleId) {
  return saveRolePermissions(roleId, []);
}

/** Roles for dropdowns — shape { _id, roleName } for legacy UI. */
export async function fetchPermissionRoles() {
  const list = await getRoles();
  return list.map((r) => ({
    _id: r.id,
    roleName: r.name,
  }));
}

/**
 * Manage page: all roles with merged grids.
 */
export async function fetchAllRolePermissions() {
  const roles = await fetchPermissionRoles();
  const modules = await fetchModules();

  const entries = await Promise.all(
    roles.map(async (role) => {
      const doc = await fetchRolePermissions(role._id);
      const grid = mergeModulesWithPermissions(modules, doc.permissions);
      return { role, grid };
    })
  );

  return entries;
}

/**
 * Build a Set of moduleName keys (lowercase) the user may navigate to (view).
 * @param {string[]|null} permissionList from API
 * @param assigned whether a RolePermissions document exists
 */
export function allowedModuleKeysFromPermissions(assigned, permissionList) {
  if (!assigned) return null;
  const set = new Set();
  for (const p of permissionList || []) {
    const name = String(p.moduleName || "")
      .trim()
      .toLowerCase();
    if (name && p.access?.view) set.add(name);
  }
  return set;
}

/**
 * Filter sidebar groups: drop items whose moduleKey is not allowed (view).
 * When `assigned` is false (no RolePermissions doc), show full menu (legacy).
 */
export function filterMenuByAccess(menuList, assigned, permissions) {
  const allowed = allowedModuleKeysFromPermissions(assigned, permissions);
  if (allowed == null) return menuList;
  return menuList
    .map((group) => {
      const content = (group.content || []).filter((item) => {
        const key = item.moduleKey;
        if (!key) return false;
        return isModuleKeyAllowed(allowed, key);
      });
      return { ...group, content };
    })
    .filter((group) => (group.content || []).length > 0);
}
