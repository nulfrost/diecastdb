import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text(`
  < Hotwheels API >

  Version: 0.1

  API Routes: /hotwheels, /hotwheels/{id}

  Code: https://github.com/nulfrost/hotwheels-api

  Last Updated: ${new Date().toLocaleString()}
  `)
});

app.get("/healthcheck", (c) => {
  return c.json({ message: "OK", status: 200 })
})

export default app;
