/** Bump when extraction logic changes — visible in upload API response for deploy checks. */
const INVOICE_EXTRACTOR_VERSION = "2026-06-19-pagebreak-amounts-v6";
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
/**
 * Merge split label/value lines: "Influencer name :" + "Roman Khan" → one line.
 */
function normalizeScopeDetails(rawLines) {
  const lines = rawLines.map((d) => d.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const labelOnly = line.match(/^([A-Za-z][\w\s]*?)\s*:?\s*$/);
    if (labelOnly && i + 1 < lines.length && !/^[\d,]+(?:\.\d{1,2})?\s*[\d,]/.test(lines[i + 1])) {
      const next = lines[i + 1].trim();
      if (!/^(Influencer|Deliverables|Name|Client|management)\b/i.test(next) || next.includes(":")) {
        out.push(`${labelOnly[1].trim()}: ${next}`);
        i += 1;
        continue;
      }
    }
    if (/^Deliverables\s*:?\s*$/i.test(line) && i + 1 < lines.length) {
      out.push(`Deliverables: ${lines[i + 1].trim()}`);
      i += 1;
      continue;
    }
    out.push(line);
  }
  return out;
}

function buildScopeItem(title, details, taxAmount = null, totalAmount = null) {
  const normalizedDetails = normalizeScopeDetails(details);
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

/** Invoice line amounts use two decimal places, e.g. 1,100.00 or 400.00 */
const MONETARY_AMOUNT_REGEX = /\b(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})\b/g;

function extractMonetaryAmountsFromLine(line) {
  const s = line.trim();
  if (!s) return [];
  const amounts = [];
  const re = new RegExp(MONETARY_AMOUNT_REGEX.source, "g");
  let match;
  while ((match = re.exec(s)) !== null) {
    const value = toNumericAmount(match[1]);
    if (value !== null) {
      amounts.push({ value, index: match.index, text: match[1] });
    }
  }
  return amounts;
}

/**
 * Last two monetary amounts on a line (Tax column, then Amount column).
 * Tolerates watermark/noise text between values, e.g. "400.00 Approved 8,000.00".
 */
function extractTwoTrailingAmounts(line) {
  const s = line.trim();
  if (!s) return null;

  const amounts = extractMonetaryAmountsFromLine(s);
  if (amounts.length < 2) return null;

  const taxEntry = amounts[amounts.length - 2];
  const amountEntry = amounts[amounts.length - 1];
  const before = s.slice(0, taxEntry.index).trim();
  return { tax: taxEntry.value, amount: amountEntry.value, before };
}

/**
 * When tax/amount land on separate lines (common when PDF text columns break).
 */
function extractTwoAmountsFromLinePair(lineA, lineB) {
  const first = extractMonetaryAmountsFromLine(lineA);
  const second = extractMonetaryAmountsFromLine(lineB);
  if (first.length === 1 && second.length === 1) {
    return { tax: first[0].value, amount: second[0].value, before: lineA.slice(0, first[0].index).trim() };
  }
  return null;
}

/** Parse leading row number + title; tolerates "8 Influencer…" and "8Influencer…". */
function parseRowLineParts(line) {
  const trimmed = line.trim();
  let match = trimmed.match(/^(\d+)[.)-]?\s+(.+)$/);
  if (match) {
    return { num: Number(match[1]), title: match[2].trim() };
  }
  match = trimmed.match(/^(\d+)([A-Za-z][\s\S]*)$/);
  if (match) {
    return { num: Number(match[1]), title: match[2].trim() };
  }
  return null;
}

/**
 * Table row titles (e.g. "Influencer Services") — not deliverable detail lines ("1 IG Reel …").
 */
function isTableServiceRowTitle(title) {
  const t = title.trim();
  if (!t || t.length < 3) return false;
  if (/^Influencer\b/i.test(t)) return true;
  if (/^Management\b/i.test(t)) return true;
  if (/\b(?:Services|Fee|Package|Consulting|Production)\b/i.test(t)) return true;
  return false;
}

/**
 * Match a service table row at or after minRowNum (handles multi-page gaps / out-of-order PDF text).
 */
function matchTableRowLine(line, minRowNum) {
  const parts = parseRowLineParts(line);
  if (!parts || parts.num < minRowNum) return null;
  if (!isTableServiceRowTitle(parts.title)) return null;
  return parts;
}

