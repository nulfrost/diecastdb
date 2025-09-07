import { createFileRoute } from "@tanstack/react-router";
import { hotheelsApi } from "../lib";
import type { Hotwheel } from "../lib/types";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    const response = await hotheelsApi<{ data: Hotwheel[] }>("/hotwheels", {
      query: { limit: 25 },
    });
    return response.data;
  },
});

function Index() {
  const hotwheels = Route.useLoaderData();

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Hot Wheels Collection
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover amazing die-cast cars from around the world
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotwheels.map((hotwheel) => {
            const jpgMatch = hotwheel.image_url.match(/\.jpe?g/i);
            const extension = jpgMatch ? jpgMatch[0] : '.jpg';
            const fixedImageUrl = hotwheel.image_url.split(/\.jpe?g/i)[0] + extension;
            console.log(fixedImageUrl);
            return (
              <li key={hotwheel.id}>
                <article>
                  <h2>{hotwheel.name}</h2>
                  <img
                    src={`${fixedImageUrl}.`}
                    alt={`${hotwheel.name} hotwheels car`}
                  />
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
