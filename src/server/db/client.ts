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
  // Serverless: instance bị đóng băng giữa các request, pooler cắt kết nối rảnh trong lúc đó. Nếu giữ kết nối cũ,
  // request đầu tiên sau khi thức dậy ghi vào socket đã chết và treo tới khi function hết giờ (LESSONS 2026-10-12).
  // idle_timeout đóng kết nối rảnh sớm, max_lifetime thay kết nối định kỳ, connect_timeout để lỗi nhanh thay vì treo.
  const serverless = process.env.VERCEL ? { max: 1, idle_timeout: 10, max_lifetime: 300, connect_timeout: 10 } : { max: 10 };
  // Pooler kiểu transaction không giữ prepared statement giữa các truy vấn: trên Vercel luôn tắt, không phụ thuộc đuôi URL.
  const viaPooler = !!process.env.VERCEL || url.includes("pgbouncer=true") || url.includes(":6543");
  return postgres(url, { ...serverless, prepare: !viaPooler });
}

const client = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
