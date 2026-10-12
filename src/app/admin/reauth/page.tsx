import { requireActor } from "@/server/auth/guard";
import { ReauthBar } from "../reauth-bar";

export const metadata = { title: "Xác nhận mật khẩu · Quản trị · Classroom Edu" };

export default async function ReauthPage() {
  await requireActor("ADMIN");
  return <ReauthBar />;
}
