const PDFDocument = require("pdfkit");

function formatMoneyLine(value) {
  if (value == null || value === "") return "—";
  return String(value);
}

/**
 * Build a PDF buffer with invoice fields and scope of work (summary export; not the original upload file).
 */
function buildInvoiceSummaryPdf(doc) {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ margin: 50, size: "A4" });
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.fontSize(18).text("Scope of Work (SOW)", { underline: true });
    pdf.moveDown(0.35);
    pdf.fontSize(10).fillColor("#444444").text("Invoice summary (generated PDF)");
    pdf.fillColor("#000000");
    pdf.moveDown(1);

    pdf.fontSize(11);
    pdf.text(`Original file: ${plain.originalFileName || "—"}`);
    pdf.text(`Client: ${plain.clientName || "—"}`);
    pdf.text(`Project: ${plain.projectName || "—"}`);
    pdf.text(`BO no: ${plain.boNo || "—"}`);
    pdf.text(`Address: ${plain.clientAddress || "—"}`);
    pdf.text(`SO No: ${plain.invoiceNumber || "—"}`);
    pdf.text(`Purchase No.: ${plain.purchaseOrderNumber || "—"}`);
    pdf.text(`Order Date: ${plain.purchaseOrderDate || "—"}`);
    pdf.text(`Sales person: ${plain.salesPerson || "—"}`);
    pdf.text(`TRN: ${plain.trn || "—"}`);
    pdf.moveDown(0.5);
    pdf.text(`Subtotal: ${plain.subtotal != null ? String(plain.subtotal) : "—"}`);
    const pct = plain.standardRatePercent ?? 5;
    pdf.text(
      `Standard rate (${pct}%): ${plain.standardRateAmount != null ? String(plain.standardRateAmount) : "—"}`,
    );
    pdf.text(`Total amount: ${plain.totalAmount != null ? String(plain.totalAmount) : "—"}`);

    pdf.moveDown(1);
    pdf.fontSize(13).text("Scope of Work details", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10);

    const scope = plain.scopeOfWork || [];
    if (!scope.length) {
      pdf.text("No scope items recorded.");
    } else {
      scope.forEach((block, i) => {
        pdf.font("Helvetica-Bold").fontSize(11).text(`${i + 1}. ${block.title || "(Untitled)"}`, {
          width: 500,
        });
        pdf.font("Helvetica").fontSize(10);
        const taxAmt = block.taxAmount != null ? block.taxAmount : block.serviceTax;
        const lineTotal = block.totalAmount != null ? block.totalAmount : block.amount;
        pdf.font("Helvetica").fontSize(9).fillColor("#444444");
        pdf.text(`Tax amount: ${formatMoneyLine(taxAmt)}`, { indent: 12, width: 488 });
        pdf.text(`Total amount: ${formatMoneyLine(lineTotal)}`, { indent: 12, width: 488 });
        pdf.fillColor("#000000").fontSize(10);
        pdf.moveDown(0.15);
        (block.details || []).forEach((line) => {
          pdf.text(`  • ${String(line)}`, { width: 480 });
        });
        pdf.moveDown(0.45);
      });
    }

    pdf.end();
  });
}

module.exports = { buildInvoiceSummaryPdf };
