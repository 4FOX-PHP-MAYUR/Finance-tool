const GST_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/g;
const TRN_REGEX = /\bTRN\s*[:#-]?\s*(\d+)\b/i;
const AMOUNT_REGEX =
  /\b(?:INR|AED|USD|EUR|Rs\.?|₹)\s*[\d,]+(?:\.\d{1,2})?\b|(?:\d[\d,]*(?:\.\d{1,2})?)/i;
const NOT_FOUND = "Not Found";

/** Fixed standard rate for BO / invoice display (product default). */
const STANDARD_RATE_PERCENT = 5;

function normalizeText(text = "") {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function normalizeField(value) {
  if (!value) return NOT_FOUND;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length ? cleaned : NOT_FOUND;
}

function toLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function detectInvoiceType(normalizedText) {
  if (/Proforma Invoice/i.test(normalizedText)) return "PROFORMA";
  if (/GSTIN/i.test(normalizedText)) return "GST";
  return "GENERIC";
}

function getNextLineAfterMarker(lines, markerRegex) {
  const index = lines.findIndex((line) => markerRegex.test(line));
  if (index === -1) return NOT_FOUND;

  const isNoiseLine = (line) => {
    if (!line) return true;
    if (looksNumericOnly(line)) return true;

    if (
      /(SR\s*NO|Scope\s*of\s*work|Name of Product|HSN|HSN\/SAC|Amount|Taxable Value|CGST|SGST|IGST|Invoice No|Invoice Date|PO No|PO Date|Total)\b/i.test(
        line,
      )
    ) {
      return true;
    }

    if (/^(GSTIN|State Code|Phone|Address)\b/i.test(line)) {
      return true;
    }

    return false;
  };

  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    if (!isNoiseLine(line)) {
      return normalizeField(line);
    }

    for (let j = i + 1; j <= Math.min(i + 8, lines.length - 1); j += 1) {
      const candidate = lines[j];
      if (!candidate) continue;
      if (isNoiseLine(candidate)) continue;
      return normalizeField(candidate);
    }
    break;
  }

  return NOT_FOUND;
}

function looksNumericOnly(line) {
  return /^[\d\s,.\-₹$%]+$/.test(line) || /^(IGST|CGST|SGST)\b/i.test(line);
}

/**
 * @param {string|null|undefined} taxAmount - Tax column (numeric when parsed from PDF table).
 * @param {string|null|undefined} totalAmount - Amount column (line amount before/excluding invoice grand total).
 */
function buildScopeItem(title, details, taxAmount = null, totalAmount = null) {
  const normalizedDetails = details.map((d) => d.trim()).filter(Boolean);
  const out = {
    title: normalizeField(title),
    details: normalizedDetails,
  };
  if (taxAmount != null && Number.isFinite(taxAmount)) {
    out.taxAmount = taxAmount;
  }
  if (totalAmount != null && Number.isFinite(totalAmount)) {
    out.totalAmount = totalAmount;
  }
  return out;
}

/** Detect `# Item & Description` + `Tax` + `Amount` style SOW tables (PDF text order). */
function findSowTableHeaderIndex(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    const window = [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(" ");
    if (!/item\s*&\s*description|item\s+and\s+description/i.test(window)) continue;
    if (!/\btax\b/i.test(window)) continue;
    if (!/\bamount\b/i.test(window)) continue;
    if (/grand\s*total|total\s*amount\s*payable|amount\s*due/i.test(window)) continue;
    return i;
  }
  return -1;
}

/**
 * Last two decimal numbers on a line (Tax column, then Amount column), e.g. "2,500.00 50,000.00".
 */
function extractTwoTrailingAmounts(line) {
  const s = line.trim();
  if (!s) return null;
  const re = /([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s*$/;
  const m = s.match(re);
  if (!m) return null;
  const tax = toNumericAmount(m[1]);
  const amt = toNumericAmount(m[2]);
  if (tax === null || amt === null) return null;
  const before = s.slice(0, s.length - m[0].length).trim();
  return { tax, amount: amt, before };
}

/**
 * Parse SOW rows when the PDF exposes a table: Item & Description | Tax | Amount.
 */
function extractScopeFromSowTaxAmountTable(lines) {
  const headerIdx = findSowTableHeaderIndex(lines);
  if (headerIdx === -1) return [];

  const items = [];
  let i = headerIdx + 1;

  const isFooter = (line) =>
    /^(?:Total|Grand\s*Total|Sub\s*Total|Tax\s*Summary|Payment\s*Terms|Terms\s*&|Bank\s*Details)\b/i.test(
      line.trim(),
    );

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i += 1;
    if (i >= lines.length) break;
    if (isFooter(lines[i])) break;

    const rowMatch = lines[i].match(/^(\d+)[.)-]?\s+(.+)$/);
    if (!rowMatch) {
      i += 1;
      continue;
    }

    const rowLabel = rowMatch[1];
    const title = rowMatch[2].trim();
    const details = [];
    i += 1;

    let taxAmount = null;
    let totalAmount = null;

    while (i < lines.length) {
      const L = lines[i];
      if (!L.trim()) {
        i += 1;
        continue;
      }
      if (isFooter(L)) break;

      const two = extractTwoTrailingAmounts(L);
      if (two) {
        taxAmount = two.tax;
        totalAmount = two.amount;
        if (two.before) {
          details.push(two.before);
        }
        i += 1;
        break;
      }

      const nextRow = L.match(/^(\d+)[.)-]?\s+/);
      if (nextRow && Number(nextRow[1]) !== Number(rowLabel)) {
        break;
      }

      details.push(L);
      i += 1;
    }

    items.push(buildScopeItem(title, details, taxAmount, totalAmount));
  }

  return items;
}

