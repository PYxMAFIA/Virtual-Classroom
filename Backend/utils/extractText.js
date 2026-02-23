const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");

const normalize = (text) => String(text || "").replace(/\s+/g, " ").trim();

/**
 * Extract text from common classroom upload formats.
 *
 * Supports:
 * - PDF (via pdf-parse)
 * - DOCX (via mammoth)
 * - Plain text fallback
 *
 * @param {Buffer} buffer
 * @param {{ filename?: string, mimeType?: string }} [opts]
 * @returns {Promise<string>}
 */
async function extractText(buffer, opts = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) return "";

  const filename = opts.filename || "";
  const mimeType = opts.mimeType || "";
  const ext = filename ? path.extname(filename).toLowerCase() : "";

  const looksLikePdf = ext === ".pdf" || mimeType === "application/pdf";
  const looksLikeDocx =
    ext === ".docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const looksLikeTxt = ext === ".txt" || mimeType.startsWith("text/");

  try {
    if (looksLikePdf) {
      const parsed = await pdfParse(buffer);
      return normalize(parsed.text);
    }

    if (looksLikeDocx) {
      const result = await mammoth.extractRawText({ buffer });
      return normalize(result.value);
    }

    if (looksLikeTxt) {
      return normalize(buffer.toString("utf8"));
    }

    // Best-effort fallback.
    // For unsupported formats (images, scans, etc.), consider plugging an OCR provider.
    return normalize(buffer.toString("utf8"));
  } catch (err) {
    console.error("❌ extractText failed:", err?.message || err);
    return "";
  }
}

module.exports = { extractText };