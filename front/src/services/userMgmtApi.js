/**
 * User Management API Service
 * Base URL: http://localhost:4195/api/users
 *
 * Soft delete is implemented via DELETE /api/users/:id
 * (backend sets isDeleted: true / deletedAt on the record).
 * Restore is implemented via PATCH /api/users/:id  { isDeleted: false }
 */

import { authFetch } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/users`;

// ── helpers ───────────────────────────────────────────────────────────────────

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const validationMsg =
      Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors.map((e) => e.msg || e.message).filter(Boolean).join(" ")
        : null;
    throw new Error(
      data?.message ||
        data?.error ||
        validationMsg ||
        `Request failed (${res.status})`
    );
  }
  return data;
}

/**
 * Build the request body for POST / PUT endpoints.
 *
 * Strategy:
 *  • File selected  → FormData (multipart/form-data).  Sends the raw binary,
 *    avoiding the ~33 % base64 size inflation that causes "request entity too
 *    large" errors.  Content-Type is intentionally omitted so the browser sets
 *    the correct multipart boundary automatically.
 *  • No file        → plain JSON.
 *
 * Returns { body, headers } ready to spread into authFetch options.
 */
function buildRequest(values) {
  if (values.image instanceof File) {
    const form = new FormData();
    form.append("userName",      values.userName      || "");
    form.append("email",         values.email         || "");
    form.append("mobileNumber",  values.mobileNumber  || "");
    form.append("dob",           values.dob           || "");
    form.append("gender",        values.gender        || "");
    if (values.roleId)        form.append("roleId",        values.roleId);
    if (values.departmentId)  form.append("departmentId",  values.departmentId);
    if (values.password)      form.append("password",      values.password);
    // Append the File object directly — no base64 conversion
    form.append("image", values.image, values.image.name);
    // Do NOT set Content-Type — browser must set it with the multipart boundary
    return { body: form, headers: {} };
  }

  // No file — plain JSON
  const payload = {
    userName:     values.userName,
    email:        values.email,
    mobileNumber: values.mobileNumber,
    dob:          values.dob,
    gender:       values.gender,
    roleId:       values.roleId || undefined,
    departmentId: values.departmentId || undefined,
  };
  if (values.password) payload.password = values.password;
  // Always send imageUrl so the server knows what to do:
  //  • Create              → "" (no image yet)
  //  • Edit, no new file   → existing URL (unchanged) or "" (user removed it)
  payload.imageUrl = values.imageUrl || "";

  return {
    body:    JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

// Normalise every common API response shape to a plain array.
function normalizeUserArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.results?.data))  return data.results.data;
    if (Array.isArray(data.result?.data))   return data.result.data;
    if (Array.isArray(data.data?.data))     return data.data.data;
    const candidate =
      data.users   ??
      data.data    ??
      data.result  ??
      data.results ??
      data.items   ??
      data.list    ??
      data.records;
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/**
 * GET /api/users  →  active (non-deleted) users
 */
export async function getUsers() {
  const res = await authFetch(BASE_URL);
  const data = await handleResponse(res);
  return normalizeUserArray(data);
}

/**
 * GET /api/users?isDeleted=true  →  soft-deleted users only
 * Falls back to an empty array if the backend does not support this param.
 */
export async function getDeletedUsers() {
  const res = await authFetch(`${BASE_URL}?isDeleted=true`);
  const data = await handleResponse(res);
  return normalizeUserArray(data);
}

/**
 * GET /api/users/:id
 */
export async function getUserById(id) {
  const res = await authFetch(`${BASE_URL}/${id}`);
  return handleResponse(res);
}

/**
 * POST /api/users
 */
export async function createUser(values) {
  const { body, headers } = buildRequest(values);
  const res = await authFetch(BASE_URL, { method: "POST", headers, body });
  return handleResponse(res);
}

/**
 * PUT /api/users/:id
 */
export async function updateUser(id, values) {
  const { body, headers } = buildRequest(values);
  const res = await authFetch(`${BASE_URL}/${id}`, { method: "PUT", headers, body });
  return handleResponse(res);
}

/**
 * DELETE /api/users/:id  →  soft delete (backend sets isDeleted / deletedAt)
 *
 * If your backend uses a PATCH-based soft delete instead, replace the body of
 * this function with the commented-out PATCH version below.
 */
export async function softDeleteUser(id) {
  const res = await authFetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

/*  PATCH-based soft delete alternative:
export async function softDeleteUser(id) {
  const res = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isDeleted: true, deletedAt: new Date().toISOString() }),
  });
  return handleResponse(res);
}
*/

/**
 * PATCH /api/users/:id/restore  →  restore a soft-deleted user
 */
export async function restoreUser(id) {
  const res = await authFetch(`${BASE_URL}/${id}/restore`, {
    method: "PATCH",
  });
  return handleResponse(res);
}
