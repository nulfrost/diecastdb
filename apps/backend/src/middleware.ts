import { createMiddleware } from "hono/factory";
import { logger } from "./logger";
import { getConnInfo } from "hono/cloudflare-workers";

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const info = getConnInfo(c);
  logger.info(
    `${info.remote.address} ${new Date().toISOString()} "${c.req.method} ${c.req.path}" ${c.get("requestId")}`,
  );
  await next();
});
