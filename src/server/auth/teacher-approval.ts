/**
 * GV tự đăng ký phải chờ admin duyệt, trừ khi email đúng một tên miền trong TEACHER_AUTO_APPROVE_DOMAINS
 * (vd "truong.edu.vn,thpt-abc.edu.vn"). Chỉ khớp nguyên tên miền, không khớp tên miền con,
 * để email học sinh kiểu hs.truong.edu.vn không tự được duyệt.
 */
export function autoApproveTeacher(email: string, domainsEnv = process.env.TEACHER_AUTO_APPROVE_DOMAINS ?? "") {
  const domains = domainsEnv
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  const host = email.trim().toLowerCase().split("@")[1] ?? "";
  return host.length > 0 && domains.includes(host);
}
