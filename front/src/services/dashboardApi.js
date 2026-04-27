import { authFetch, getBackendBaseUrl } from "./nodeAuthService";

export async function fetchDashboardSummary() {
  const url = `${getBackendBaseUrl()}/api/dashboard/summary`;
  const res = await authFetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data?.results?.data ?? data?.data ?? data;
}

