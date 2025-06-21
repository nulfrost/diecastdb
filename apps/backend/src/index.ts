import { Hono } from "hono";
import { drizzle, schema } from "@hotwheels-api/database"

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text(`
  < Hotwheels API >

  API Routes: /hotwheels, /hotwheels/{id}

  Code: https://github.com/nulfrost/hotwheels-api

  `);
});

app.get("/hotwheels", async (c) => {
  // const { results } = await c.env.DB.prepare(
  //   "SELECT * FROM hotwheels LIMIT 50",
  // ).all();

  const db = drizzle(c.env.DB)
  const results = await db.select().from(schema.hotwheels).all()

  return c.json(results);
});

app.get("/hotwheels/:id", async (c) => {
  const { id } = c.req.param()
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM hotwheels WHERE id = ? LIMIT 50",
  ).bind(id).all()
  return c.json(results)
})

app.get("/healthcheck", (c) => {
  return c.json({ message: "OK", status: 200 });
});

export default app;
