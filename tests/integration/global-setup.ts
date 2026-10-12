import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

let container: StartedPostgreSqlContainer | undefined;
let external: { adminUrl: string; dbName: string } | undefined;

import type { TestProject } from "vitest/node";

/**
 * Mặc định chạy Postgres bằng Testcontainers. Đặt INTEGRATION_DATABASE_URL (vd postgres://postgres@localhost:55433/postgres)
 * để dùng một Postgres có sẵn khi không kéo được image Docker: mỗi lần chạy tạo một database mới rồi xóa khi xong.
 */
export async function setup(project: TestProject) {
  let url: string;
  const base = process.env.INTEGRATION_DATABASE_URL;
  if (base) {
    const dbName = `ce_int_${Date.now().toString(36)}`;
    const admin = postgres(base, { max: 1 });
    await admin.unsafe(`create database ${dbName}`);
    await admin.end();
    const u = new URL(base);
    u.pathname = `/${dbName}`;
    url = u.toString();
    external = { adminUrl: base, dbName };
  } else {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    url = container.getConnectionUri();
  }
  const client = postgres(url, { max: 1 });
  await client`create extension if not exists unaccent`;
  await client`create extension if not exists pg_trgm`;
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  project.provide("dbUrl", url);
}

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string;
  }
}

export async function teardown() {
  await container?.stop();
  if (external) {
    const admin = postgres(external.adminUrl, { max: 1 });
    await admin.unsafe(`drop database if exists ${external.dbName} with (force)`);
    await admin.end();
  }
}
