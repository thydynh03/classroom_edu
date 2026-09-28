import postgres from "postgres";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Không reset DB production");
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  await client.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await client.end();
  console.log("Đã xóa DB dev");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
