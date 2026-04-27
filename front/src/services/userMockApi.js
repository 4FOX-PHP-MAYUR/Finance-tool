/**
 * Mock User Management API
 * All data lives in a module-level singleton — persists across navigations for the session.
 * Async delays simulate real network latency.
 */

let nextId = 3;

let mockUsers = [
  {
    _id: "1",
    userName: "John Doe",
    email: "john@example.com",
    mobileNumber: "9876543210",
    dob: "1995-06-15",
    gender: "Male",
    password: "Password@123",
    imageUrl: "",
    roleId: "1",
  },
  {
    _id: "2",
    userName: "Jane Smith",
    email: "jane@example.com",
    mobileNumber: "9123456780",
    dob: "1998-02-20",
    gender: "Female",
    password: "Password@123",
    imageUrl: "",
    roleId: "3",
  },
];

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMockUsers() {
  await delay();
  return [...mockUsers];
}

export async function fetchMockUserById(id) {
  await delay(400);
  const user = mockUsers.find((u) => u._id === String(id));
  if (!user) throw new Error("User not found");
  return { ...user };
}

export async function createMockUser(payload) {
  await delay();
  const newUser = {
    _id: String(++nextId),
    userName: payload.userName,
    email: payload.email,
    mobileNumber: payload.mobileNumber,
    dob: payload.dob,
    gender: payload.gender,
    password: payload.password,
    imageUrl: payload.imageUrl || "",
    roleId: payload.roleId || "",
  };
  mockUsers = [...mockUsers, newUser];
  return newUser;
}

export async function updateMockUser(id, payload) {
  await delay();
  const index = mockUsers.findIndex((u) => u._id === String(id));
  if (index === -1) throw new Error("User not found");
  const existing = mockUsers[index];
  const updated = {
    ...existing,
    userName: payload.userName ?? existing.userName,
    email: payload.email ?? existing.email,
    mobileNumber: payload.mobileNumber ?? existing.mobileNumber,
    dob: payload.dob ?? existing.dob,
    gender: payload.gender ?? existing.gender,
    password: payload.password || existing.password,
    imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : existing.imageUrl,
    roleId: payload.roleId ?? existing.roleId,
  };
  mockUsers = mockUsers.map((u) => (u._id === String(id) ? updated : u));
  return updated;
}

export async function deleteMockUser(id) {
  await delay(400);
  const exists = mockUsers.some((u) => u._id === String(id));
  if (!exists) throw new Error("User not found");
  mockUsers = mockUsers.filter((u) => u._id !== String(id));
  return { success: true };
}