/**
 * Table row numbers are sequential (1, 2, 3…). Detail lines like "1 IG Reel …" must not start a new row.
 */
function isTableRowStartLine(line, expectedRowNum) {
  const matched = matchTableRowLine(line, expectedRowNum);
  if (!matched || matched.num !== expectedRowNum) return null;
  return { rowNum: matched.num, title: matched.title };
}

function isNextTableRowLine(line, currentRowNum) {
  const matched = matchTableRowLine(line, currentRowNum + 1);
  if (!matched || matched.num !== currentRowNum + 1) return false;
  return true;
}

/** True when numbered service rows still appear after index (multi-page continuation). */
function hasMoreServiceRowsAhead(lines, fromIndex, minRowNum) {
  for (let j = fromIndex; j < lines.length; j += 1) {
    const line = lines[j];
    if (!line.trim()) continue;
    if (isSkippableTableGapLine(line, lines, j)) continue;
    if (matchTableRowLine(line, minRowNum)) return true;
  }
  return false;
}

function findRowLineIndex(lines, fromIndex, toIndex, rowNum) {
  for (let j = fromIndex; j < toIndex; j += 1) {
    if (isTableRowStartLine(lines[j], rowNum)) return j;
  }
  return -1;
}

/** Parse one table row starting at rowLineIndex; returns { item, nextIndex }. */
function parseTableRowAt(lines, rowLineIndex, rowNum) {
  const matched = matchTableRowLine(lines[rowLineIndex], rowNum);
  if (!matched || matched.num !== rowNum) return null;

  let title = matched.title;
  const details = [];
  let i = rowLineIndex + 1;
  let taxAmount = null;
  let totalAmount = null;
  let foundAmounts = false;

  const titleAmounts = extractTwoTrailingAmounts(title);
  if (titleAmounts) {
    taxAmount = titleAmounts.tax;
    totalAmount = titleAmounts.amount;
    title = titleAmounts.before || title;
    foundAmounts = true;
  }

  while (i < lines.length) {
    const L = lines[i];
    if (!L.trim()) {
      i += 1;
      continue;
    }

    if (isHardTableEndLine(L)) {
      if (hasMoreServiceRowsAhead(lines, i + 1, rowNum + 1)) {
        i += 1;
        continue;
      }
      break;
    }

    if (isSkippableTableGapLine(L, lines, i)) {
      i += 1;
      continue;
    }

    if (isNextTableRowLine(L, rowNum)) {
      break;
    }

    const two = extractTwoTrailingAmounts(L);
    if (two) {
      taxAmount = two.tax;
      totalAmount = two.amount;
      if (two.before) details.push(two.before);
      i += 1;
      foundAmounts = true;
      continue;
    }

    const pair = i + 1 < lines.length ? extractTwoAmountsFromLinePair(L, lines[i + 1]) : null;
    if (pair) {
      taxAmount = pair.tax;
      totalAmount = pair.amount;
      if (pair.before) details.push(pair.before);
      i += 2;
      foundAmounts = true;
      continue;
    }

    if (foundAmounts && /^(?:[\d,]+(?:\.\d{1,2})?\s*)+$/.test(L.trim())) {
      i += 1;
      continue;
    }

    details.push(L);
    i += 1;
  }

  return {
    item: buildScopeItem(title, details, taxAmount, totalAmount),
    nextIndex: i,
  };
}

function findMaxServiceRowNum(lines, headerIdx) {
  let max = 0;
  for (let j = headerIdx + 1; j < lines.length; j += 1) {
    const matched = matchTableRowLine(lines[j], 1);
    if (matched && matched.num > max) max = matched.num;
  }
  return max;
}

/** Fill in rows present in PDF text but missed by the main pass (e.g. row 8 after Bank Details). */
function recoverMissingTableRows(lines, headerIdx, rowItems) {
  const maxRow = findMaxServiceRowNum(lines, headerIdx);
  if (maxRow <= 0) return [];

  for (let rowNum = 1; rowNum <= maxRow; rowNum += 1) {
    if (rowItems.has(rowNum)) continue;

    const rowIdx = findRowLineIndex(lines, headerIdx + 1, lines.length, rowNum);
    if (rowIdx === -1) continue;

    const parsed = parseTableRowAt(lines, rowIdx, rowNum);
    if (parsed?.item) rowItems.set(rowNum, parsed.item);
  }

  const ordered = [];
  for (let rowNum = 1; rowNum <= maxRow; rowNum += 1) {
    if (rowItems.has(rowNum)) ordered.push(rowItems.get(rowNum));
  }
  return ordered;
}

