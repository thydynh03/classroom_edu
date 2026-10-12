import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/feedback/status-screen";
import { LinkButton } from "@/components/domain/page-parts";
import { getActor } from "@/server/auth/session";
import { homeFor } from "@/server/auth/guard";

export const metadata = { title: "Không tìm thấy · Classroom Edu" };

export default async function NotFound() {
  const actor = await getActor();
  return (
    <main id="main" className="bg-background flex min-h-screen flex-col">
      <StatusScreen
        icon={<SearchX />}
        title="Không tìm thấy trang"
        description="Trang này không tồn tại, đã bị xóa, hoặc bạn không có quyền xem. Kiểm tra lại đường dẫn hoặc quay về trang chính."
        actions={<LinkButton href={actor ? homeFor(actor.role) : "/"}>{actor ? "Về trang chính" : "Về trang chủ"}</LinkButton>}
      />
    </main>
  );
}
