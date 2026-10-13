/** Ngân hàng câu hỏi: của riêng từng giáo viên; GV khác, học sinh, admin đều nhận 404. */
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";

process.env.DATABASE_URL = inject("dbUrl");

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"]): Actor => ({ id, role, fullName: role, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });
const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));

const mod = async () => ({
  db: await import("@/server/db/client"),
  s: await import("@/server/db/schema"),
  bank: await import("@/server/services/question-bank"),
  v: await import("@/server/validation/assignment"),
});
let m: Awaited<ReturnType<typeof mod>>;
let gv: Actor, gv2: Actor, hs: Actor;

const q = (prompt: string, topic = "") => ({
  topic,
  question: {
    type: "SINGLE" as const,
    prompt,
    points: 1,
    options: [
      { label: "A", isCorrect: true },
      { label: "B", isCorrect: false },
    ],
  },
});

beforeAll(async () => {
  m = await mod();
  const mk = async (username: string, role: "TEACHER" | "STUDENT") => {
    const [u] = await m.db.db.insert(m.s.users).values({ username, fullName: username, passwordHash: "x", role }).returning();
    return actor(u.id, role);
  };
  gv = await mk("qb.gv", "TEACHER");
  gv2 = await mk("qb.gv2", "TEACHER");
  hs = await mk("qb.hs", "STUDENT");
});

describe("ngân hàng câu hỏi", () => {
  it("GV thêm, xem, sửa, xóa câu của mình; câu trùng nội dung bị bỏ qua", async () => {
    expect(await m.bank.addBankQuestions(gv, [q("1 + 1 = ?", "Số học"), q("2 + 2 = ?")])).toBe(2);
    expect(await m.bank.addBankQuestions(gv, [q("1 + 1 = ?"), q("3 + 3 = ?")])).toBe(1);
    let list = await m.bank.listBankQuestions(gv);
    expect(list).toHaveLength(3);
    const first = list.find((x) => x.prompt === "1 + 1 = ?")!;
    expect(first.topic).toBe("Số học");
    expect(first.options).toEqual([
      { label: "A", isCorrect: true },
      { label: "B", isCorrect: false },
    ]);
    await m.bank.updateBankQuestion(gv, first.id, q("1 + 1 bằng mấy?", "Cộng"));
    await m.bank.deleteBankQuestion(gv, list.find((x) => x.prompt === "2 + 2 = ?")!.id);
    list = await m.bank.listBankQuestions(gv);
    expect(list.map((x) => x.prompt).sort()).toEqual(["1 + 1 bằng mấy?", "3 + 3 = ?"]);
    expect(await m.bank.bankCount(gv)).toBe(2);
  });

  it("GV khác không thấy, không sửa, không xóa được câu của người khác (404)", async () => {
    const [mine] = await m.bank.listBankQuestions(gv);
    expect(await m.bank.listBankQuestions(gv2)).toHaveLength(0);
    await is404(m.bank.updateBankQuestion(gv2, mine.id, q("chiếm quyền")));
    await is404(m.bank.deleteBankQuestion(gv2, mine.id));
    expect((await m.bank.listBankQuestions(gv)).some((x) => x.id === mine.id && x.prompt !== "chiếm quyền")).toBe(true);
  });

  it("học sinh và admin không dùng được ngân hàng (404); id sai định dạng cũng 404", async () => {
    const [mine] = await m.bank.listBankQuestions(gv);
    const admin = actor(uuidv7(), "ADMIN");
    for (const a of [hs, admin]) {
      await is404(m.bank.listBankQuestions(a));
      await is404(m.bank.addBankQuestions(a, [q("x")]));
      await is404(m.bank.updateBankQuestion(a, mine.id, q("x")));
      await is404(m.bank.deleteBankQuestion(a, mine.id));
    }
    await is404(m.bank.deleteBankQuestion(gv, "khong-phai-uuid"));
  });

  it("schema từ chối field lạ, câu thiếu đáp án đúng và chủ đề quá dài", () => {
    const ok = q("hợp lệ", "Chủ đề");
    expect(m.v.bankQuestionSchema.safeParse(ok).success).toBe(true);
    expect(m.v.bankQuestionSchema.safeParse({ ...ok, ownerId: gv2.id }).success).toBe(false);
    expect(m.v.bankQuestionSchema.safeParse({ ...ok, topic: "x".repeat(61) }).success).toBe(false);
    const noCorrect = { ...ok, question: { ...ok.question, options: ok.question.options.map((o) => ({ ...o, isCorrect: false })) } };
    expect(m.v.bankQuestionSchema.safeParse(noCorrect).success).toBe(false);
  });
});
