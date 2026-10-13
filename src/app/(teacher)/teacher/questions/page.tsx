import { requireActor } from "@/server/auth/guard";
import { listBankQuestions } from "@/server/services/question-bank";
import { PageHeader, SummaryStrip } from "@/components/domain/page-parts";
import { BankManager } from "./bank-manager";

export const metadata = { title: "Ngân hàng câu hỏi · Classroom Edu" };

export default async function QuestionBankPage() {
  const actor = await requireActor("TEACHER");
  const items = await listBankQuestions(actor);
  const topics = new Set(items.map((i) => i.topic).filter(Boolean));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Ngân hàng câu hỏi" description="Câu hỏi trắc nghiệm của riêng bạn, dùng lại cho nhiều đề. Khi soạn đề, bấm “Chọn từ ngân hàng” để lấy câu." />
      {items.length > 0 && (
        <SummaryStrip
          items={[
            { label: "Câu hỏi", value: items.length },
            { label: "Chủ đề", value: topics.size, hint: items.some((i) => !i.topic) ? `${items.filter((i) => !i.topic).length} câu chưa gắn chủ đề` : undefined },
            { label: "Nhiều đáp án", value: items.filter((i) => i.type === "MULTI").length, hint: `${items.filter((i) => i.type === "TRUE_FALSE").length} câu Đúng / Sai` },
          ]}
        />
      )}
      <BankManager items={items} />
    </div>
  );
}
