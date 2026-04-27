const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { extractInvoiceFields } = require("./extractors/invoiceExtractor");

const app = express();
const PORT = Number(process.env.PORT) || 6000;
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    if (!isPdf) {
      return cb(new Error("Only PDF files are allowed."));
    }

    cb(null, true);
  },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/upload", upload.single("invoice"), async (req, res) => {
  let parser;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PDF file." });
    }

    parser = new PDFParse({ data: req.file.buffer });

    // Explicitly parse all pages so multi-page invoices are fully covered.
    const info = await parser.getInfo();
    const totalPages = Number(info?.total) || 0;
    const parseParams =
      totalPages > 0
        ? { partial: Array.from({ length: totalPages }, (_item, index) => index + 1) }
        : undefined;

    const textResult = await parser.getText(parseParams);
    const rawText =
      (Array.isArray(textResult?.pages) && textResult.pages.length
        ? textResult.pages.map((page) => page.text || "").join("\n")
        : textResult?.text) || "";

    // Helpful debug log for malformed extraction issues.
    console.log(`[upload] Parsed ${totalPages || "unknown"} pages, text length: ${rawText.length}`);

    const extracted = extractInvoiceFields(rawText);
    const pagesParsed = totalPages || textResult?.pages?.length || 1;

    return res.json({
      ...extracted,
      pagesParsed,
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || "Failed to parse PDF.",
    });
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
});

app.use((error, _req, res, _next) => {
  return res.status(400).json({ error: error.message || "Request failed." });
});

app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});
