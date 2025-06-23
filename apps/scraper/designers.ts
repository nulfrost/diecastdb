import * as cheerio from "cheerio";
import { URL } from "node:url";
import { BASE_URL } from "./constants";
import { fetchWithRetry, query } from "./utils";
import type { Designer } from "./types";

type DesignerWithoutId = Omit<Designer, "id">;

const START_URL = `${BASE_URL}/wiki/Category:Designers`;

async function getDesignerLinks(startUrl: string): Promise<string[]> {
	const html = await fetchWithRetry(startUrl);
	const $ = cheerio.load(html);
	const links: string[] = [];

	$(".category-page__members a.category-page__member-link").each((_, el) => {
		const href = $(el).attr("href");
		if (href) {
			const fullUrl = new URL(href, BASE_URL).href;
			links.push(fullUrl);
		}
	});

	return links;
}

async function scrapeDesignerDetailPage(
	url: string,
): Promise<DesignerWithoutId> {
	const html = await fetchWithRetry(url);
	const $ = cheerio.load(html);

	const name = $("h1.page-header__title").text().trim();

	let title = "Designer";
	const titleContainer = $('[data-source="title"]');
	if (titleContainer.length) {
		const valueElement = titleContainer.find(".pi-data-value").first();
		if (valueElement.length) {
			const extractedTitle = valueElement.text().trim();
			if (extractedTitle) {
				title = extractedTitle;
			}
		}
	}

	let description: string | null = null;
	$(".mw-content-ltr.mw-parser-output > p").each((_, el) => {
		const text = $(el).text().trim();
		if (text) {
			description = text;
			return false; // Break after first non-empty paragraph
		}
	});

	return { name, title, description };
}

(async () => {
	try {
		await query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='designers'");
		await query("DELETE FROM designers;");
		const links = await getDesignerLinks(START_URL);
		const designers: DesignerWithoutId[] = [];

		for (const link of links) {
			console.log(`Scraping designer: ${link}`);
			try {
				const designer = await scrapeDesignerDetailPage(link);
				designers.push(designer);
				await query(
					"INSERT INTO designers (name, title, description) VALUES (?, ?, ?)",
					[designer.name, designer.title, designer.description ?? null],
				);

				console.log(`Inserted designer: ${designer.name}`);
			} catch (err) {
				if (err instanceof Error) {
					console.warn(`Failed to fetch designer from ${link}: ${err.message}`);
				}
			}
		}

		console.log(`Scraped a total of ${designers.length} designers.`);
	} catch (error) {
		console.error("Designer scraping failed:", error);
	}
})();
