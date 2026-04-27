/**
 * Mock Department Management API
 * Module-level singleton — data persists across navigations for the session.
 * Async delays simulate real network latency.
 */

let nextId = 4;

let mockDepartments = [
  {
    id: 1,
    departmentName: "Human Resources",
    departmentDescription: "Handles recruitment and employee relations",
  },
  {
    id: 2,
    departmentName: "IT",
    departmentDescription: "Manages technical infrastructure",
  },
  {
    id: 3,
    departmentName: "Finance",
    departmentDescription: "",
  },
];

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMockDepartments() {
  await delay();
  return [...mockDepartments];
}

export async function fetchMockDepartmentById(id) {
  await delay(400);
  const dept = mockDepartments.find((d) => d.id === Number(id));
  if (!dept) throw new Error("Department not found");
  return { ...dept };
}

export async function createMockDepartment(payload) {
  await delay();
  const newDept = {
    id: nextId++,
    departmentName: payload.departmentName.trim(),
    departmentDescription: (payload.departmentDescription || "").trim(),
  };
  mockDepartments = [...mockDepartments, newDept];
  return newDept;
}

export async function updateMockDepartment(id, payload) {
  await delay();
  const index = mockDepartments.findIndex((d) => d.id === Number(id));
  if (index === -1) throw new Error("Department not found");
  const updated = {
    ...mockDepartments[index],
    departmentName: payload.departmentName.trim(),
    departmentDescription: (payload.departmentDescription || "").trim(),
  };
  mockDepartments = mockDepartments.map((d) => (d.id === Number(id) ? updated : d));
  return updated;
}

export async function deleteMockDepartment(id) {
  await delay(400);
  const exists = mockDepartments.some((d) => d.id === Number(id));
  if (!exists) throw new Error("Department not found");
  mockDepartments = mockDepartments.filter((d) => d.id !== Number(id));
  return { success: true };
}