function extractScopeFromGstTable(lines) {
  const headerIndex = lines.findIndex((line) =>
    /(Scope\s*of\s*work|Name of Product\s*\/\s*Services)/i.test(line),
  );
  if (headerIndex === -1) return [];

  const captured = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^(Total|Grand Total|Payment Method|Note|Taxable Value|Amount)\b/i.test(line)) break;
    if (!line || looksNumericOnly(line) || line.length < 3) continue;
    captured.push(line);
  }

  if (!captured.length) return [];
  return [buildScopeItem(captured[0], captured.slice(1))];
}

function extractScopeFromProforma(lines) {
  const headerIndex = lines.findIndex((line) =>
    /(Item\s*&\s*Description|Description|Services)/i.test(line),
  );
  if (headerIndex === -1) return [];

  const items = [];
  let current = null;

  const commit = () => {
    if (current?.title && current.title !== NOT_FOUND) {
      items.push(buildScopeItem(current.title, current.details));
    }
  };

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^(Total|Grand Total|Terms|Bank Details|Payment)\b/i.test(line)) break;
    if (!line || looksNumericOnly(line)) continue;

    const numbered = line.match(/^(\d+)[.)-]?\s*(.*)$/);
    if (numbered) {
      commit();
      current = {
        title: numbered[2] ? numbered[2].trim() : `Service ${numbered[1]}`,
        details: [],
      };
      continue;
    }

    const bullet = line.match(/^[*-]\s+(.*)$/);
    if (bullet) {
      if (!current) current = { title: "Service", details: [] };
      current.details.push(bullet[1].trim());
      continue;
    }

    if (!current) {
      current = { title: line, details: [] };
      continue;
    }

    if (!current.title || current.title === "Service") {
      current.title = line;
    } else {
      current.details.push(line);
    }
  }

  commit();
  return items;
}

function extractGenericScope(lines) {
  const headerIndex = lines.findIndex((line) =>
    /^(Description|Services?|Item\s*&\s*Description|Scope of Work)$/i.test(line),
  );
  if (headerIndex === -1) return [];

  const collected = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^(Total|Grand Total|Amount|Tax)\b/i.test(line)) break;
    if (!line || looksNumericOnly(line)) continue;
    collected.push(line);
  }

  if (!collected.length) return [];
  return [buildScopeItem(collected[0], collected.slice(1))];
}

