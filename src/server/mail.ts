import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string) {
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM ?? "Classroom Edu <no-reply@localhost>",
      to,
      subject,
      text,
    });
    return true;
  } catch (e) {
    console.error("[mail] gửi thất bại", { subject, error: (e as Error).message });
    return false;
  }
}

export function appUrl(path: string) {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}
