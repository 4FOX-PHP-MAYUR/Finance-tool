/**
 * Role API — real integration with http://localhost:3000/api/role
 * All requests include a JWT Authorization header via authHeaders().
 *
 * Backend response envelope:
 *   { success, message, data, statusCode }
 *
 * GET /         → data: { roles: [...], pagination: {...} }
 * GET /:id      → data: <role object>
 * POST /        → data: <created role>
 * PUT /:id      → data: <updated role>
 * DELETE /:id   → data: null
 */

import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/role`;

function normalizeRole(role) {
  return {
    ...role,
    _id: String(role?._id ?? role?.id ?? ""),
    id: String(role?.id ?? role?._id ?? ""),
    roleName: role?.roleName ?? role?.name ?? "",
    description: role?.description ?? "",
  };
}

function extractError(err) {
  const data = err?.response?.data;

  // Shape 1 — controller error: { message: "...", error: true, code: 400 }
  if (data?.message) return new Error(data.message);

  // Shape 2 — express-validator: { errors: [{ msg: "...", path: "roleName" }] }
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const msgs = data.errors.map((e) => e.msg).filter(Boolean).join(", ");
    if (msgs) return new Error(msgs);
  }

  // Fallback to axios / network message
  return new Error(err?.message || "An unexpected error occurred.");
}

/** GET /api/role  — returns flat array of role objects */
export async function fetchRolesList() {
  try {
    const { data } = await axios.get(`${BASE_URL}?limit=100&page=1`, {
      headers: authHeaders(),
    });
    // Server envelope: { results: { roles: [...], pagination: {...} } }
    const payload = data?.results ?? data?.data ?? data;
    const list = Array.isArray(payload) ? payload : (payload?.roles ?? []);
    return list.map(normalizeRole);
  } catch (err) {
    throw extractError(err);
  }
}

/** GET /api/role/:id  — returns a single role object */
export async function fetchRoleById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/${id}`, {
      headers: authHeaders(),
    });
    return normalizeRole(data?.data ?? data);
  } catch (err) {
    throw extractError(err);
  }
}

/** POST /api/role  — creates a role, returns the created object */
export async function createRole(payload) {
  try {
    const { data } = await axios.post(
      BASE_URL,
      {
        roleName: payload.roleName.trim(),
        description: (payload.description || "").trim(),
      },
      { headers: { ...authHeaders(), "Content-Type": "application/json" } }
    );
    return data?.data ?? data;
  } catch (err) {
    throw extractError(err);
  }
}

/** PUT /api/role/:id  — updates a role, returns the updated object */
export async function updateRole(id, payload) {
  try {
    const { data } = await axios.put(
      `${BASE_URL}/${id}`,
      {
        roleName: payload.roleName.trim(),
        description: (payload.description || "").trim(),
      },
      { headers: { ...authHeaders(), "Content-Type": "application/json" } }
    );
    return data?.data ?? data;
  } catch (err) {
    throw extractError(err);
  }
}

/** DELETE /api/role/:id  — soft-deletes a role */
export async function deleteRole(id) {
  try {
    const { data } = await axios.delete(`${BASE_URL}/${id}`, {
      headers: authHeaders(),
    });
    return data;
  } catch (err) {
    throw extractError(err);
  }
}