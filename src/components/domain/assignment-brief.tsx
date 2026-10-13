import { FileList, type UploadedFileInfo } from "@/components/domain/file-uploader";

/**
 * Đề bài và tài liệu của giáo viên, dùng ở khung bên trái khi học sinh mở chế độ chia đôi màn hình.
 * Ảnh hiện ngay trong khung; tệp khác (PDF, Word…) mở ở tab mới.
 */
export function AssignmentBrief({ title, body, attachments }: { title: string; body: string | null; attachments: UploadedFileInfo[] }) {
  const images = attachments.filter((f) => f.mime.startsWith("image/"));
  const others = attachments.filter((f) => !f.mime.startsWith("image/"));
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold tracking-tight text-balance">{title}</h2>
      {body ? (
        <p className="text-[15px] leading-relaxed whitespace-pre-line">{body}</p>
      ) : (
        attachments.length === 0 && <p className="text-muted text-sm">Giáo viên không nhập nội dung đề cho bài này. Hãy làm theo tên bài hoặc lời dặn trên lớp.</p>
      )}
      {images.map((f) => (
        <figure key={f.id}>
          <a href={`/files/${f.id}?inline=1`} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh riêng tư qua URL ký tạm, không tối ưu bằng next/image được */}
            <img src={`/files/${f.id}?inline=1`} alt={`Tài liệu: ${f.name}`} loading="lazy" className="border-border w-full rounded-[12px] border" />
          </a>
          <figcaption className="text-muted mt-1 truncate text-xs">{f.name} · bấm vào ảnh để mở to</figcaption>
        </figure>
      ))}
      {others.length > 0 && (
        <div>
          <p className="text-muted mb-2 text-xs font-bold">Tài liệu khác ({others.length}) · mở ở tab mới</p>
          <FileList files={others} />
        </div>
      )}
    </div>
  );
}
