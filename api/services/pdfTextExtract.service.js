const pdfParseModule = require("pdf-parse");

function joinPageText(textResult) {
  if (Array.isArray(textResult?.pages) && textResult.pages.length) {
    return textResult.pages.map((page) => page.text || "").join("\n");
  }
  return textResult?.text || "";
}

function pageCountFromResult(textResult, fallbackTotal) {
  if (Array.isArray(textResult?.pages) && textResult.pages.length) {
    return textResult.pages.length;
  }
  return fallbackTotal || 1;
}

async function safeDestroy(parser) {
  if (parser && typeof parser.destroy === "function") {
    try {
      await parser.destroy();
    } catch (_err) {
      /* parser may already be destroyed */
    }
  }
}

function normalizeBuffer(buffer) {
  if (!buffer) return Buffer.alloc(0);
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof Uint8Array) return Buffer.from(buffer);
  if (Array.isArray(buffer)) return Buffer.from(buffer);
  return Buffer.from(buffer);
}

function scoreExtraction(result, expectedPages) {
  if (!result?.rawText?.trim()) return -1;
  const len = result.rawText.length;
  const pages = result.pagesFromResult || 1;
  let score = len;
  if (expectedPages > 1 && pages >= expectedPages) score += 100000;
  else if (expectedPages > 1 && pages < expectedPages) score -= 50000;
  return score;
}

/**
 * pdf-parse v2 — try partial (all pages), full, and page-by-page; keep best result.
 */
async function extractWithPdfParseV2(buffer) {
  const PDFParse = pdfParseModule.PDFParse;
  if (typeof PDFParse !== "function") return null;

  let totalPages = 0;
  const infoParser = new PDFParse({ data: buffer });
  try {
    const info = await infoParser.getInfo();
    totalPages = Number(info?.total) || 0;
  } finally {
    await safeDestroy(infoParser);
  }

  async function readOnce(parseParams) {
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText(parseParams);
      const rawText = joinPageText(textResult);
      const pagesFromResult = pageCountFromResult(textResult, totalPages);
      return { rawText, pagesParsed: totalPages || pagesFromResult, pagesFromResult };
    } finally {
      await safeDestroy(parser);
    }
  }

  const candidates = [];

  if (totalPages > 0) {
    candidates.push(
      await readOnce({
        partial: Array.from({ length: totalPages }, (_item, index) => index + 1),
      }),
    );

    for (let p = 1; p <= totalPages; p += 1) {
      candidates.push(await readOnce({ partial: [p] }));
    }
  }

  candidates.push(await readOnce(undefined));

  let mergedByPage = null;
  if (totalPages > 1) {
    const pageTexts = [];
    for (let p = 1; p <= totalPages; p += 1) {
      const one = await readOnce({ partial: [p] });
      pageTexts.push(one.rawText || "");
    }
    const joined = pageTexts.join("\n");
    if (joined.trim()) {
      mergedByPage = {
        rawText: joined,
        pagesParsed: totalPages,
        pagesFromResult: totalPages,
      };
    }
  }
  if (mergedByPage) candidates.push(mergedByPage);

  let best = null;
  let bestScore = -1;
  for (const c of candidates) {
    if (!c) continue;
    const s = scoreExtraction(c, totalPages);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  return best?.rawText?.trim() ? best : null;
}

async function extractWithPdfParseV1(buffer) {
  const fn =
    typeof pdfParseModule === "function"
      ? pdfParseModule
      : typeof pdfParseModule.default === "function"
        ? pdfParseModule.default
        : null;
  if (!fn) return null;

  const result = await fn(buffer);
  const rawText = result?.text || "";
  if (!rawText.trim()) return null;
  const n = Number(result?.numpages) || 1;
  return { rawText, pagesParsed: n, pagesFromResult: n };
}

/**
 * Extract plain text from every page of a PDF buffer (multi-page safe).
 */
async function extractTextFromPdfBuffer(buffer) {
  const data = normalizeBuffer(buffer);
  if (!data.length) {
    throw new Error("The PDF file is empty.");
  }

  const attempts = [extractWithPdfParseV2, extractWithPdfParseV1];
  let lastError = null;
  let best = null;
  let bestScore = -1;

  for (const attempt of attempts) {
    try {
      const result = await attempt(data);
      if (!result?.rawText?.trim()) continue;
      const s = scoreExtraction(result, result.pagesParsed || 1);
      if (s > bestScore) {
        bestScore = s;
        best = result;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (best) {
    return {
      rawText: best.rawText,
      pagesParsed: best.pagesParsed || 1,
      totalPages: best.pagesParsed || 1,
      textLength: best.rawText.length,
    };
  }

  throw new Error(lastError?.message || "Failed to extract text from PDF.");
}

module.exports = { extractTextFromPdfBuffer };
