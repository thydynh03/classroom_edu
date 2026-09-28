import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Đặt mật khẩu mới</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-danger text-sm">
          Liên kết không hợp lệ. Hãy yêu cầu liên kết mới từ trang Quên mật khẩu.
        </p>
      )}
    </>
  );
}
