import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest } from "@/lib/api/errors";

/** Private local storage. Files are never served statically; keys are generated, never user-supplied. */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? ".storage");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/png", ext: "png", test: (b) => b.length > 8 && b[0] === 0x89 && b.subarray(1, 4).toString("latin1") === "PNG" },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

/** Validates by content (magic bytes), not by the client-declared type or extension. */
export function validateUpload(buf: Buffer, opts: { allowImagesOnly?: boolean } = {}): { mime: string; ext: string } {
  if (buf.length === 0) throw badRequest("The file is empty.");
  if (buf.length > MAX_UPLOAD_BYTES) throw badRequest("File is too large (max 5 MB).");
  const hit = SIGNATURES.find((s) => s.test(buf));
  if (!hit || (opts.allowImagesOnly && hit.mime === "application/pdf")) throw badRequest(opts.allowImagesOnly ? "Only PNG, JPEG or WebP images are allowed." : "Only PDF, PNG, JPEG or WebP files are allowed.");
  return { mime: hit.mime, ext: hit.ext };
}

function resolveKey(key: string): string {
  if (!/^[0-9a-f-]{36}\.[a-z]{3,4}$/.test(key)) throw badRequest("Invalid file key.");
  return path.join(ROOT, key);
}

export async function putFile(buf: Buffer, ext: string): Promise<string> {
  const key = `${randomUUID()}.${ext}`;
  await mkdir(ROOT, { recursive: true });
  await writeFile(resolveKey(key), buf, { mode: 0o600 });
  return key;
}
export async function getFile(key: string): Promise<Buffer> { return readFile(resolveKey(key)); }
export async function removeFile(key: string): Promise<void> { try { await unlink(resolveKey(key)); } catch { /* already gone */ } }
