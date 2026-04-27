const Client = require("../models/client.model");

const NOT_FOUND = "Not Found";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Trim and collapse internal whitespace (case-insensitive matching uses lowercase key).
 */
function normalizeClientNameKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Normalize extracted text for storage (trim, collapse spaces; cap length for safety).
 */
function sanitizeClientNameForModel(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500)
    .trim();
}

function sanitizeClientAddress(val) {
  if (val == null || val === NOT_FOUND) return null;
  const s = String(val).trim().replace(/\s+/g, " ");
  if (!s) return null;
  return s.slice(0, 2000);
}

function sanitizeTrn(val) {
  if (val == null || val === NOT_FOUND) return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.slice(0, 64);
}

/**
 * Fill empty `clientAddress` / `trn` on a client from invoice extraction (no overwrite if already set).
 */
async function mergeClientInvoiceFields(client, { clientAddress, trn }) {
  const addr = sanitizeClientAddress(clientAddress);
  const trnVal = sanitizeTrn(trn);
  let changed = false;
  if (addr && !client.clientAddress) {
    client.clientAddress = addr;
    changed = true;
  }
  if (trnVal && !client.trn) {
    client.trn = trnVal;
    changed = true;
  }
  if (changed) {
    await client.save();
  }
}

/**
 * Same merge rules by client id (used after PATCH when invoice is saved).
 */
async function mergeClientFromInvoiceData(clientId, { clientAddress, trn }) {
  if (!clientId) return;
  const client = await Client.findOne({ _id: clientId, status: true });
  if (!client) return;
  await mergeClientInvoiceFields(client, { clientAddress, trn });
}

function isMissingExtractedName(val) {
  return !val || val === NOT_FOUND || String(val).trim() === "";
}

/**
 * Find an active client whose stored name matches case-insensitively with flexible spacing (legacy rows without clientNameKey).
 */
async function findLegacyClientByNormalizedName(sanitized) {
  const parts = sanitized.split(/\s+/).filter(Boolean).map(escapeRegex);
  if (!parts.length) return null;
  const rx = new RegExp(`^${parts.join("\\s+")}$`, "i");
  return Client.findOne({ status: true, clientName: rx });
}

/**
 * Find existing client or create one from invoice import. Matching is case-insensitive; whitespace is normalized.
 * Optional `clientAddress` and `trn` are stored on new clients and merged into existing clients when those fields are empty.
 * @returns {{ client: import('mongoose').Document | null, clientExtractionFailed: boolean, systemError?: boolean, error?: string }}
 */
async function resolveClientForInvoicePdf(extractedClientName, extras = {}) {
  if (isMissingExtractedName(extractedClientName)) {
    return {
      client: null,
      clientExtractionFailed: true,
      error: "Client name could not be extracted from the PDF.",
    };
  }

  const sanitized = sanitizeClientNameForModel(extractedClientName);
  if (!sanitized) {
    return {
      client: null,
      clientExtractionFailed: true,
      error: "Extracted client name contained no valid characters after sanitization.",
    };
  }

  const key = normalizeClientNameKey(sanitized);

  try {
    let client = await Client.findOne({ status: true, clientNameKey: key });
    if (!client) {
      client = await findLegacyClientByNormalizedName(sanitized);
      if (client && !client.clientNameKey) {
        client.clientNameKey = key;
        await client.save();
      }
    }

    if (client) {
      await mergeClientInvoiceFields(client, extras);
      return { client, clientExtractionFailed: false };
    }

    try {
      const createPayload = {
        clientName: sanitized,
        invoiceImportSource: true,
      };
      const addr = sanitizeClientAddress(extras.clientAddress);
      const trnVal = sanitizeTrn(extras.trn);
      if (addr) createPayload.clientAddress = addr;
      if (trnVal) createPayload.trn = trnVal;

      client = await Client.create(createPayload);
      return { client, clientExtractionFailed: false };
    } catch (err) {
      if (err && err.code === 11000) {
        const again = await Client.findOne({ status: true, clientNameKey: key });
        if (again) {
          await mergeClientInvoiceFields(again, extras);
          return { client: again, clientExtractionFailed: false };
        }
      }
      throw err;
    }
  } catch (err) {
    return {
      client: null,
      clientExtractionFailed: false,
      systemError: true,
      error: err.message || "Failed to resolve or create client.",
    };
  }
}

module.exports = {
  resolveClientForInvoicePdf,
  mergeClientFromInvoiceData,
  normalizeClientNameKey,
  sanitizeClientNameForModel,
  NOT_FOUND,
};
