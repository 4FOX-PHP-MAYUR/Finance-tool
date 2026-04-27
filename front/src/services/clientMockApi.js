/**
 * Mock Client Management API
 * Module-level singleton — data persists across navigations for the session.
 * Async delays simulate real network latency.
 */

let nextId = 3;

let mockClients = [
  {
    _id: "1",
    clientName: "ABC Pvt Ltd",
    contactPerson: "Rahul Sharma",
    clientEmail: "rahul@abc.com",
    clientMobile: "9876543210",
    clientImage: "",
  },
  {
    _id: "2",
    clientName: "XYZ Enterprises",
    contactPerson: "Neha Verma",
    clientEmail: "neha@xyz.com",
    clientMobile: "9123456780",
    clientImage: "",
  },
];

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMockClients() {
  await delay();
  return [...mockClients];
}

export async function fetchMockClientById(id) {
  await delay(400);
  const client = mockClients.find((c) => c._id === String(id));
  if (!client) throw new Error("Client not found");
  return { ...client };
}

export async function createMockClient(payload) {
  await delay();
  const newClient = {
    _id: String(++nextId),
    clientName: payload.clientName,
    contactPerson: payload.contactPerson,
    clientEmail: payload.clientEmail,
    clientMobile: payload.clientMobile,
    clientImage: payload.clientImage || "",
  };
  mockClients = [...mockClients, newClient];
  return newClient;
}

export async function updateMockClient(id, payload) {
  await delay();
  const index = mockClients.findIndex((c) => c._id === String(id));
  if (index === -1) throw new Error("Client not found");
  const existing = mockClients[index];
  const updated = {
    ...existing,
    clientName: payload.clientName ?? existing.clientName,
    contactPerson: payload.contactPerson ?? existing.contactPerson,
    clientEmail: payload.clientEmail ?? existing.clientEmail,
    clientMobile: payload.clientMobile ?? existing.clientMobile,
    clientImage:
      payload.clientImage !== undefined
        ? payload.clientImage
        : existing.clientImage,
  };
  mockClients = mockClients.map((c) => (c._id === String(id) ? updated : c));
  return updated;
}

export async function deleteMockClient(id) {
  await delay(400);
  const exists = mockClients.some((c) => c._id === String(id));
  if (!exists) throw new Error("Client not found");
  mockClients = mockClients.filter((c) => c._id !== String(id));
  return { success: true };
}