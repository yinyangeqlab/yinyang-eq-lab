import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./site/drizzle",
  schema: "./site/db/schema.ts",
  dialect: "sqlite",
});
