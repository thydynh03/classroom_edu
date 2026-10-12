"use client";

import { ErrorView } from "@/components/feedback/error-view";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" className="bg-background flex min-h-screen flex-col">
      <ErrorView error={error} retry={retry} />
    </main>
  );
}
