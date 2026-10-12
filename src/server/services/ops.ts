import "server-only";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLogs, jobRuns, notifications, pushSubscriptions, userEvents, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireRole } from "@/server/policy";
import { emailLimits, emailsSentToday } from "@/server/mail";

/** Số liệu cho /admin/ops (sức khỏe hệ thống) và /admin/activity (hành vi). Chỉ ADMIN. Không trả nội dung bài/điểm. */

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function opsOverview(actor: Actor, hours: number) {
  requireRole(actor, "ADMIN");
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const bucket = hours <= 1 ? "minute" : hours <= 48 ? "hour" : "day";
  const [totals] = await db.execute<Record<string, unknown>>(sql`
    select count(*)::int as total,
      count(*) filter (where status >= 500)::int as errors5xx,
      count(*) filter (where status >= 400 and status < 500)::int as errors4xx,
      percentile_cont(0.5) within group (order by duration_ms) as p50,
      percentile_cont(0.95) within group (order by duration_ms) as p95,
      percentile_cont(0.99) within group (order by duration_ms) as p99
    from request_samples where at > ${since}::timestamptz`);
  const series = await db.execute<Record<string, unknown>>(sql`
    select date_trunc(${bucket}, at) as t, count(*)::int as total,
      count(*) filter (where status >= 500)::int as errors,
      percentile_cont(0.5) within group (order by duration_ms) as p50,
      percentile_cont(0.95) within group (order by duration_ms) as p95,
      percentile_cont(0.99) within group (order by duration_ms) as p99
    from request_samples where at > ${since}::timestamptz group by 1 order by 1`);
  const routes = await db.execute<Record<string, unknown>>(sql`
    select method, route, count(*)::int as total,
      count(*) filter (where status >= 500)::int as errors,
      percentile_cont(0.95) within group (order by duration_ms) as p95,
      percentile_cont(0.99) within group (order by duration_ms) as p99
    from request_samples where at > ${since}::timestamptz group by 1, 2 order by p95 desc nulls last limit 15`);
  const errors = await db.execute<Record<string, unknown>>(sql`
    select route, route_type, coalesce(digest, '') as digest, message, count(*)::int as total, max(at) as last_at
    from error_events where at > ${since}::timestamptz group by 1, 2, 3, 4 order by last_at desc limit 30`);
  const client = await db.execute<Record<string, unknown>>(sql`
    select kind, route, coalesce(network, 'unknown') as network, count(*)::int as total
    from client_events where at > ${since}::timestamptz and kind in ('network_error', 'server_error', 'slow_request', 'offline')
    group by 1, 2, 3 order by total desc limit 30`);
  const vitals = await db.execute<Record<string, unknown>>(sql`
    select kind, coalesce(device, 'unknown') as device, count(*)::int as total,
      percentile_cont(0.75) within group (order by value) as p75
    from client_events where at > ${since}::timestamptz and kind in ('LCP', 'INP', 'CLS', 'TTFB')
    group by 1, 2 order by 1, 2`);
  const jobs = await db
    .select({ job: jobRuns.job, startedAt: jobRuns.startedAt, finishedAt: jobRuns.finishedAt, ok: jobRuns.ok, result: jobRuns.result })
    .from(jobRuns)
    .orderBy(desc(jobRuns.startedAt))
    .limit(10);
  const [queue] = await db.select({ n: count() }).from(notifications).where(isNull(notifications.emailSentAt));
  const [devices] = await db.select({ n: count() }).from(pushSubscriptions);
  return {
    hours,
    totals: {
      total: n(totals?.total) ?? 0,
      errors5xx: n(totals?.errors5xx) ?? 0,
      errors4xx: n(totals?.errors4xx) ?? 0,
      p50: n(totals?.p50),
      p95: n(totals?.p95),
      p99: n(totals?.p99),
    },
    series: series.map((r) => ({ t: new Date(String(r.t)), total: n(r.total) ?? 0, errors: n(r.errors) ?? 0, p50: n(r.p50), p95: n(r.p95), p99: n(r.p99) })),
    routes: routes.map((r) => ({ method: String(r.method), route: String(r.route), total: n(r.total) ?? 0, errors: n(r.errors) ?? 0, p95: n(r.p95), p99: n(r.p99) })),
    errors: errors.map((r) => ({ route: String(r.route), routeType: String(r.route_type), digest: String(r.digest), message: String(r.message), total: n(r.total) ?? 0, lastAt: new Date(String(r.last_at)) })),
    client: client.map((r) => ({ kind: String(r.kind), route: String(r.route), network: String(r.network), total: n(r.total) ?? 0 })),
    vitals: vitals.map((r) => ({ kind: String(r.kind), device: String(r.device), total: n(r.total) ?? 0, p75: n(r.p75) })),
    jobs,
    email: { sentToday: await emailsSentToday(), limits: emailLimits(), queue: queue?.n ?? 0 },
    pushDevices: devices?.n ?? 0,
  };
}

