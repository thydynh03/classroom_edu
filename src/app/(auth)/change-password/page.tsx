import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { ChangeForm } from "./change-form";

export default async function ChangePasswordPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Đổi mật khẩu</h1>
      <p className="text-muted mt-1 mb-6 text-sm">
        {actor.mustChangePassword
          ? "Đây là lần đăng nhập đầu tiên. Hãy đặt mật khẩu riêng để tiếp tục."
          : "Đổi mật khẩu sẽ đăng xuất bạn khỏi các thiết bị khác."}
      </p>
      <ChangeForm />
    </>
  );
}
