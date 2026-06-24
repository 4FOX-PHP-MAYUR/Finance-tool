#!/usr/bin/env node
/**
 * Run on the server after deploy: node scripts/verify-pdf-parse.js
 */
require("dotenv").config();

async function main() {
  console.log("Node:", process.version);

  const pdfParseModule = require("pdf-parse");
  console.log("pdf-parse PDFParse:", typeof pdfParseModule.PDFParse);

  const { extractTextFromPdfBuffer } = require("../services/pdfTextExtract.service");
  const { extractInvoiceFields } = require("../services/invoiceExtractor");

  const sample = `
Proforma Invoice SO-TEST
Bill To Test Client
# Item & Description Tax Amount
1 Influencer Services
1,100.00 22,000.00
2 Influencer Services
400.00 8,000.00
Total AED30,000.00
`;

  const minimalPdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
    "utf8",
  );

  try {
    await extractTextFromPdfBuffer(minimalPdf);
    console.warn("WARN: minimal PDF unexpectedly parsed (ok if non-empty text returned)");
  } catch (err) {
    console.log("minimal PDF rejected (expected):", err.message);
  }

  const fields = extractInvoiceFields(sample);
  console.log("extractInvoiceFields items:", fields.scopeOfWork?.length || 0);
  console.log("verify-pdf-parse: OK");
}

main().catch((err) => {
  console.error("verify-pdf-parse FAILED:", err.message);
  process.exit(1);
});
