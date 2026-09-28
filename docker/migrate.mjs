// Chạy khi container khởi động, hoặc trước `next build` trên Vercel (MIGRATIONS_DIR=./drizzle):
// 1) migrate DB, 2) tạo admin đầu tiên nếu có BOOTSTRAP_ADMIN_* và chưa có admin nào.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";

// Migration cần kết nối session (DIRECT_URL), không qua pooler transaction.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] Thiếu DATABASE_URL");
  process.exit(1);
}
try {
  new URL(url);
} catch {
  // Không in mật khẩu: chỉ mô tả lỗi định dạng hay gặp.
  const hints = [];
  if (/^["']|["']$/.test(url)) hints.push("có dấu nháy ở đầu/cuối, hãy bỏ đi");
  if (url.includes("[") || url.includes("]")) hints.push("còn [YOUR-PASSWORD] hoặc dấu [ ]");
  if ((url.match(/@/g) || []).length > 1) hints.push("mật khẩu có '@' chưa đổi thành %40");
  console.error(`[migrate] URL database sai định dạng: ${hints.join("; ") || "kiểm tra lại chuỗi kết nối"}`);
  process.exit(1);
}
const client = postgres(url, { max: 1 });
try {
  await client`create extension if not exists unaccent`;
  await client`create extension if not exists pg_trgm`;
  await migrate(drizzle(client), { migrationsFolder: process.env.MIGRATIONS_DIR ?? "/app/drizzle" });
  console.log("[migrate] xong");

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (username && password) {
    const [{ n }] = await client`select count(*)::int as n from users where role = 'ADMIN'`;
    if (n === 0) {
      if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD cần ít nhất 12 ký tự");
      const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
      await client`insert into users (id, username, full_name, password_hash, role, email_verified_at)
        values (${randomUUID()}, ${username.toLowerCase()}, ${"Quản trị viên"}, ${passwordHash}, 'ADMIN', now())`;
      console.log(`[migrate] đã tạo admin ${username} — hãy xóa BOOTSTRAP_ADMIN_PASSWORD khỏi env sau khi đăng nhập`);
    }
  }
} catch (e) {
  console.error("[migrate] lỗi", e);
  process.exit(1);
} finally {
  await client.end();
}
