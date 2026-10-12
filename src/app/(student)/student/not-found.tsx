import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/feedback/status-screen";
import { LinkButton } from "@/components/domain/page-parts";

export default function NotFound() {
  return (
    <StatusScreen
      icon={<SearchX />}
      title="Không tìm thấy trang"
      description="Trang này không tồn tại, đã bị xóa, hoặc bạn không có quyền xem. Kiểm tra lại đường dẫn hoặc quay về trang chính."
      actions={<LinkButton href="/student">Về Hôm nay</LinkButton>}
    />
  );
}
