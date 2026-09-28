import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

let container: StartedPostgreSqlContainer;

import type { TestProject } from "vitest/node";

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
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
}
