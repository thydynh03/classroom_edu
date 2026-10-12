/**
 * Cách DUY NHẤT tạo thêm tài khoản ADMIN (không có đường nào qua web/API).
 * Chạy trên máy vận hành, trỏ vào DB production bằng DIRECT_URL (hoặc DATABASE_URL):
 *
 *   pnpm admin:create --username ten.admin --name "Họ Tên" [--email a@truong.edu.vn] [--yes]
 *
 * In mật khẩu tạm MỘT LẦN (bắt đổi ở lần đăng nhập đầu), ghi audit_logs, gửi email báo cho các admin hiện có (nếu có SMTP).
 * Trigger users_guard (drizzle/0005) chặn INSERT admin nếu transaction không bật app.allow_admin_insert.
 */
import { createInterface } from "node:readline/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import nodemailer from "nodemailer";
import postgres from "postgres";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DIRECT_URL / DATABASE_URL");
  const username = arg("username")?.trim().toLowerCase();
  const fullName = arg("name")?.trim();
  const email = arg("email")?.trim().toLowerCase() || null;
  if (!username || !/^[a-z0-9._]{3,32}$/.test(username)) throw new Error("--username 3–32 ký tự: chữ thường, số, dấu chấm, gạch dưới");
  if (!fullName || fullName.length < 2) throw new Error('--name "Họ Tên" là bắt buộc');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("--email không hợp lệ");

  const host = new URL(url).hostname;
  if (!process.argv.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Tạo ADMIN "${username}" trên DB ${host}? Gõ đúng tên host để xác nhận: `);
    rl.close();
    if (answer.trim() !== host) throw new Error("Đã hủy.");
  }

  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const tempPassword = Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join("");
  const passwordHash = await hash(tempPassword, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const others = await sql.begin(async (tx) => {
      const [taken] = await tx`select 1 from users where lower(username) = ${username} or (${email}::text is not null and lower(email) = ${email}) limit 1`;
      if (taken) throw new Error("Tên đăng nhập hoặc email đã được dùng.");
      await tx`select set_config('app.allow_admin_insert', 'on', true)`;
      const id = randomUUID();
      await tx`insert into users (id, username, email, full_name, password_hash, role, must_change_password, email_verified_at)
        values (${id}, ${username}, ${email}, ${fullName}, ${passwordHash}, 'ADMIN', true, now())`;
      await tx`insert into audit_logs (id, actor_id, action, target_type, target_id, meta)
        values (${randomUUID()}, null, 'user.create_admin_cli', 'user', ${id}, ${sql.json({ username })})`;
      return tx<{ email: string }[]>`select email from users where role = 'ADMIN' and status = 'ACTIVE' and email is not null and id <> ${id}`;
    });
    console.log(`Đã tạo admin ${username}. Mật khẩu tạm (chỉ hiện một lần, bắt đổi khi đăng nhập): ${tempPassword}`);
    if (process.env.SMTP_HOST && others.length) {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
      });
      await transport
        .sendMail({
          from: process.env.EMAIL_FROM ?? "Classroom Edu <no-reply@localhost>",
          to: others.map((o) => o.email).join(","),
          subject: "Classroom Edu: có tài khoản quản trị viên mới",
          text: `Tài khoản quản trị viên "${username}" (${fullName}) vừa được tạo bằng script vận hành. Nếu bạn không biết việc này, hãy khóa tài khoản đó ở trang /admin ngay.`,
        })
        .catch((e: Error) => console.error("[admin:create] không gửi được email báo admin:", e.message));
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("[admin:create]", e instanceof Error ? e.message : e);
  process.exit(1);
});
