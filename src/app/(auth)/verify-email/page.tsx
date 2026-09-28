import Link from "next/link";
import { verifyEmailToken } from "../actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">
        {ok ? "Đã xác minh email" : "Không xác minh được"}
      </h1>
      <p className="text-muted mb-6 text-sm">
        {ok
          ? "Tài khoản giáo viên đã được kích hoạt."
          : "Liên kết đã hết hạn hoặc đã được dùng. Đăng ký lại hoặc liên hệ quản trị viên."}
      </p>
      <Link href="/login" className="text-primary font-semibold hover:underline">
        Đến trang đăng nhập
      </Link>
    </>
  );
}
