import { Hono } from "hono";
import prismaClient from "../lib/prisma"

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text(`
  < Hotwheels API >

  API Routes: /hotwheels, /hotwheels/{id}

  Code: https://github.com/nulfrost/hotwheels-api

  `)
});

app.get("/hotwheels", async (c) => {
  const prisma = await prismaClient.fetch(c.env.DB)

  const hotwheels = await prisma.hotwheel.findMany()

  return c.json(hotwheels)
})

app.get("/healthcheck", (c) => {
  return c.json({ message: "OK", status: 200 })
})

export default app;
