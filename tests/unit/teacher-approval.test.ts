import { describe, expect, it } from "vitest";
import { autoApproveTeacher } from "@/server/auth/teacher-approval";

describe("tự duyệt GV theo tên miền email", () => {
  const env = "truong.edu.vn, @thpt-abc.edu.vn";
  it("khớp đúng tên miền trong danh sách (không phân biệt hoa thường, bỏ @)", () => {
    expect(autoApproveTeacher("co.ha@truong.edu.vn", env)).toBe(true);
    expect(autoApproveTeacher("Thay.Nam@THPT-ABC.edu.vn", env)).toBe(true);
  });
  it("không khớp tên miền con, tên miền khác hay danh sách trống", () => {
    expect(autoApproveTeacher("hs1@hs.truong.edu.vn", env)).toBe(false);
    expect(autoApproveTeacher("ai.do@gmail.com", env)).toBe(false);
    expect(autoApproveTeacher("x@truong.edu.vn.evil.com", env)).toBe(false);
    expect(autoApproveTeacher("co.ha@truong.edu.vn", "")).toBe(false);
    expect(autoApproveTeacher("khong-co-a-cong", env)).toBe(false);
  });
});
