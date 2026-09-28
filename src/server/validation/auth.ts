import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự")
  .max(128, "Mật khẩu tối đa 128 ký tự");

export const loginSchema = z.strictObject({
  identifier: z.string().trim().min(1, "Nhập email hoặc tên đăng nhập").max(254),
  password: z.string().min(1, "Nhập mật khẩu").max(128),
  next: z.string().max(300).optional(),
});

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,32}$/, "Tên đăng nhập 3–32 ký tự: chữ thường, số, dấu chấm, gạch dưới");

export const registerSchema = z.strictObject({
  fullName: z.string().trim().min(2, "Nhập họ tên").max(100),
  email: z.email("Email không hợp lệ").trim().toLowerCase(),
  username: usernameSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirm"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu cũ",
    path: ["newPassword"],
  });

export const resetPasswordSchema = z
  .strictObject({ token: z.string().min(20), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirm"],
  });
