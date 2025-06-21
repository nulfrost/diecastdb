import { defineConfig } from "drizzle-kit"

import "dotenv/config"

export default defineConfig({
  out: './src/drizzle/migrations',
  schema: "./src/drizzle/schema.ts",
  driver: 'd1-http',
  dialect: 'sqlite',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID as string,
    token: process.env.CLOUDFLARE_D1_TOKEN as string
  }
})
