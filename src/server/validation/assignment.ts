import { z } from "zod";

export const assignmentSchema = z.strictObject({
  classIds: z.array(z.uuid()).min(1, "Chọn ít nhất một lớp").max(20),
  type: z.enum(["WRITTEN", "QUIZ"]),
  title: z.string().trim().min(3, "Tiêu đề cần ít nhất 3 ký tự").max(200),
  body: z.string().max(20_000, "Đề bài quá dài").default(""),
  maxPoints: z.coerce.number().min(1, "Điểm tối đa ít nhất là 1").max(1000),
  dueAt: z.coerce.date({ error: "Chọn hạn nộp" }),
  allowLate: z.boolean(),
  allowResubmit: z.boolean(),
  showResults: z.enum(["IMMEDIATE", "AFTER_DUE", "MANUAL"]),
  attachmentIds: z.array(z.uuid()).max(10).default([]),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const questionSchema = z
  .strictObject({
    type: z.enum(["SINGLE", "MULTI", "TRUE_FALSE"]),
    prompt: z.string().trim().min(1, "Câu hỏi không được trống").max(2000),
    points: z.coerce.number().min(0.25).max(100),
    options: z
      .array(z.strictObject({ label: z.string().trim().min(1, "Lựa chọn không được trống").max(500), isCorrect: z.boolean() }))
      .min(2, "Cần ít nhất 2 lựa chọn")
      .max(8),
  })
  .refine((q) => q.options.some((o) => o.isCorrect), { message: "Chọn ít nhất một đáp án đúng" })
  .refine((q) => q.type === "MULTI" || q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Câu một đáp án chỉ được có đúng một đáp án đúng",
  });
export type QuestionInput = z.infer<typeof questionSchema>;

export const questionsSchema = z.array(questionSchema).min(1, "Quiz cần ít nhất 1 câu hỏi").max(100);

export const gradeSchema = z.strictObject({
  score: z.coerce.number().min(0, "Điểm không được âm"),
  feedback: z.string().max(5000).default(""),
});
