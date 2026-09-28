import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseReply, scanWithClamd } from "@/server/storage/clamav";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/** clamd giả: đọc INSTREAM, báo FOUND nếu dữ liệu chứa chuỗi EICAR. */
let server: net.Server;
let port = 0;
beforeAll(async () => {
  server = net.createServer((sock) => {
    let buf = Buffer.alloc(0);
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      const header = "zINSTREAM\0";
      if (buf.length < header.length) return;
      let off = header.length;
      const data: Buffer[] = [];
      while (off + 4 <= buf.length) {
        const len = buf.readUInt32BE(off);
        if (len === 0) {
          const body = Buffer.concat(data).toString("latin1");
          sock.end(body.includes("EICAR-STANDARD") ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
          return;
        }
        if (off + 4 + len > buf.length) return;
        data.push(buf.subarray(off + 4, off + 4 + len));
        off += 4 + len;
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  port = (server.address() as net.AddressInfo).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function* from(...parts: string[]) {
  for (const p of parts) yield Buffer.from(p, "latin1");
}

describe("clamd INSTREAM", () => {
  it("file sạch → clean", async () => {
    expect(await scanWithClamd(from("bài làm của em"), { host: "127.0.0.1", port })).toEqual({ clean: true });
  });

  it("phát hiện EICAR kể cả khi bị chia nhiều khối", async () => {
    const r = await scanWithClamd(from(EICAR.slice(0, 20), EICAR.slice(20)), { host: "127.0.0.1", port });
    expect(r).toEqual({ clean: false, signature: "Eicar-Test-Signature" });
  });

  it("không kết nối được → lỗi (để upload fail closed)", async () => {
    await expect(scanWithClamd(from("x"), { host: "127.0.0.1", port: 1, timeoutMs: 2000 })).rejects.toThrow();
  });

  it("đọc câu trả lời clamd", () => {
    expect(parseReply("stream: OK\0")).toEqual({ clean: true });
    expect(parseReply("stream: Win.Test.EICAR_HDB-1 FOUND\0")).toEqual({ clean: false, signature: "Win.Test.EICAR_HDB-1" });
    expect(() => parseReply("stream: ERROR")).toThrow();
  });
});
