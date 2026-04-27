/**
 * Role Service — real API integration.
 * Single source of truth for role data across the entire application.
 * Endpoint: GET /api/admin/role
 */

import { authFetch, getBackendBaseUrl } from "./nodeAuthService";

/**
 * Fetch all roles from the API.
 * Returns a normalised array of  { id, name }  objects regardless of the
 * exact shape the backend sends (bare array, or common wrapper keys).
 */
export async function getRoles() {
  // Backend defaults to limit=10 (max 100). Request the max so dropdowns list all roles.
  const url = `${getBackendBaseUrl()}/api/admin/role?limit=100&page=1`;
  const res = await authFetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Failed to load roles (${res.status})`
    );
  }

  // Server envelope: { results: { roles: [...], pagination: {...} } }
  // Some responses may put a bare array on `results`.
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.results)
    ? data.results
    : (data.results?.roles ??
      data.roles ??
      data.data ??
      data.result ??
      data.items ??
      []);

  // Normalise to { id, name } — the shape expected by every UI component.
  // Prioritise _id (MongoDB ObjectId) over any virtual "id" field, because
  // user records store roleId as the MongoDB _id reference.
  return list.map((r) => ({
    id:   String(r._id ?? r.id ?? ""),
    name: r.name ?? r.roleName ?? r.role_name ?? r.title ?? "",
  }));
}