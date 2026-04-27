/**
 * Employee Assignment — Mock Service
 * Module-level store persists across navigations within the session.
 */
import { INITIAL_ASSIGNMENTS } from "./mockData";

// ── Store ──────────────────────────────────────────────────────
let store = INITIAL_ASSIGNMENTS.map((a) => ({
  ...a,
  allocations: a.allocations.map((al) => ({ ...al })),
}));

let nextAssignmentId = 100;
let nextAllocId = 200;

const delay = (ms = 450) => new Promise((res) => setTimeout(res, ms));

// ── Helpers ────────────────────────────────────────────────────
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** Returns true if [s1,e1] and [s2,e2] overlap (inclusive) */
const rangesOverlap = (s1, e1, s2, e2) =>
  !(new Date(e1) < new Date(s2) || new Date(s1) > new Date(e2));

// ── API Functions ──────────────────────────────────────────────

/** Fetch all assignments, optionally filtered by projectId */
export async function fetchAssignments(projectId = null) {
  await delay(300);
  const results = projectId
    ? store.filter((a) => a.projectId === projectId)
    : store;
  return deepClone(results);
}

/** Create a new assignment */
export async function createAssignment(data) {
  await delay();
  const newAssignment = {
    ...data,
    id: `A${nextAssignmentId++}`,
    allocations: (data.allocations || []).map((al) => ({
      ...al,
      id: `AL${nextAllocId++}`,
    })),
  };
  store.push(newAssignment);
  return deepClone(newAssignment);
}

/** Update an existing assignment */
export async function updateAssignment(id, data) {
  await delay();
  const idx = store.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Assignment not found");
  store[idx] = {
    ...store[idx],
    ...data,
    id, // keep original id
    allocations: (data.allocations || store[idx].allocations).map((al) => ({
      ...al,
      id: al.id || `AL${nextAllocId++}`,
    })),
  };
  return deepClone(store[idx]);
}

/** Delete an assignment */
export async function deleteAssignment(id) {
  await delay(350);
  store = store.filter((a) => a.id !== id);
  return { success: true };
}

/**
 * Synchronous overlap check.
 * Returns true if the employee already has an allocation overlapping [startDate, endDate],
 * optionally excluding a specific assignment (for edit mode).
 */
export function checkOverlap(employeeId, startDate, endDate, excludeAssignmentId = null) {
  for (const assignment of store) {
    if (assignment.employeeId !== employeeId) continue;
    if (excludeAssignmentId && assignment.id === excludeAssignmentId) continue;
    for (const alloc of assignment.allocations) {
      if (rangesOverlap(startDate, endDate, alloc.startDate, alloc.endDate)) {
        return true;
      }
    }
  }
  return false;
}