export async function activityOverview(actor: Actor) {
  requireRole(actor, "ADMIN");
  const [active] = await db.execute<Record<string, unknown>>(sql`
    select
      count(distinct user_id) filter (where at > now() - interval '1 day')::int as dau,
      count(distinct user_id) filter (where at > now() - interval '7 days')::int as wau,
      count(distinct user_id) filter (where at > now() - interval '30 days')::int as mau,
      count(distinct user_id) filter (where at > now() - interval '30 days' and role = 'TEACHER')::int as mau_teacher,
      count(distinct user_id) filter (where at > now() - interval '30 days' and role = 'STUDENT')::int as mau_student
    from user_events`);
  const daily = await db.execute<Record<string, unknown>>(sql`
    select to_char(at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as day,
      count(distinct user_id)::int as users,
      count(*) filter (where event = 'login')::int as logins,
      count(*) filter (where event in ('submission.submit', 'quiz.submit'))::int as submissions
    from user_events where at > now() - interval '14 days' group by 1 order by 1`);
  const devices = await db.execute<Record<string, unknown>>(sql`
    select coalesce(device, 'unknown') as device, role, count(distinct user_id)::int as users
    from user_events where at > now() - interval '30 days' group by 1, 2 order by 3 desc`);
  const heat = await db.execute<Record<string, unknown>>(sql`
    select extract(isodow from at at time zone 'Asia/Ho_Chi_Minh')::int as dow,
      extract(hour from at at time zone 'Asia/Ho_Chi_Minh')::int as hour, count(*)::int as total
    from user_events where at > now() - interval '30 days' group by 1, 2`);
  const features = await db.execute<Record<string, unknown>>(sql`
    select event, count(*)::int as total, count(distinct user_id)::int as users
    from user_events where at > now() - interval '30 days' group by 1 order by 2 desc`);
  // Phễu 30 ngày: lượt giao bài (bài đã đăng × HS của lớp) → HS mở bài → nộp → được trả bài
  const [funnel] = await db.execute<Record<string, unknown>>(sql`
    select
      (select count(*) from assignments a join class_members m on m.class_id = a.class_id and m.role = 'STUDENT' and m.status = 'ACTIVE'
        where a.status = 'PUBLISHED' and a.published_at > now() - interval '30 days')::int as assigned,
      (select count(*) from submissions s join assignments a on a.id = s.assignment_id
        where a.published_at > now() - interval '30 days' and s.status <> 'DRAFT')::int as submitted,
      (select count(*) from submissions s join assignments a on a.id = s.assignment_id
        where a.published_at > now() - interval '30 days' and s.status = 'RETURNED')::int as returned`);
  const [opened] = await db.execute<Record<string, unknown>>(sql`
    select count(*)::int as n from (
      select distinct s.student_id, s.assignment_id from submissions s join assignments a on a.id = s.assignment_id
      where a.published_at > now() - interval '30 days'
    ) x`);
  return {
    active: {
      dau: n(active?.dau) ?? 0,
      wau: n(active?.wau) ?? 0,
      mau: n(active?.mau) ?? 0,
      mauTeacher: n(active?.mau_teacher) ?? 0,
      mauStudent: n(active?.mau_student) ?? 0,
    },
    daily: daily.map((r) => ({ day: String(r.day), users: n(r.users) ?? 0, logins: n(r.logins) ?? 0, submissions: n(r.submissions) ?? 0 })),
    devices: devices.map((r) => ({ device: String(r.device), role: String(r.role), users: n(r.users) ?? 0 })),
    heat: heat.map((r) => ({ dow: n(r.dow) ?? 1, hour: n(r.hour) ?? 0, total: n(r.total) ?? 0 })),
    features: features.map((r) => ({ event: String(r.event), total: n(r.total) ?? 0, users: n(r.users) ?? 0 })),
    funnel: {
      assigned: n(funnel?.assigned) ?? 0,
      // "Đã mở" = có bản ghi bài nộp (kể cả nháp) — mở trang bài là tạo nháp khi gõ/đính kèm; xấp xỉ, không đếm lượt xem trơn.
      started: n(opened?.n) ?? 0,
      submitted: n(funnel?.submitted) ?? 0,
      returned: n(funnel?.returned) ?? 0,
    },
  };
}

/** Dòng thời gian hoạt động của một tài khoản (admin xem cũng được ghi audit). */
export async function userTimeline(actor: Actor, username: string) {
  requireRole(actor, "ADMIN");
  const [u] = await db
    .select({ id: users.id, fullName: users.fullName, username: users.username, role: users.role })
    .from(users)
    .where(and(sql`lower(${users.username}) = ${username.trim().toLowerCase()}`, isNull(users.deletedAt)));
  if (!u) return null;
  const events = await db
    .select({ at: userEvents.at, event: userEvents.event, device: userEvents.device, meta: userEvents.meta })
    .from(userEvents)
    .where(and(eq(userEvents.userId, u.id), gt(userEvents.at, new Date(Date.now() - 90 * 86400_000))))
    .orderBy(desc(userEvents.at))
    .limit(100);
  await db.insert(auditLogs).values({ actorId: actor.id, action: "admin.view_timeline", targetType: "user", targetId: u.id });
  return { user: u, events };
}
