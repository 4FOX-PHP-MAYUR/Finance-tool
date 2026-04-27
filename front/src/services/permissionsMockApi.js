/**
 * Mock Permissions API
 * Module-level singletons — data persists across navigations for the session.
 * Async delays simulate real network latency.
 */

export const MODULES = ["Users", "Project", "Client", "Department", "Calendar"];
export const PERMS = ["view", "update", "delete"];

export const mockRoles = [
  { _id: "1", roleName: "Admin" },
  { _id: "2", roleName: "Manager" },
  { _id: "3", roleName: "User" },
];

/** Returns a fresh default grid (all false) for all modules */
export const buildDefaultGrid = () =>
  MODULES.map((module) => ({
    module,
    view: false,
    update: false,
    delete: false,
  }));

/**
 * rolePermissionsStore: { [roleId]: GridRow[] }
 * GridRow: { module: string, view: bool, update: bool, delete: bool }
 */
let rolePermissionsStore = {};

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch all roles */
export async function fetchPermissionRoles() {
  await delay(300);
  return [...mockRoles];
}

/**
 * Fetch permissions for a specific role.
 * Returns default grid if not yet assigned.
 */
export async function fetchRolePermissions(roleId) {
  await delay(400);
  return rolePermissionsStore[String(roleId)]
    ? JSON.parse(JSON.stringify(rolePermissionsStore[String(roleId)]))
    : buildDefaultGrid();
}

/** Save (create or overwrite) permissions for a role */
export async function saveRolePermissions(roleId, grid) {
  await delay();
  rolePermissionsStore = {
    ...rolePermissionsStore,
    [String(roleId)]: JSON.parse(JSON.stringify(grid)),
  };
  return { success: true };
}

/** Reset a role's permissions to all-false defaults */
export async function resetRolePermissions(roleId) {
  await delay(400);
  rolePermissionsStore = {
    ...rolePermissionsStore,
    [String(roleId)]: buildDefaultGrid(),
  };
  return { success: true };
}

/**
 * Fetch all role-permission mappings for the manage page.
 * Returns array: [{ role, grid }]
 */
export async function fetchAllRolePermissions() {
  await delay();
  return mockRoles.map((role) => ({
    role,
    grid: rolePermissionsStore[role._id]
      ? JSON.parse(JSON.stringify(rolePermissionsStore[role._id]))
      : buildDefaultGrid(),
    isAssigned: Boolean(rolePermissionsStore[role._id]),
  }));
}