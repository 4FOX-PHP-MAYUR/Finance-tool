import { authFetch, getBackendBaseUrl } from "./nodeAuthService";

// Role fetching is handled by roleService.js → useRoles hook.

export async function createUser(payload) {
  const url = `${getBackendBaseUrl()}/api/admin/auth/create-user`;
  const res = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export async function fetchUserById(id) {
  const url = `${getBackendBaseUrl()}/api/users/${id}`;
  const res = await authFetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data?.results?.data ?? data?.data ?? data;
}

export async function updateUser(id, payload) {
  const url = `${getBackendBaseUrl()}/api/users/${id}`;
  const res = await authFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export async function fetchUsers() {
  const url = `${getBackendBaseUrl()}/api/users`;
  const res = await authFetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return (
    data?.results?.data ??
    data?.data ??
    (Array.isArray(data) ? data : [])
  );
}

/**
 * Fetch active users belonging to a specific department.
 * Calls GET /api/users/department/:departmentId
 * Returns a plain array of user objects.
 */
export async function fetchUsersByDepartment(departmentId) {
  const url = `${getBackendBaseUrl()}/api/users/department/${departmentId}`;
  const res = await authFetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  // Response shape: { results: { data: [...] } }  — normalise to plain array
  return (
    data?.results?.data ??
    data?.data ??
    (Array.isArray(data) ? data : [])
  );
}

export async function fetchMyProfile() {
  const url = `${getBackendBaseUrl()}/api/users/me`;
  const res = await authFetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data?.results?.data ?? data?.data ?? data;
}

export async function updateMyProfile(payload) {
  const url = `${getBackendBaseUrl()}/api/users/me`;
  const hasImageFile =
    payload &&
    typeof payload === "object" &&
    payload.image &&
    typeof payload.image === "object" &&
    typeof payload.image.name === "string";

  let body;
  let headers;
  if (hasImageFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) return;
      if (value === null) return;
      if (key === "image") {
        formData.append("image", value);
      } else {
        formData.append(key, value);
      }
    });
    body = formData;
    headers = undefined;
  } else {
    body = JSON.stringify(payload);
    headers = { "Content-Type": "application/json" };
  }

  const res = await authFetch(url, { method: "PUT", headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data?.results?.data ?? data?.data ?? data;
}
