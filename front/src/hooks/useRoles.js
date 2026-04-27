import { useState, useEffect } from "react";
import { getRoles } from "../services/roleService";

// Module-level cache: shared across every component that calls useRoles(),
// so the API is called only once per page session.
let cachedRoles = null;
let rolesPromise = null;

/** Force a fresh fetch on the next render (useful in development). */
export function invalidateRolesCache() {
  cachedRoles = null;
  rolesPromise = null;
}

export function useRoles() {
  const [roles, setRoles] = useState(cachedRoles ?? []);
  const [loading, setLoading] = useState(cachedRoles === null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Already have fresh data — nothing to do.
    if (cachedRoles !== null) {
      setRoles(cachedRoles);
      setLoading(false);
      return;
    }

    // Kick off one shared fetch; subsequent callers reuse the same promise.
    if (!rolesPromise) {
      rolesPromise = getRoles();
    }

    rolesPromise
      .then((data) => {
        cachedRoles = data;
        setRoles(data);
      })
      .catch((err) => {
        rolesPromise = null; // allow retry on next mount
        setError(err.message || "Failed to load roles");
      })
      .finally(() => setLoading(false));
  }, []);

  return { roles, loading, error };
}