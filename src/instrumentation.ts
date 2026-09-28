export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DISABLE_SCHEDULER !== "1" && !process.env.VERCEL) {
    const { startScheduler } = await import("@/server/jobs/deadlines");
    startScheduler();
  }
}
