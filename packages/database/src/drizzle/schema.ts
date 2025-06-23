import { relations } from "drizzle-orm";
import { text, sqliteTable, int, primaryKey } from "drizzle-orm/sqlite-core";

export const hotwheels = sqliteTable("hotwheels", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	image_url: text(),
	year: text(),
	series: text(),
	model_number: text(),
});

export const designers = sqliteTable("designers", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull().unique(),
	title: text(),
	description: text(),
});

export const hotwheelDesigners = sqliteTable(
	"hotwheel_designers",
	{
		hotwheel_id: int()
			.notNull()
			.references(() => hotwheels.id, { onDelete: "cascade" }),
		designer_id: int()
			.notNull()
			.references(() => designers.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.hotwheel_id, t.designer_id] })],
);

export const hotwheelRelations = relations(hotwheels, ({ many }) => ({
	designers: many(hotwheelDesigners),
}));

export const designerRelations = relations(designers, ({ many }) => ({
	hotwheels: many(hotwheelDesigners),
}));

export const hotwheelDesignerRelations = relations(
	hotwheelDesigners,
	({ one }) => ({
		hotwheel: one(hotwheels, {
			fields: [hotwheelDesigners.hotwheel_id],
			references: [hotwheels.id],
		}),
		designer: one(designers, {
			fields: [hotwheelDesigners.designer_id],
			references: [designers.id],
		}),
	}),
);
