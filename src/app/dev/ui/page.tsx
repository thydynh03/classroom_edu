import { notFound } from "next/navigation";
import { UiCatalog } from "./ui-catalog";

export const metadata = {
  title: "Design System & UI Catalog · Classroom Edu",
  description: "Bảng duyệt token màu, kiểu chữ, component và layout mockup D",
};

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <UiCatalog />;
}
