import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "node:url";
import "dotenv/config";

const BASE_URL = "https://hotwheels.fandom.com";
const START_URL = `${BASE_URL}/wiki/Category:Designers`;

const DATABASE_ID = process.env.D1_DATABASE_ID;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

interface Designer {
	name: string;
	title: string;
	description: string | null;
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

async function fetchWithRetry(
	url: string,
	retries = 3,
	delay = 1000,
): Promise<string> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const response = await axios.get(url);
			return response.data;
		} catch (error: any) {
			if (attempt === retries) throw error;
			console.warn(
				`Retrying (${attempt}/${retries}) after error: ${error.message}`,
			);
			await new Promise((res) => setTimeout(res, delay));
		}
	}
	throw new Error("Failed to fetch after retries");
}

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

async function scrapeDesignerDetailPage(url: string): Promise<Designer> {
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
		await runQuery("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='designers'");
		await runQuery("DELETE FROM designers;");
		const links = await getDesignerLinks(START_URL);
		const designers: Designer[] = [];

		for (const link of links) {
			console.log(`Scraping designer: ${link}`);
			try {
				const designer = await scrapeDesignerDetailPage(link);
				designers.push(designer);
				await runQuery(
					"INSERT INTO designers (name, title, description) VALUES (?, ?, ?)",
					[designer.name, designer.title, designer.description ?? null],
				);

				console.log(`Inserted designer: ${designer.name}`);
			} catch (err: any) {
				console.warn(`Failed to fetch designer from ${link}: ${err.message}`);
			}
		}

		console.log(`Scraped a total of ${designers.length} designers.`);
	} catch (error) {
		console.error("Designer scraping failed:", error);
	}
})();
