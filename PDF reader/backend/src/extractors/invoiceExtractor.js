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

  // Primary rule: immediate next non-empty line after marker.
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    if (!isNoiseLine(line)) {
      return normalizeField(line);
    }

    // Fallback window when immediate line is a merged header/noise line.
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

function buildScopeItem(title, details) {
  const normalizedDetails = details.map((d) => d.trim()).filter(Boolean);
  return {
    title: normalizeField(title),
    details: normalizedDetails,
  };
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

function extractTRN(normalizedText) {
  const trnMatch = normalizedText.match(TRN_REGEX);
  return normalizeField(trnMatch?.[0]);
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

  const scopeItems = extractScopeOfWork(lines, invoiceType);

  const subtotal = extractSubtotal(lines);
  const result = {
    invoiceType,
    invoiceNumber: extractInvoiceNumber(lines),
    clientName: normalizeField(clientName),
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

  if (invoiceType === "PROFORMA") {
    result.trn = extractTRN(normalizedText);
  }

  return result;
}

module.exports = { extractInvoiceFields };
