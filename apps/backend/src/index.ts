import { Hono } from "hono";
import { drizzle, schema, clause } from "@hotwheels-api/database"
import { DEFAULT_LIMIT } from "./constants"
import { cors } from "hono/cors"
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(cors({ origin: "*", allowMethods: ['GET', 'OPTIONS'] }))
app.use(secureHeaders())
app.use(logger())

app.get("/", (c) => {
  return c.text(`
  < Hotwheels API >

  API Routes: /hotwheels, /hotwheels/{id}, /designers, /designers/{id}

  Code: https://github.com/nulfrost/hotwheels-api

  `);
});

app.get("/hotwheels", async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.hotwheels.findMany({
    limit: DEFAULT_LIMIT
  })

  return c.json({ data: results });
});

app.get("/hotwheels/:id", async (c) => {
  const { id } = c.req.param()
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.hotwheels.findFirst({
    where: clause.eq(schema.hotwheels.id, +id)
  })
  return c.json({ data: result })
})

app.get("/designers", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.designers.findMany({
    limit: DEFAULT_LIMIT
  })
  return c.json({ data: result })
})


app.get("/designers/:id", async (c, next) => {
  const { id } = c.req.param()
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.designers.findFirst({
    where: clause.eq(schema.designers.id, +id)
  })
  return c.json({ data: result })
})

app.get("/healthcheck", (c) => {
  return c.json({ message: "OK", status: 200 });
});

app.notFound(c => {
  return c.json({
    status: 404,
    title: "Error: Resource could not be found",
    detail: `The resource requested at ${c.req.path} could not be found.`
  }, 404)
})

app.onError((err, c) => {
  return c.json({
    status: 500,
    title: "Error: Server could not process request",
    detail: "An error has occurred on the server and could not recover. Please report this error."
  }, 500)
})
export default app;
