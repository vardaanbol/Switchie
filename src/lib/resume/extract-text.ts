import mammoth from "mammoth";

export const RESUME_TEXT_MAX_CHARS = 50_000;

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Worker must load before pdf-parse so @napi-rs/canvas polyfills
  // DOMMatrix / ImageData / Path2D exist in Node (Vercel serverless).
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer, CanvasFactory });
  try {
    const parsed = await parser.getText();
    return (parsed.text ?? "").trim();
  } finally {
    await parser.destroy();
  }
}

export async function extractResumeTextFromBuffer(
  buffer: Buffer,
  opts: { fileName?: string; mimeType?: string }
): Promise<string> {
  const name = (opts.fileName ?? "").toLowerCase();
  const mime = opts.mimeType ?? "";

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (
    mime.includes("word") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }

  // Fallback: try PDF then DOCX
  try {
    const text = await extractPdfText(buffer);
    if (text.length > 40) return text;
  } catch {
    /* try docx */
  }

  const result = await mammoth.extractRawText({ buffer });
  return (result.value ?? "").trim();
}

export function capResumeText(text: string, max = RESUME_TEXT_MAX_CHARS): string {
  if (text.length <= max) return text;
  return text.slice(0, max);
}
