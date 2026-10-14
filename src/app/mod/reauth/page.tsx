import { requireActor } from "@/server/auth/guard";
import { ReauthBar } from "@/app/admin/reauth-bar";

export const metadata = { title: "Xác nhận mật khẩu · Kiểm duyệt · Classroom Edu" };

export default async function ModReauthPage() {
  await requireActor("MODERATOR");
  return <ReauthBar />;
}
