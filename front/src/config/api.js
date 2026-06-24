/**
 * API origin for JSON calls and for resolving uploaded asset URLs.
 *
 * If REACT_APP_API_BASE_URL is unset or empty, the SPA uses `window.location.origin`
 * so Create React App's `package.json` "proxy" can forward `/api/*` to the backend.
 */

function resolveApiBaseUrl() {
  const explicit = process.env.REACT_APP_API_BASE_URL;
  if (explicit != null && String(explicit).trim() !== "") {
    return String(explicit).trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    const { hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    // In local development the backend runs on :4195 while the dev server uses another port.
    // Use backend origin directly so uploaded file links (/public/uploads/...) download correctly.
    if (isLocalHost && port && port !== "4195") {
      return "http://127.0.0.1:4195";
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "http://localhost:4195";
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Absolute URL for <img src> when the API stores relative paths (e.g. /public/uploads/users/…).
 * The SPA origin is often different from the API, so bare paths would 404 on the frontend host.
 */
export function resolveUploadedAssetUrl(url) {
  if (url == null) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("data:")) return s;
  // Normalise legacy upload paths.
  // Backend serves uploads under "/public/*" (see api/startup/routes.js).
  let normalized = s;
  if (normalized.startsWith("/uploads/")) {
    normalized = `/public${normalized}`;
  }
  const path = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${API_BASE_URL}${path}`;
}
