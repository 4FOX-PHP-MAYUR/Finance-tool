import { API_BASE_URL } from "../config/api";

const BACKEND_BASE_URL = API_BASE_URL;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getTokenFromResponse(data) {
  // Try common direct token fields first.
  const direct =
    data?.token ||
    data?.idToken ||
    data?.accessToken ||
    data?.access_token ||
    data?.jwt ||
    data?.jwtToken ||
    data?.bearerToken;
  if (isNonEmptyString(direct)) return direct;

  // Then try common nesting patterns.
  const nested =
    data?.data?.token ||
    data?.data?.idToken ||
    data?.data?.accessToken ||
    data?.data?.access_token ||
    data?.result?.token ||
    data?.result?.idToken ||
    data?.result?.accessToken ||
    data?.result?.access_token ||
    data?.auth?.token ||
    data?.auth?.accessToken;
  if (isNonEmptyString(nested)) return nested;

  // Finally, do a bounded recursive search for common token keys.
  const tokenKeys = new Set([
    "token",
    "idToken",
    "accessToken",
    "access_token",
    "jwt",
    "jwtToken",
    "bearerToken",
  ]);

  const seen = new Set();
  const maxDepth = 8;

  function walk(value, depth) {
    if (depth > maxDepth) return null;
    if (!value || typeof value !== "object") return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    for (const [k, v] of Object.entries(value)) {
      if (tokenKeys.has(k) && isNonEmptyString(v)) return v;
      const found = walk(v, depth + 1);
      if (found) return found;
    }
    return null;
  }

  return walk(data, 0);
}

function getExpiresInFromResponse(data) {
  return (
    data?.expiresIn ??
    data?.expires_in ??
    data?.expires ??
    data?.expiresSeconds
  );
}

/** Backend wraps payload in `results.data` (see api/startup/customResponse.js). */
function getResultsData(data) {
  if (!data || typeof data !== "object") return null;
  const inner = data.results?.data ?? data.result?.data ?? data.data;
  return inner && typeof inner === "object" ? inner : null;
}

function parseJwtExpSeconds(token) {
  if (!isNonEmptyString(token)) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const exp = payload?.exp;
    if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - nowSec);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  try {
    const raw = localStorage.getItem("userDetails");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.idToken || parsed?.token || parsed?.accessToken || null;
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Calls your Node backend login endpoint and normalizes the response into
 * the shape expected by this app's Redux auth reducer.
 */
export async function login(email, password) {
  const res = await fetch(`${BACKEND_BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res
    .json()
    .catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.errorMessage ||
      `Login failed (${res.status})`;
    throw new Error(message);
  }

  const token = getTokenFromResponse(data);
  if (!token) {
    // Give a more actionable error to help you adjust token mapping.
    let sampleKeys = [];
    try {
      sampleKeys = data && typeof data === "object" ? Object.keys(data) : [];
    } catch {
      sampleKeys = [];
    }
    const details = sampleKeys.length ? ` Response top-level keys: ${sampleKeys.join(", ")}.` : "";
    throw new Error(
      `Login succeeded but backend did not return a token (expected one of token/idToken/accessToken/jwt).${details}`
    );
  }

  const resultsData = getResultsData(data);
  const userRecord = resultsData?.user;
  let expiresIn =
    getExpiresInFromResponse(data) ?? getExpiresInFromResponse(resultsData);
  const n = Number(expiresIn);
  if (!Number.isFinite(n) || n <= 0) {
    const fromJwt = parseJwtExpSeconds(token);
    expiresIn = fromJwt != null ? fromJwt : undefined;
  } else {
    expiresIn = n;
  }

  return {
    // Match Redux selector: `state.auth.auth.idToken`
    idToken: token,
    email: userRecord?.email || data?.email || email,
    userName:
      userRecord?.userName ||
      userRecord?.name ||
      userRecord?.fullName ||
      "",
    imageUrl:
      userRecord?.imageUrl ||
      userRecord?.avatar ||
      userRecord?.profileImage ||
      "",
    localId:
      (userRecord?._id != null && String(userRecord._id)) ||
      (userRecord?.id != null && String(userRecord.id)) ||
      data?.localId ||
      data?.userId ||
      data?.user_id ||
      "",
    expiresIn:
      typeof expiresIn === "number" && Number.isFinite(expiresIn)
        ? expiresIn
        : undefined,
    refreshToken: data?.refreshToken || data?.refresh_token || "",
  };
}

export async function authFetch(url, options = {}) {
  const headers = { ...(options.headers || {}), ...authHeaders() };
  const res = await fetch(url, { ...options, headers });

  // Note: do NOT auto-redirect on 400 responses like
  // "roleId missing or invalid on session".
  // That error means the user has no role assigned yet; bouncing to /login
  // creates an infinite login loop. Callers should handle it and show UI feedback.

  return res;
}

export function getBackendBaseUrl() {
  return BACKEND_BASE_URL;
}

