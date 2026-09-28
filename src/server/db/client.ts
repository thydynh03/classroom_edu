import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

function createClient() {
  // postgres() chỉ kết nối khi có truy vấn đầu tiên. Lúc `next build` không có DATABASE_URL,
  // dùng URL giả để import được; khi chạy thật mà thiếu biến thì truy vấn sẽ lỗi rõ ràng.
  const url = process.env.DATABASE_URL ?? "postgres://missing-database-url:5432/missing";
  // Serverless: mỗi instance ít kết nối để không vượt giới hạn của Postgres free.
  // Pooler kiểu transaction (Supabase :6543, pgbouncer) không hỗ trợ prepared statement.
  return postgres(url, { max: process.env.VERCEL ? 2 : 10, prepare: !url.includes("pgbouncer=true") });
}

const client = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
