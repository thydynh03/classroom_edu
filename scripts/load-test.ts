/**
 * Load test (H7): N học sinh cùng mở bài rồi cùng NỘP BÀI trong ~1 phút — tình huống nặng nhất (phút cuối trước hạn).
 * Dùng HTTP thật (trang + server action), đo p50/p95/p99, lỗi, và kiểm tra DB sau khi chạy.
 *
 *   pnpm build && pnpm start                       # hoặc bản staging trên Vercel — KHÔNG chạy trên production thật
 *   DATABASE_URL=... BASE_URL=http://localhost:3000 pnpm load:test [--students 300] [--spread 60] [--keep]
 *
 * - Tạo dữ liệu thử riêng (tiền tố "lt."), phiên đăng nhập tạo thẳng trong DB, tự xóa khi xong (trừ --keep).
 * - Tìm action ID của submitAction trong .next/server/server-reference-manifest.json (bản build đang chạy).
 *   Chạy với server từ xa: truyền --action-id <id> lấy từ manifest của đúng bản build đó.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

const arg = (name: string, def?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const N = Number(arg("students", "300"));
const SPREAD_S = Number(arg("spread", "60"));
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE = arg("cookie", "__Host-ce_session")!;
const KEEP = process.argv.includes("--keep");

function findActionId() {
  const explicit = arg("action-id");
  if (explicit) return explicit;
  const p = ".next/server/server-reference-manifest.json";
  if (!existsSync(p)) throw new Error("Không thấy .next/server/server-reference-manifest.json — chạy pnpm build trước hoặc truyền --action-id");
  const m = JSON.parse(readFileSync(p, "utf8")) as { node: Record<string, { filename?: string; exportedName?: string }> };
  const hit = Object.entries(m.node).find(([, v]) => v.exportedName === "submitAction" && v.filename?.includes("(student)"));
  if (!hit) throw new Error("Không tìm thấy action submitAction trong manifest");
  return hit[0];
}

const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : NaN);
function summary(label: string, ms: number[], statuses: number[]) {
  const s = [...ms].sort((a, b) => a - b);
  const bad = statuses.filter((x) => x === 0 || x >= 500).length;
  console.log(
    `${label.padEnd(18)} n=${s.length}  p50=${pct(s, 50).toFixed(0)}ms  p95=${pct(s, 95).toFixed(0)}ms  p99=${pct(s, 99).toFixed(0)}ms  max=${s.at(-1)?.toFixed(0)}ms  lỗi(5xx/mạng)=${bad}`,
  );
  return { p95: pct(s, 95), bad };
}

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DATABASE_URL");
  const actionId = findActionId();
  const sql = postgres(url, { max: 5, prepare: false });
  const tag = randomBytes(3).toString("hex");
  const teacherId = randomUUID();
  const classId = randomUUID();
  const assignmentId = randomUUID();
  const students = Array.from({ length: N }, (_, i) => ({ id: randomUUID(), username: `lt.${tag}.${i}`, token: randomBytes(32).toString("base64url") }));
  console.log(`Chuẩn bị ${N} học sinh (tag ${tag}), action ${actionId.slice(0, 10)}…, target ${BASE}`);
  try {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.allow_teacher_approval', 'on', true)`;
      await tx`insert into users (id, username, full_name, password_hash, role, approved_at) values (${teacherId}, ${`lt.${tag}.gv`}, 'GV load test', 'x', 'TEACHER', now())`;
      await tx`insert into classes (id, owner_id, name, subject, join_code) values (${classId}, ${teacherId}, ${`Load test ${tag}`}, 'Test', ${`LT${tag}`.toUpperCase().slice(0, 8)})`;
      await tx`insert into class_members (class_id, user_id, role) values (${classId}, ${teacherId}, 'TEACHER')`;
      await tx`insert into assignments (id, class_id, group_id, type, title, due_at, status, published_at, created_by)
        values (${assignmentId}, ${classId}, ${randomUUID()}, 'WRITTEN', 'Bài load test', now() + interval '1 hour', 'PUBLISHED', now(), ${teacherId})`;
      for (let i = 0; i < students.length; i += 500) {
        const chunk = students.slice(i, i + 500);
        await tx`insert into users ${tx(chunk.map((s) => ({ id: s.id, username: s.username, full_name: s.username, password_hash: "x", role: "STUDENT" })))}`;
        await tx`insert into class_members ${tx(chunk.map((s) => ({ class_id: classId, user_id: s.id, role: "STUDENT" })))}`;
        await tx`insert into sessions ${tx(
          chunk.map((s) => ({
            id: randomUUID(),
            user_id: s.id,
            token_hash: createHash("sha256").update(s.token).digest("hex"),
            expires_at: new Date(Date.now() + 86400_000),
          })),
        )}`;
      }
    });

    const req = async (method: "GET" | "POST", path: string, token: string, body?: string) => {
      const t0 = performance.now();
      try {
        const res = await fetch(`${BASE}${path}`, {
          method,
          redirect: "manual",
          headers: {
            cookie: `${COOKIE}=${token}`,
            origin: BASE,
            ...(method === "POST" ? { "next-action": actionId, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component" } : {}),
          },
          body,
        });
        await res.arrayBuffer();
        return { ms: performance.now() - t0, status: res.status };
      } catch {
        return { ms: performance.now() - t0, status: 0 };
      }
    };
    const spread = async <T>(fn: (i: number) => Promise<T>) =>
      Promise.all(students.map((_, i) => new Promise<T>((r) => setTimeout(() => r(fn(i)), Math.random() * SPREAD_S * 1000))));

    console.log(`\nPha 1: ${N} HS mở trang bài trong ${SPREAD_S}s`);
    const open = await spread((i) => req("GET", `/student/assignments/${assignmentId}`, students[i].token));
    const o = summary("GET trang bài", open.map((r) => r.ms), open.map((r) => r.status));

    console.log(`\nPha 2: ${N} HS nộp bài trong ${SPREAD_S}s (server action)`);
    const sub = await spread((i) =>
      req("POST", `/student/assignments/${assignmentId}`, students[i].token, JSON.stringify([assignmentId, { content: `Bài làm của ${students[i].username}`, fileIds: [] }])),
    );
    const s = summary("POST nộp bài", sub.map((r) => r.ms), sub.map((r) => r.status));

    const [{ n }] = await sql`select count(*)::int as n from submissions where assignment_id = ${assignmentId} and status = 'SUBMITTED'`;
    console.log(`\nKiểm tra DB: ${n}/${N} bài ở trạng thái SUBMITTED`);
    const pass = n === N && o.bad === 0 && s.bad === 0 && s.p95 < 800;
    console.log(pass ? "ĐẠT: p95 nộp bài < 800ms, không lỗi, đủ bài." : "CHƯA ĐẠT: xem số liệu ở trên và /admin/ops.");
    process.exitCode = pass ? 0 : 1;
  } finally {
    if (!KEEP) {
      await sql`delete from classes where id = ${classId}`;
      await sql`delete from users where username like ${`lt.${tag}.%`}`;
      await sql`delete from notifications where href like ${`%${assignmentId}%`}`;
      console.log("Đã xóa dữ liệu load test.");
    }
    await sql.end();
  }
}

main().catch((e) => {
  console.error("[load-test]", e instanceof Error ? e.message : e);
  process.exit(1);
});
