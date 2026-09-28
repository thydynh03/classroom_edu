import Link from "next/link";
import { getActor } from "@/server/auth/session";
import { findClassByCode } from "@/server/services/classes";
import { JoinSignupForm, JoinButton } from "./join-forms";

export const metadata = { title: "Tham gia lớp · Classroom Edu" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [actor, cls] = await Promise.all([getActor(), findClassByCode(decodeURIComponent(code))]);
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="bg-surface border-border rounded-card w-full max-w-md border p-6 sm:p-8">
        {!cls ? (
          <>
            <h1 className="text-2xl font-extrabold">Không tìm thấy lớp</h1>
            <p className="text-muted mt-2 text-sm">Mã lớp không đúng, hoặc giáo viên đã tắt tham gia bằng mã. Hỏi lại giáo viên của bạn.</p>
          </>
        ) : (
          <>
            <p className="text-muted text-sm font-semibold">Tham gia lớp</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{cls.name}</h1>
            <p className="text-muted mt-1 mb-6 text-sm">
              {cls.subject} · {cls.teacherName}
            </p>
            {actor?.role === "STUDENT" ? (
              <JoinButton code={code} />
            ) : actor ? (
              <p className="bg-warning-soft text-warning rounded-control px-3 py-2.5 text-sm font-medium">
                Bạn đang đăng nhập bằng tài khoản giáo viên. Chỉ học sinh mới tham gia lớp bằng mã.
              </p>
            ) : (
              <>
                <JoinSignupForm code={code} />
                <p className="text-muted mt-6 text-center text-sm">
                  Đã có tài khoản?{" "}
                  <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className="text-primary font-semibold hover:underline">
                    Đăng nhập để tham gia
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
