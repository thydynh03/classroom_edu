import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2.5 text-lg font-extrabold"
        >
          <span className="bg-primary text-on-primary shadow-primary flex size-10 items-center justify-center rounded-[14px] text-lg">
            C
          </span>
          Classroom Edu
        </Link>
        <div className="bg-surface border-border rounded-card border p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
