import { sql, relations } from "drizzle-orm"
import { text, sqliteTable, int } from "drizzle-orm/sqlite-core"

export const hotwheels = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  image_url: text(),
  year: text(),
  series: text(),
  model_number: text()
})

export const designers = sqliteTable("designers", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  description: text(),
})
