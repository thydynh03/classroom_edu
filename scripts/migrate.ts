import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  await client`create extension if not exists unaccent`;
  await client`create extension if not exists pg_trgm`;
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("Migration xong");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
