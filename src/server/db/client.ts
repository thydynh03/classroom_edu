import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

function createClient() {
  // postgres() chỉ kết nối khi có truy vấn đầu tiên. Lúc `next build` không có DATABASE_URL,
  // dùng URL giả để import được; khi chạy thật mà thiếu biến thì truy vấn sẽ lỗi rõ ràng.
  //
  // DB_USE_DIRECT_URL="true": app dùng DIRECT_URL (pooler kiểu session, :5432) thay cho DATABASE_URL (pooler transaction, :6543).
  // Lý do (LESSONS 2026-10-13): postgres.js gửi Parse+Describe+Flush rồi chờ trả lời trước khi gửi Bind cho mọi truy vấn có tham số;
  // qua pooler transaction của Supabase (Supavisor) trả lời đó thỉnh thoảng không về, backend đứng ở active/ClientRead và request treo.
  const useSession = process.env.DB_USE_DIRECT_URL === "true" && !!process.env.DIRECT_URL;
  const url = (useSession ? process.env.DIRECT_URL : process.env.DATABASE_URL) ?? "postgres://missing-database-url:5432/missing";
  // Serverless: instance bị đóng băng giữa các request và pooler cắt kết nối rảnh trong lúc đó. idle_timeout đóng kết nối rảnh sớm
  // (cũng để trả backend về cho pooler session, giới hạn 15 trên gói free), max_lifetime thay kết nối định kỳ,
  // connect_timeout để lỗi nhanh thay vì treo. max_pipeline: 1 — không gửi dồn truy vấn trên một kết nối.
  const serverless = process.env.VERCEL ? { max: 2, max_pipeline: 1, idle_timeout: 5, max_lifetime: 300, connect_timeout: 10 } : { max: 10 };
  // Pooler transaction không giữ prepared statement giữa các truy vấn.
  const viaTransactionPooler = !useSession && (!!process.env.VERCEL || url.includes("pgbouncer=true") || url.includes(":6543"));
  return postgres(url, { ...serverless, prepare: !viaTransactionPooler });
}

const client = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