/** Repeated column header on continuation pages — skip, do not stop parsing. */
function isSowTableHeaderAt(lines, index) {
  const primary = (lines[index] || "").trim();
  // Must be the header row itself — not an amount line whose next lines include a page-break header.
  if (
    !/^#\s*Item/i.test(primary) &&
    !/item\s*&\s*description|item\s+and\s+description/i.test(primary)
  ) {
    return false;
  }
  const window = [lines[index], lines[index + 1], lines[index + 2]].filter(Boolean).join(" ");
  if (!/item\s*&\s*description|item\s+and\s+description/i.test(window)) return false;
  if (!/\btax\b/i.test(window)) return false;
  if (!/\bamount\b/i.test(window)) return false;
  if (/grand\s*total|total\s*amount\s*payable|amount\s*due/i.test(window)) return false;
  return true;
}

/** Lines that end the table (no more deliverable rows after this). */
function isHardTableEndLine(line) {
  return /^(?:Bank\s*Details|Authorized\s*Signature)\b/i.test(line.trim());
}

/**
 * Totals / summary / page noise between table sections on multi-page PDFs.
 * PDF text order often puts page-2 Sub Total before continued rows 5+.
 */
function isSkippableTableGapLine(line, lines, index) {
  const t = line.trim();
  if (!t) return true;
  if (extractTwoTrailingAmounts(t)) return false;
  if (isSowTableHeaderAt(lines, index)) return true;
  if (/^Yet\s+to\s+be\s+Approved$/i.test(t)) return true;
  if (/^\d{1,3}$/.test(t)) return true;
  return /^(?:Sub\s*Total|Standard\s*Rate|Grand\s*Total|Total\s*AED|Total\s*Amount(?:\s*Payable)?|Tax\s*Summary|Payment\s*Terms|Terms\s*[:&]|Order\s*Date|Purchase\s*Order|Sales\s*person)\b/i.test(
    t,
  );
}

/**
 * Parse SOW rows when the PDF exposes a table: Item & Description | Tax | Amount.
 */
function extractScopeFromSowTaxAmountTable(lines) {
  const headerIdx = findSowTableHeaderIndex(lines);
  if (headerIdx === -1) return [];

  const rowItems = new Map();
  let i = headerIdx + 1;
  let expectedRowNum = 1;

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i += 1;
    if (i >= lines.length) break;

    if (isHardTableEndLine(lines[i])) {
      if (hasMoreServiceRowsAhead(lines, i + 1, expectedRowNum)) {
        i += 1;
        continue;
      }
      break;
    }

    if (isSkippableTableGapLine(lines[i], lines, i)) {
      i += 1;
      continue;
    }

    const rowMatch = matchTableRowLine(lines[i], expectedRowNum);
    if (!rowMatch) {
      i += 1;
      continue;
    }

    const parsed = parseTableRowAt(lines, i, rowMatch.num);
    if (!parsed?.item) {
      i += 1;
      continue;
    }

    rowItems.set(rowMatch.num, parsed.item);
    i = parsed.nextIndex;
    expectedRowNum = rowMatch.num + 1;
  }

  return recoverMissingTableRows(lines, headerIdx, rowItems);
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
function extractTermsAndConditions(lines) {
  const startIdx = lines.findIndex((line) =>
    /^Terms\s*(?:&|and)\s*Conditions\b/i.test(line.trim()),
  );
  if (startIdx === -1) return NOT_FOUND;

  const collected = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^(?:Authorized\s*Signature|Bank\s*Details)\b/i.test(line)) break;
    collected.push(line);
  }

  if (!collected.length) return NOT_FOUND;
  return normalizeField(collected.join("\n"));
}

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
    amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
    termsAndConditions: extractTermsAndConditions(lines),
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

module.exports = { extractInvoiceFields, INVOICE_EXTRACTOR_VERSION };