function extractScopeOfWork(lines, invoiceType) {
  const fromSowTable = extractScopeFromSowTaxAmountTable(lines);
  if (fromSowTable.length) return fromSowTable;

  if (invoiceType === "GST") return extractScopeFromGstTable(lines);
  if (invoiceType === "PROFORMA") return extractScopeFromProforma(lines);
  return extractGenericScope(lines);
}

function extractGstFields(normalizedText, lines) {
  const allGsts = normalizedText.match(GST_REGEX) || [];
  const companyGST = allGsts[0] || NOT_FOUND;

  let clientGST = NOT_FOUND;
  const invoiceToIndex = lines.findIndex((line) => /^Invoice To\b/i.test(line));
  if (invoiceToIndex !== -1) {
    for (let i = invoiceToIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^(Bill To|Ship To|Invoice Date|Order ID|Total|Product)\b/i.test(line)) break;
      const match = line.match(GST_REGEX);
      if (match?.[0]) {
        clientGST = match[0];
        break;
      }
    }
  }

  if (clientGST === NOT_FOUND && allGsts.length > 1) {
    clientGST = allGsts[1];
  }

  return {
    companyGST: normalizeField(companyGST),
    clientGST: normalizeField(clientGST),
  };
}

function extractInvoiceNumber(lines) {
  const invoiceLine = lines.find((line) =>
    /(Proforma Invoice#|Proforma Invoice No|Invoice#|Invoice No\b|Invoice Number\b|Inv(?:oice)?\s*#)/i.test(
      line,
    ),
  );
  if (!invoiceLine) return NOT_FOUND;

  const explicit = invoiceLine.match(
    /(Proforma Invoice(?:\s*No)?#?\s*[:#-]?\s*[A-Z0-9-\/]+|Invoice#\s*[:#-]?\s*[A-Z0-9-\/]+|Invoice No\.?\s*[:#-]?\s*[A-Z0-9-\/]+|Invoice Number\s*[:#-]?\s*[A-Z0-9-\/]+|Inv(?:oice)?\s*#\s*[:#-]?\s*[A-Z0-9-\/]+)/i,
  );
  return normalizeField(explicit?.[0] || invoiceLine);
}

function extractSalesPerson(lines) {
  for (const line of lines) {
    const inline = line.match(
      /^(?:Sales\s*Person|Salesperson|Sales\s*Executive|Account\s*Manager)\s*[:#]\s*(.+)$/i,
    );
    if (inline && inline[1]) {
      const v = inline[1].replace(/\s+/g, " ").trim();
      if (v.length) return normalizeField(v);
    }
  }
  const idx = lines.findIndex((line) =>
    /^(?:Sales\s*Person|Salesperson)\s*[:#]?\s*$/i.test(line),
  );
  if (idx !== -1 && lines[idx + 1]) {
    return normalizeField(lines[idx + 1]);
  }
  return NOT_FOUND;
}

function extractPurchaseOrderNumber(lines) {
  for (const line of lines) {
    const inline = line.match(
      /^(?:PO\s*(?:No|#|Number|Ref)?|Purchase\s*Order\s*(?:No|#|Number)?)\s*[:#]?\s*(.+)$/i,
    );
    if (inline && inline[1]) {
      const v = inline[1].replace(/\s+/g, " ").trim();
      if (v.length && !/^date$/i.test(v)) return normalizeField(v);
    }
  }
  const idx = lines.findIndex((line) =>
    /^(?:PO\s*(?:No|#)?|Purchase\s*Order)\s*[:#]?\s*$/i.test(line),
  );
  if (idx !== -1 && lines[idx + 1]) {
    const next = lines[idx + 1].trim();
    if (next && !/^PO\s*Date/i.test(next)) return normalizeField(lines[idx + 1]);
  }
  return NOT_FOUND;
}

/** Fills `purchaseOrderDate` in API; UI label is "Tracking date", PDFs often say "Order date". */
function extractPurchaseOrderDate(lines) {
  const inlinePatterns = [
    /^(?:Order\s*Date)\s*[:#]?\s*(.+)$/i,
    /^(?:PO\s*Date|Purchase\s*Order\s*Date|P\.?O\.?\s*Date)\s*[:#]?\s*(.+)$/i,
  ];
  for (const line of lines) {
    for (const re of inlinePatterns) {
      const inline = line.match(re);
      if (inline && inline[1]) {
        const v = inline[1].replace(/\s+/g, " ").trim();
        if (v.length) return normalizeField(v);
      }
    }
  }
  const orderIdx = lines.findIndex((line) => /^(?:Order\s*Date)\s*[:#]?\s*$/i.test(line));
  if (orderIdx !== -1 && lines[orderIdx + 1]) {
    return normalizeField(lines[orderIdx + 1]);
  }
  const poIdx = lines.findIndex((line) =>
    /^(?:PO\s*Date|Purchase\s*Order\s*Date)\s*[:#]?\s*$/i.test(line),
  );
  if (poIdx !== -1 && lines[poIdx + 1]) {
    return normalizeField(lines[poIdx + 1]);
  }
  return NOT_FOUND;
}

function extractTRN(normalizedText) {
  const trnMatch = normalizedText.match(TRN_REGEX);
  if (trnMatch?.[1]) {
    return normalizeField(String(trnMatch[1]).replace(/\s+/g, ""));
  }
  return NOT_FOUND;
}

/**
 * Lines between Invoice To / Bill To and the next structural field (GST, TRN, table, etc.).
 */
function extractInvoiceToRegionLines(lines) {
  const markerIdx = lines.findIndex(
    (l) => /^Invoice To\b/i.test(l) || /^Bill To\b/i.test(l),
  );
  if (markerIdx === -1) return [];
  const region = [];
  for (let i = markerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (/^(Invoice To|Bill To|Ship To)\b/i.test(line)) break;
    if (GST_REGEX.test(line)) break;
    if (/^TRN\s*[:#-]?/i.test(line)) break;
    if (/^(Phone|Mobile|Email|GSTIN|State Code|Place of Supply|Pincode|PIN)\b/i.test(line)) break;
    if (/^(SR\s*NO|Scope\s*of\s*work|Item|Description|Total|Grand)\b/i.test(line)) break;
    if (region.length >= 15) break;
    region.push(line);
  }
  return region;
}

/**
 * Address lines after client name in the Invoice To / Bill To block.
 */
function extractClientAddress(lines, clientNameLine) {
  const region = extractInvoiceToRegionLines(lines);
  if (region.length <= 1) return NOT_FOUND;

  const nameNorm =
    clientNameLine && clientNameLine !== NOT_FOUND ? String(clientNameLine).trim().toLowerCase() : "";

  let addrLines;
  if (nameNorm) {
    const idx = region.findIndex((l) => l.trim().toLowerCase() === nameNorm);
    addrLines = idx !== -1 ? region.slice(idx + 1) : region.slice(1);
  } else {
    addrLines = region.slice(1);
  }

  const joined = addrLines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!joined) return NOT_FOUND;
  return normalizeField(joined.slice(0, 1500));
}

function extractLastAmountFromLine(line) {
  const moneyRegex = /(?:INR|AED|USD|EUR|Rs\.?|₹)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?/g;
  const matches = line.match(moneyRegex) || [];
  if (!matches.length) return null;
  return matches[matches.length - 1].trim();
}

function toNumericAmount(amountText) {
  const cleaned = (amountText || "").replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function extractTotalAmount(lines) {
  const patterns = [
    /Total Amount Payable/i,
    /Total Amount Payble/i,
    /Total Amount Due/i,
    /Amount Due/i,
    /Amount Payable/i,
    /Grand Total/i,
    /Total AED/i,
    /^Total\b/i,
  ];

  const candidates = [];

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const matchesPattern = patterns.some((pattern) => pattern.test(line));
    if (!matchesPattern) continue;

    for (let j = i - 1; j <= i + 2; j += 1) {
      if (j < 0 || j >= lines.length) continue;
      const sourceLine = lines[j];
      if (/\b(TRN|GST|GSTIN|IRN|Invoice\s*#?|Order\s*ID|Phone)\b/i.test(sourceLine)) {
        continue;
      }
      const maybeAmount = extractLastAmountFromLine(lines[j]);
      if (!maybeAmount) continue;
      const numericValue = toNumericAmount(maybeAmount);
      if (numericValue === null) continue;
      const digitsOnly = maybeAmount.replace(/\D/g, "");
      const hasCurrencyHint = /(?:INR|AED|USD|EUR|Rs\.?|₹|,|\.)/i.test(maybeAmount);
      if (!hasCurrencyHint && digitsOnly.length >= 8) continue;
      candidates.push({ text: maybeAmount, value: numericValue, distance: Math.abs(i - j) });
    }
  }

  if (!candidates.length) return NOT_FOUND;

  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return b.value - a.value;
  });

  return normalizeField(candidates[0].text);
}

/**
 * Subtotal / taxable value before tax lines (common invoice labels).
 */
function extractSubtotal(lines) {
  const labelTests = [
    /^Sub\s*Total\b/i,
    /^Subtotal\b/i,
    /Sub\s*Total\s*[:=]/i,
    /^Taxable\s*Value\b/i,
    /Taxable\s*Value\s*[:=]/i,
    /^Amount\s*Before\s*Tax\b/i,
    /^Net\s*Amount\s*\(?Excl/i,
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!labelTests.some((re) => re.test(line))) continue;
    if (/Grand\s*Total|Total\s*Amount\s*Payable/i.test(line)) continue;

    let amt = extractLastAmountFromLine(line);
    if (amt) return normalizeField(amt);
    if (i + 1 < lines.length) {
      amt = extractLastAmountFromLine(lines[i + 1]);
      if (amt && !/^Grand\s*Total/i.test(lines[i + 1])) return normalizeField(amt);
    }
  }

  return NOT_FOUND;
}

/**
 * Parse a money string (e.g. "1,00,000.00", "₹ 5000") to a number.
 */
function parseMoneyAmountString(str) {
  if (!str || str === NOT_FOUND) return null;
  const cleaned = String(str).replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Amount at fixed standard rate % of subtotal.
 */
function computeStandardRateAmount(subtotalStr, ratePercent) {
  const base = parseMoneyAmountString(subtotalStr);
  if (base === null) return NOT_FOUND;
  const amt = (base * ratePercent) / 100;
  return normalizeField(
    amt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  );
}

function extractInvoiceFields(rawText = "") {
  const normalizedText = normalizeText(rawText);
  const lines = toLines(normalizedText);
  const invoiceType = detectInvoiceType(normalizedText);

  const clientFromInvoiceTo = getNextLineAfterMarker(lines, /^Invoice To\b/i);
  const clientFromBillTo = getNextLineAfterMarker(lines, /^Bill To\b/i);
  const clientName =
    clientFromInvoiceTo !== NOT_FOUND ? clientFromInvoiceTo : clientFromBillTo;

  const clientAddress = extractClientAddress(lines, clientName);

  const scopeItems = extractScopeOfWork(lines, invoiceType);

  const subtotal = extractSubtotal(lines);
  const result = {
    invoiceType,
    invoiceNumber: extractInvoiceNumber(lines),
    salesPerson: extractSalesPerson(lines),
    purchaseOrderNumber: extractPurchaseOrderNumber(lines),
    purchaseOrderDate: extractPurchaseOrderDate(lines),
    clientName: normalizeField(clientName),
    clientAddress,
    companyGST: NOT_FOUND,
    clientGST: NOT_FOUND,
    trn: NOT_FOUND,
    subtotal,
    standardRate: normalizeField(`${STANDARD_RATE_PERCENT}%`),
    standardRateAmount: computeStandardRateAmount(subtotal, STANDARD_RATE_PERCENT),
    totalAmount: extractTotalAmount(lines),
    scopeOfWork: scopeItems.length ? scopeItems : [{ title: NOT_FOUND, details: [] }],
  };

  if (invoiceType === "GST") {
    const gstFields = extractGstFields(normalizedText, lines);
    result.companyGST = gstFields.companyGST;
    result.clientGST = gstFields.clientGST;
  }

  const trnFromText = extractTRN(normalizedText);
  if (trnFromText !== NOT_FOUND) {
    result.trn = trnFromText;
  }

  return result;
}

module.exports = { extractInvoiceFields };
