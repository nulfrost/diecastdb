import { Hono } from "hono";
import { drizzle, schema, clause } from "@hotwheels-api/database";
import { DEFAULT_LIMIT } from "./constants";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { queryParamValidator } from "./validator";
import { loggerMiddleware } from "./middleware";
import { requestId } from "hono/request-id";
import { cache } from "hono/cache";
import { cloudflareRateLimiter } from "@hono-rate-limiter/cloudflare";

type App = {
	Variables: {
		rateLimit: boolean;
	};
	Bindings: {
		MY_RATE_LIMITER: RateLimit;
		DB: D1Database;
	};
};

const app = new Hono<App>();
const hotwheelsApiV1 = new Hono<App>().basePath("/v1");

hotwheelsApiV1.use(cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));
hotwheelsApiV1.use(secureHeaders());
hotwheelsApiV1.use("*", requestId());
hotwheelsApiV1.use(loggerMiddleware);
hotwheelsApiV1.use(
	cloudflareRateLimiter<App>({
		rateLimitBinding: (c) => c.env.MY_RATE_LIMITER,
		// Should be using something like API keys or something here
		keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "",
		message: {
			status: 429,
			title: "Error: Rate Limit Exceeded",
			detail:
				"The rate limit for this resource has been exceeded, please try again in a few minutes.",
		},
	}),
);

app.get("/", (c) => {
	return c.text(`
  < Hotwheels API >

  API Routes: /v1/hotwheels, /v1/hotwheels/{id}, /v1/designers, /v1/designers/{id}

  Available query parameters: ?limit=25 | 50 | 100

  Requests are limited to 50 API requests every minute

  Code: https://github.com/nulfrost/hotwheels-api

  `);
});

hotwheelsApiV1.get(
	"*",
	cache({
		cacheName: "hotwheels-api",
		cacheControl: "public, s-maxage=86400",
	}),
);

hotwheelsApiV1.get("/hotwheels", queryParamValidator(), async (c) => {
	const { limit } = c.req.query();
	const db = drizzle(c.env.DB, { schema });
	const results = await db.query.hotwheels.findMany({
		limit: +limit || DEFAULT_LIMIT,
		with: {
			designers: {
				columns: {},
				with: {
					designer: true,
				},
			},
		},
	});

	const flattenedResults = results.map((result) => ({
		...result,
		designers: result.designers.map((designer) => designer.designer),
	}));

	return c.json({ data: flattenedResults });
});

hotwheelsApiV1.get("/hotwheels/:id", async (c) => {
	const { id } = c.req.param();
	const db = drizzle(c.env.DB, { schema });
	const result = await db.query.hotwheels.findFirst({
		where: clause.eq(schema.hotwheels.id, +id),
		with: {
			designers: true,
		},
	});
	return c.json({ data: result });
});

hotwheelsApiV1.get("/designers", queryParamValidator(), async (c) => {
	const db = drizzle(c.env.DB, { schema });
	const { limit } = c.req.query();
	const result = await db.query.designers.findMany({
		limit: +limit || DEFAULT_LIMIT,
	});
	return c.json({ data: result });
});

hotwheelsApiV1.get("/designers/:id", async (c) => {
	const { id } = c.req.param();
	const db = drizzle(c.env.DB, { schema });
	const result = await db.query.designers.findFirst({
		where: clause.eq(schema.designers.id, +id),
	});
	return c.json({ data: result });
});

hotwheelsApiV1.get("/healthcheck", (c) => {
	return c.json({ message: "OK", status: 200 });
});

hotwheelsApiV1.notFound((c) => {
	return c.json(
		{
			status: 404,
			title: "Error: Resource could not be found",
			detail: `The resource requested at ${c.req.path} could not be found.`,
		},
		404,
	);
});

hotwheelsApiV1.onError((_, c) => {
	console.log(c.error);
	return c.json(
		{
			status: 500,
			title: "Error: Server could not process request",
			detail:
				"An error has occurred on the server and could not recover. Please report this error.",
		},
		500,
	);
});

app.route("/", hotwheelsApiV1);

export default app;
