import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { homeFor } from "@/server/auth/guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập · Classroom Edu" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const actor = await getActor();
  if (actor) redirect(actor.mustChangePassword ? "/change-password" : homeFor(actor.role));
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Đăng nhập</h1>
      <p className="text-muted mt-1 mb-6 text-sm">
        Học sinh dùng tên đăng nhập giáo viên đã cấp. Giáo viên có thể dùng email.
      </p>
      <LoginForm next={next} />
      <p className="text-muted mt-6 text-center text-sm">
        Bạn là giáo viên mới?{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          Tạo tài khoản
        </Link>
      </p>
    </>
  );
}
