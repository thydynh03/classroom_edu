/**
 * Danh mục tính năng nâng cao (dùng chung client + server). Mở khóa theo từng giáo viên (feature_grants).
 * `comingSoon`: chưa có, GV bấm "Tôi quan tâm" để admin biết nhu cầu.
 */
export type FeatureKey = "QUIZ_IMPORT" | "GRADEBOOK" | "QUIZ_ANALYTICS" | "ANNOTATE" | "QUESTION_BANK" | "AI_FEEDBACK" | "PARENT_REPORT";

export type PremiumFeature = {
  key: FeatureKey;
  title: string;
  summary: string;
  benefits: string[];
  comingSoon?: boolean;
};

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    key: "QUIZ_IMPORT",
    title: "Nhập đề trắc nghiệm từ Word, Excel",
    summary: "Dán hoặc tải file đề có sẵn, hệ thống tự tách câu hỏi, đáp án và đáp án đúng.",
    benefits: [
      "Nhận file .docx (đáp án đúng in đậm, gạch chân hoặc có dấu *) và file .xlsx theo mẫu",
      "Dán thẳng đề từ Word: \"Câu 1… A. … B. …\", dòng \"Đáp án: B\"",
      "Xem trước, sửa lại rồi mới lưu — không mất câu đã soạn",
    ],
  },
  {
    key: "GRADEBOOK",
    title: "Sổ điểm và xuất Excel",
    summary: "Bảng điểm cả lớp theo từng bài, điểm trung bình có hệ số 1–2–3, xuất file Excel nộp nhà trường.",
    benefits: ["Quy đổi mọi bài về thang 10", "Đặt hệ số từng bài (thường xuyên, giữa kỳ, cuối kỳ)", "Xuất Excel một chạm"],
  },
  {
    key: "QUIZ_ANALYTICS",
    title: "Thống kê từng câu hỏi",
    summary: "Biết ngay câu nào nhiều em sai, đáp án nhiễu nào hay bị chọn và phân bố điểm của bài.",
    benefits: ["Tỉ lệ đúng từng câu, tô màu câu khó", "Số em chọn từng phương án", "Phổ điểm của cả lớp"],
  },
  {
    key: "ANNOTATE",
    title: "Chấm trực tiếp lên ảnh bài làm",
    summary: "Khoanh, gạch, ghi chú bằng bút đỏ ngay trên ảnh học sinh nộp.",
    benefits: ["Dùng được trên điện thoại và máy tính bảng"],
    comingSoon: true,
  },
  {
    key: "QUESTION_BANK",
    title: "Ngân hàng câu hỏi, trộn đề, hẹn giờ làm bài",
    summary: "Dùng lại câu hỏi giữa các lớp, mỗi em một đề, giới hạn thời gian.",
    benefits: ["Chống chép bài khi kiểm tra"],
    comingSoon: true,
  },
  {
    key: "AI_FEEDBACK",
    title: "AI gợi ý nhận xét bài tự luận",
    summary: "Gợi ý nhận xét và điểm tham khảo; giáo viên luôn là người quyết định.",
    benefits: ["Tiết kiệm thời gian chấm bài đông học sinh"],
    comingSoon: true,
  },
  {
    key: "PARENT_REPORT",
    title: "Báo cáo phụ huynh hằng tuần",
    summary: "Tự gửi tình hình nộp bài và điểm cho phụ huynh mỗi tuần.",
    benefits: ["Phụ huynh nắm tình hình mà không cần nhắn từng người"],
    comingSoon: true,
  },
];

export const FEATURE_KEYS = PREMIUM_FEATURES.map((f) => f.key) as [FeatureKey, ...FeatureKey[]];

export function featureByKey(key: string) {
  return PREMIUM_FEATURES.find((f) => f.key === key);
}

export const PLANS = {
  MONTH: "Theo tháng",
  YEAR: "Theo năm",
  INTEREST: "Quan tâm (tính năng sắp ra mắt)",
} as const;
export type PlanKey = keyof typeof PLANS;
