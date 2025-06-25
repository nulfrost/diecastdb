import { z } from "zod/v4";
import { validator } from "hono/validator";

const queryParamSchema = z.object({
	limit: z
		.union([z.literal("25"), z.literal("25"), z.literal("100")])
		.optional(),
	sort: z.union([z.literal("asc"), z.literal("desc")]).optional(),
});

export function queryParamValidator() {
	return validator("query", (value, c) => {
		const parsed = queryParamSchema.safeParse(value);
		if (!parsed.success) {
			return c.json({
				status: 400,
				title: "Error: Invalid query parameter value",
				detail:
					"Valid query parameters and values - limit: 25, 50, 100, sort: asc, desc",
			});
		}

		return parsed.data;
	});
}
