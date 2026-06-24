/**
 * Assignment API
 * Base URL: http://localhost:4195/api/assignments
 *
 * Payload shape for create / update:
 * {
 *   clientId, projectId, departmentId, taskDescription,
 *   resources: [
 *     {
 *       employeeId: "<ObjectId>",
 *       allocations: [{ startDate, endDate, notes, allocationStatus }]
 *     }
 *   ]
 * }
 */

import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL  = `${API_BASE_URL}/api/assignments`;
const USERS_URL = `${API_BASE_URL}/api/users`;

function extractError(err) {
  const data = err?.response?.data;
  if (data?.message) return new Error(data.message);
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return new Error(data.errors.map((e) => e.msg).filter(Boolean).join(", "));
  }
  return new Error(err?.message || "An unexpected error occurred.");
}

/* ── Assignments ──────────────────────────────────────────── */

export async function fetchAssignments(filters = {}) {
  try {
    const { data } = await axios.get(BASE_URL, {
      headers: authHeaders(),
      params: filters,
    });
    return Array.isArray(data) ? data : data.data ?? data.assignments ?? [];
  } catch (err) {
    throw extractError(err);
  }
}

export async function createAssignment(payload) {
  try {
    const { data } = await axios.post(BASE_URL, payload, {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
    return data.data ?? data;
  } catch (err) {
    throw extractError(err);
  }
}

export async function updateAssignment(id, payload) {
  try {
    const { data } = await axios.put(`${BASE_URL}/${id}`, payload, {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
    return data.data ?? data;
  } catch (err) {
    throw extractError(err);
  }
}

export async function deleteAssignment(id) {
  try {
    const { data } = await axios.delete(`${BASE_URL}/${id}`, {
      headers: authHeaders(),
    });
    return data;
  } catch (err) {
    throw extractError(err);
  }
}

/**
 * GET /api/assignments/calendar?startDate=&endDate=
 * Returns an array of employee-centric calendar entries:
 * [{ employeeId, employeeName, assignments: [{ assignmentId, projectName, startDate, endDate, ... }] }]
 */
/**
 * Validate a single allocation slot for conflicts.
 * Conflict checking is now handled server-side on create/update.
 * This stub keeps existing consumers (AssignmentModal) working without changes.
 */
export async function validateAllocation(payload) {
  try {
    const { data } = await axios.post(`${BASE_URL}/validate`, payload, {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
    return data;
  } catch (err) {
    // If the endpoint doesn't exist yet, treat as no conflict
    if (err?.response?.status === 404) return { conflict: false };
    throw extractError(err);
  }
}

export async function fetchCalendar(startDate, endDate) {
  try {
    const { data } = await axios.get(`${BASE_URL}/calendar`, {
      headers: authHeaders(),
      params: { startDate, endDate },
    });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw extractError(err);
  }
}

/* ── Employees (users) ────────────────────────────────────── */

export async function fetchEmployees() {
  try {
    const { data } = await axios.get(USERS_URL, { headers: authHeaders() });
    const raw = Array.isArray(data)
      ? data
      : data?.results?.data ?? data?.results ?? data?.data ?? data?.users ?? [];

    return raw.map((u) => ({
      _id:          u._id,
      name:         u.userName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown",
      jobTitle:     u.jobTitle || u.designation || "—",
      departmentId: u.departmentId?._id ?? u.departmentId ?? "",
    }));
  } catch (err) {
    throw extractError(err);
  }
}