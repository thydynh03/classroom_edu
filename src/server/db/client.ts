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
  // connect_timeout để lỗi nhanh thay vì treo. max_pipeline: 0 — tuyệt đối không gửi truy vấn kế tiếp khi truy vấn trước chưa xong (giá trị 1 vẫn cho dồn thêm một truy vấn).
  const serverless = process.env.VERCEL ? { max: 3, max_pipeline: 0, idle_timeout: 5, max_lifetime: 300, connect_timeout: 10 } : { max: 10 };
  // Pooler transaction không giữ prepared statement giữa các truy vấn.
  const viaTransactionPooler = !useSession && (!!process.env.VERCEL || url.includes("pgbouncer=true") || url.includes(":6543"));
  const opts = { ...serverless, prepare: !viaTransactionPooler };
  return { url, opts, client: postgres(url, opts) };
}

const created = globalForDb.pgClient ? null : createClient();
const client = globalForDb.pgClient ?? created!.client;
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });

// postgres.js chỉ giữ riêng kết nối cho sql.begin khi được phép pipeline (connection.js: `sent.length < max_pipeline && onexecute`).
// Với max_pipeline: 0 thì BEGIN chạy trên kết nối không được giữ → UNSAFE_TRANSACTION (LESSONS 2026-10-14).
// Nên trên serverless, transaction chạy trên client riêng max: 1 (postgres.js bỏ kiểm tra khi max = 1)
// và được xếp hàng tuần tự để hai transaction không bao giờ xen lệnh trên cùng một kết nối.
if (created && process.env.VERCEL) {
  const txDb = drizzle(postgres(created.url, { ...created.opts, max: 1 }), { schema, casing: "snake_case" });
  let chain: Promise<unknown> = Promise.resolve();
  db.transaction = ((fn, config) => {
    const run = chain.then(() => txDb.transaction(fn as never, config));
    chain = run.catch(() => undefined);
    return run;
  }) as Db["transaction"];
}
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
