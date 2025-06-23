// Enhanced scraper to follow car detail links and extract full data

import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "node:url";
import "dotenv/config";

const BASE_URL = "https://hotwheels.fandom.com";
const START_URL = `${BASE_URL}/wiki/Hot_Wheels`;
const DATABASE_ID = process.env.D1_DATABASE_ID;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

const EXCLUDED_DESIGNER_WORDS: string[] = ["Retool"]; // Add more words to exclude here

interface YearLink {
	year: number;
	url: string;
}

interface Car {
	name: string;
	image_url: string | null;
	year: string | null;
	series: string | null;
	designers: string[];
	model_number: string | null;
}

async function runQuery(sql: string, params: any[] = []) {
	const res = await fetch(API_BASE, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ sql, params }),
	});

	const data = await res.json();
	if (!data.success) {
		console.error("D1 Error:", data.errors);
		throw new Error(data.errors.map((e: any) => e.message).join(", "));
	}

	return data.result;
}

function filterExcludedWords(name: string, excludedWords: string[]): boolean {
	return excludedWords.every(
		(word) => !name.toLowerCase().includes(word.toLowerCase()),
	);
}

async function fetchWithRetry(
	url: string,
	retries = 3,
	delay = 1000,
): Promise<any> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await axios.get(url);
		} catch (error: unknown) {
			if (error instanceof Error) {
				if (attempt === retries) throw error;
				console.warn(
					`Retrying (${attempt}/${retries}) after error: ${error.message}`,
				);
				await new Promise((res) => setTimeout(res, delay));
			}
		}
	}
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

async function scrapeCarDetailPage(url: string): Promise<Car> {
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

	const fields: Car = {
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

async function scrapeHotWheelsList(year: number, url: string): Promise<Car[]> {
	const { data } = await fetchWithRetry(url);
	const $ = cheerio.load(data);
	const cars: Car[] = [];

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
		await runQuery("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='hotwheels'");
		await runQuery("DELETE FROM hotwheel_designers;");
		await runQuery("DELETE FROM hotwheels;");

		// const designers = await prisma.designer.findMany();
		// if (designers.length === 0) {
		// 	throw new Error(
		// 		"!! PLEASE RUN THE DESIGNER SEED SCRIPT FIRST BEFORE THIS ONE: pnpm scrape:designers",
		// 	);
		// }

		const yearLinks = await getYearLinks(START_URL);
		const allCars: Car[] = [];

		for (const { year, url } of yearLinks) {
			console.log(`Scraping ${year} from ${url}`);
			const cars = await scrapeHotWheelsList(year, url);
			allCars.push(...cars);
		}
		for (const car of allCars) {
			try {
				const insertHW = await runQuery(
					"INSERT INTO hotwheels (name, image_url, year, series, model_number) VALUES (?, ?, ?, ?, ?) RETURNING id",
					[
						car.name,
						car.image_url ?? null,
						car.year ?? null,
						car.series ?? null,
						car.model_number ?? null,
					],
				);

				const hotwheelId = insertHW[0].results[0].id;

				for (const name of car.designers) {
					const trimmedDesignerName = name.trim();

					const designerRows = await runQuery(
						"SELECT id FROM designers WHERE name = ? LIMIT 1",
						[trimmedDesignerName],
					);

					// should figure out what to actually put here, doesn't stop the script if not found anyways
					if (designerRows === 0) {
						console.warn(`Designer not found in DB: ${name}`);
						continue;
					}

					const designerId = designerRows[0].results[0].id;

					await runQuery(
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
