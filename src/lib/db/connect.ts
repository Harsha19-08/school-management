import mongoose from "mongoose";
import { configureMongoDns } from "./dns";

declare global {
    var __mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}
const cache = (globalThis.__mongoose ??= { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
  if (cache.conn) return cache.conn;
  configureMongoDns(uri);
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 10 });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}

/**
 * Runs `fn` in a transaction when MONGODB_TRANSACTIONS=true (replica set / Atlas), otherwise without one.
 * Callers must make `fn` idempotent/retry-safe (unique indexes + deterministic keys).
 */
export async function withOptionalTransaction<T>(fn: (session: mongoose.ClientSession | undefined) => Promise<T>): Promise<T> {
  await connectDB();
  if (process.env.MONGODB_TRANSACTIONS !== "true") return fn(undefined);
  const session = await mongoose.startSession();
  try {
    let out!: T;
    await session.withTransaction(async () => { out = await fn(session); });
    return out;
  } finally {
    await session.endSession();
  }
}
