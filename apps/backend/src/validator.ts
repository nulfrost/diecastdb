import { z } from "zod/v4";
import { validator } from "hono/validator";

const queryParamSchema = z.object({
  limit: z
    .union([z.literal("25"), z.literal("25"), z.literal("100")])
    .optional(),
});

export function queryParamValidator() {
  return validator("query", (value, c) => {
    const parsed = queryParamSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        status: 400,
        title: "Error: Invalid query parameter value",
        detail:
          "The value you've entered for the limit query parameter is invalid, limit accepts one of the following values: 25, 50, 100",
      });
    }

    return parsed.data;
  });
}
