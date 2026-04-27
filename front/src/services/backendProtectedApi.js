import { authFetch, getBackendBaseUrl } from "./nodeAuthService";

/**
 * Example: authenticated call using the token stored in localStorage.
 * Replace the endpoint with one from your backend.
 */
export async function fetchAdminMe() {
  const url = `${getBackendBaseUrl()}/api/admin/auth/me`;
  const res = await authFetch(url, { method: "GET" });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}

