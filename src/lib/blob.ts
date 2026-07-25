/**
 * Vercel Blob token. Supports:
 * - `BLOB_READ_WRITE_TOKEN` (recommended / local)
 * - `BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN` (auto-created when the
 *   Blob store connection itself was named BLOB_READ_WRITE_TOKEN)
 */
export function getBlobReadWriteToken(): string | undefined {
  return (
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN?.trim() ||
    undefined
  );
}
