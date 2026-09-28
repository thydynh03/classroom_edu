// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  SubmissionStatusBadge,
  type SubmissionStatus,
} from "@/components/domain/submission-status-badge";

describe("SubmissionStatusBadge", () => {
  const cases: Array<{ status: SubmissionStatus; expectedText: string }> = [
    { status: "NOT_STARTED", expectedText: "Chưa làm" },
    { status: "DRAFT", expectedText: "Nháp" },
    { status: "SUBMITTED", expectedText: "Đã nộp" },
    { status: "LATE", expectedText: "Nộp trễ" },
    { status: "GRADED", expectedText: "Đã chấm" },
    { status: "RETURNED", expectedText: "Đã trả" },
    { status: "MISSING", expectedText: "Quá hạn" },
  ];

  cases.forEach(({ status, expectedText }) => {
    it(`renders correct Vietnamese label "${expectedText}" for status ${status}`, () => {
      render(<SubmissionStatusBadge status={status} />);
      expect(screen.getByText(expectedText)).toBeDefined();
    });
  });
});
