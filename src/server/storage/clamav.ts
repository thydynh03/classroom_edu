import net from "node:net";

export type ScanResult = { clean: true } | { clean: false; signature: string };

/**
 * Quét dữ liệu bằng clamd qua giao thức INSTREAM (không cần thư viện ngoài).
 * Gửi "zINSTREAM\0", từng khối [độ dài 4 byte big-endian][dữ liệu], kết thúc bằng khối độ dài 0.
 * clamd trả "stream: OK" hoặc "stream: <tên virus> FOUND".
 */
export function scanWithClamd(
  chunks: AsyncIterable<Uint8Array>,
  opts: { host: string; port: number; timeoutMs?: number },
): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: opts.host, port: opts.port });
    let reply = "";
    let settled = false;
    const done = (err: Error | null, r?: ScanResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(r!);
    };
    socket.setTimeout(opts.timeoutMs ?? 30_000, () => done(new Error("clamd timeout")));
    socket.on("error", (e) => done(e));
    socket.on("data", (d) => {
      reply += d.toString("utf8");
    });
    socket.on("end", () => done(null, parseReply(reply)));
    socket.on("close", () => {
      if (!settled) done(null, parseReply(reply));
    });
    socket.on("connect", async () => {
      try {
        socket.write("zINSTREAM\0");
        for await (const chunk of chunks) {
          for (let i = 0; i < chunk.length; i += 64 * 1024) {
            const part = chunk.subarray(i, i + 64 * 1024);
            const len = Buffer.alloc(4);
            len.writeUInt32BE(part.length, 0);
            socket.write(len);
            socket.write(part);
          }
        }
        socket.write(Buffer.alloc(4)); // kết thúc stream
      } catch (e) {
        done(e as Error);
      }
    });
  });
}

export function parseReply(raw: string): ScanResult {
  const text = raw.replace(/\0/g, "").trim();
  if (/:\s*OK$/.test(text)) return { clean: true };
  const found = text.match(/:\s*(.+)\s+FOUND$/);
  if (found) return { clean: false, signature: found[1] };
  throw new Error(`clamd trả lời không hợp lệ: ${text.slice(0, 100)}`);
}

export function clamavConfig() {
  const host = process.env.CLAMAV_HOST;
  if (!host) return null;
  return { host, port: Number(process.env.CLAMAV_PORT ?? 3310) };
}
