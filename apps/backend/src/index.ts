import { Hono } from "hono";
import { drizzle, schema, clause } from "@hotwheels-api/database"

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text(`
  < Hotwheels API >

  API Routes: /hotwheels, /hotwheels/{id}, /designers, /designers/{id}

  Code: https://github.com/nulfrost/hotwheels-api

  `);
});

app.get("/hotwheels", async (c) => {
  const db = drizzle(c.env.DB)
  const results = await db.select().from(schema.hotwheels).all()

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
  const result = await db.query.designers.findMany()
  return c.json({ data: result })
})


app.get("/designers/:id", async (c) => {
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

export default app;
