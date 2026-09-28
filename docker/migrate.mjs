// Chạy khi container khởi động, hoặc trước `next build` trên Vercel (MIGRATIONS_DIR=./drizzle):
// 1) migrate DB, 2) tạo admin đầu tiên nếu có BOOTSTRAP_ADMIN_* và chưa có admin nào.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] Thiếu DATABASE_URL");
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
