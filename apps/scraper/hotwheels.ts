import * as cheerio from "cheerio";
import { URL } from "node:url";
import "dotenv/config";
import { BASE_URL } from "./constants";
import { fetchWithRetry, query } from "./utils";
import type { YearLink, Car, Designer } from "./types";

const START_URL = `${BASE_URL}/wiki/Hot_Wheels`;

type CarWithoutId = Omit<Car, "id">;

const EXCLUDED_DESIGNER_WORDS: string[] = ["Retool"]; // Add more words to exclude here

function filterExcludedWords(name: string, excludedWords: string[]): boolean {
	return excludedWords.every(
		(word) => !name.toLowerCase().includes(word.toLowerCase()),
	);
}

async function getYearLinks(url: string): Promise<YearLink[]> {
	const { data } = await fetchWithRetry(url);
	const $ = cheerio.load(data);
	const yearLinks: YearLink[] = [];

	$('a[href*="List_of_"]').each((i, el) => {
		let href = $(el).attr("href") || "";
		const match = href.match(/List_of_(\d{4})_Hot_Wheels/);
		if (match) {
			// @ts-ignore
			const year = Number.parseInt(match[1], 10);
			if (!href.startsWith("http")) {
				href = new URL(href, BASE_URL).href;
			}
			yearLinks.push({ year, url: href });
		}
	});

	const seen = new Set<number>();
	return yearLinks
		.filter((link) => {
			if (seen.has(link.year)) return false;
			seen.add(link.year);
			return true;
		})
		.sort((a, b) => a.year - b.year);
}

async function scrapeCarDetailPage(url: string): Promise<CarWithoutId> {
	const { data } = await fetchWithRetry(url);
	const $ = cheerio.load(data);
	const infobox = $(".portable-infobox");

	const name =
		infobox.find("h2.pi-item").text().trim() ||
		$("h1.page-header__title").text().trim();
	const image_url = infobox.find("figure img").attr("src") || null;

	let producedYear: string | null = null;
	infobox.find('.pi-item a[href*="/wiki/"]').each((i, el) => {
		const text = $(el).text().trim();
		if (/^\d{4}$/.test(text)) {
			producedYear = text;
			return false; // break out of loop after first match
		}
	});

	const fields: CarWithoutId = {
		name,
		image_url,
		year: producedYear,
		series: null,
		designers: [],
		model_number: null,
	};

	infobox.find(".pi-item").each((i, el) => {
		const label = $(el).find(".pi-data-label").text().toLowerCase().trim();

		if (label.includes("series")) {
			fields.series = $(el).find(".pi-data-value").text().trim();
		} else if (label.includes("designer")) {
			fields.designers = $(el)
				.find(".pi-data-value a")
				.map((i, link) => $(link).text().trim())
				.get()
				.filter(
					(name: string) =>
						name && filterExcludedWords(name, EXCLUDED_DESIGNER_WORDS),
				);
		} else if (label.includes("number")) {
			fields.model_number = $(el).find(".pi-data-value").text().trim();
		}
	});

	return fields;
}

async function scrapeHotWheelsList(
	year: number,
	url: string,
): Promise<CarWithoutId[]> {
	const { data } = await fetchWithRetry(url);
	const $ = cheerio.load(data);
	const cars: Omit<Car, "id">[] = [];

	const detailLinks: string[] = [];

	$("table.wikitable tbody tr").each((i, el) => {
		const link = $(el).find("td:nth-child(2) a").attr("href");
		if (link) {
			const detailUrl = new URL(link, BASE_URL).href;
			detailLinks.push(detailUrl);
		}
	});

	for (const link of detailLinks) {
		console.log(`Fetching car details from ${link}`);
		try {
			const car = await scrapeCarDetailPage(link);
			cars.push(car);
		} catch (err: unknown) {
			if (err instanceof Error) {
				console.warn(`Failed to fetch car from ${link}: ${err.message}`);
			}
		}
	}

	return cars;
}

(async () => {
	try {
		await query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='hotwheels'");
		await query("DELETE FROM hotwheel_designers;");
		await query("DELETE FROM hotwheels;");

		// const designers = await prisma.designer.findMany();
		// if (designers.length === 0) {
		// 	throw new Error(
		// 		"!! PLEASE RUN THE DESIGNER SEED SCRIPT FIRST BEFORE THIS ONE: pnpm scrape:designers",
		// 	);
		// }

		const yearLinks = await getYearLinks(START_URL);
		const allCars: CarWithoutId[] = [];

		for (const { year, url } of yearLinks) {
			console.log(`Scraping ${year} from ${url}`);
			const cars = await scrapeHotWheelsList(year, url);
			allCars.push(...cars);
		}
		for (const car of allCars) {
			try {
				const insertHW = await query<Car>(
					"INSERT INTO hotwheels (name, image_url, year, series, model_number) VALUES (?, ?, ?, ?, ?) RETURNING id",
					[
						car.name,
						car.image_url ?? null,
						car.year ?? null,
						car.series ?? null,
						car.model_number ?? null,
					],
				);

				const hotwheelId = insertHW?.[0]?.results?.[0]?.id;

				for (const name of car.designers) {
					const trimmedDesignerName = name.trim();

					const designerRows = await query<Designer>(
						"SELECT id FROM designers WHERE name = ? LIMIT 1",
						[trimmedDesignerName],
					);

					// should figure out what to actually put here, doesn't stop the script if not found anyways
					if (designerRows.length === 0) {
						console.warn(`Designer not found in DB: ${name}`);
						continue;
					}

					const designerId = designerRows?.[0]?.results?.[0]?.id;

					await query(
						"INSERT OR IGNORE INTO hotwheel_designers (hotwheel_id, designer_id) VALUES (?, ?)",
						[hotwheelId, designerId],
					);
				}

				console.log(`Inserted and linked hotwheel: ${car.name}`);
			} catch (err: unknown) {
				if (err instanceof Error) {
					console.error(`Failed to insert ${car.name}: ${err.message}`);
				}
			}
		}

		console.log(`Scraped a total of ${allCars.length} cars across all years.`);
	} catch (error) {
		console.error("Scraping failed:", error);
	}
})();
