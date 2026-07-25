import mammoth from "mammoth";

export const RESUME_TEXT_MAX_CHARS = 50_000;

export async function extractResumeTextFromBuffer(
  buffer: Buffer,
  opts: { fileName?: string; mimeType?: string }
): Promise<string> {
  const name = (opts.fileName ?? "").toLowerCase();
  const mime = opts.mimeType ?? "";

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return (parsed.text ?? "").trim();
    } finally {
      await parser.destroy();
    }
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
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      const text = (parsed.text ?? "").trim();
      if (text.length > 40) return text;
    } finally {
      await parser.destroy();
    }
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
