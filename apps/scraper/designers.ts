import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { prisma } from "@hotwheels-api/database"

const BASE_URL = 'https://hotwheels.fandom.com';
const START_URL = `${BASE_URL}/wiki/Category:Designers`;


interface Designer {
  name: string;
  title: string;
  description: string | null;
}

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      if (attempt === retries) throw error;
      console.warn(`Retrying (${attempt}/${retries}) after error: ${error.message}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Failed to fetch after retries');
}

async function getDesignerLinks(startUrl: string): Promise<string[]> {
  const html = await fetchWithRetry(startUrl);
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('.category-page__members a.category-page__member-link').each((_, el) => {
    const href = $(el).attr('href');
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

  const name = $('h1.page-header__title').text().trim();

  let title: string = 'Designer';
  const titleContainer = $('[data-source="title"]');
  if (titleContainer.length) {
    const valueElement = titleContainer.find('.pi-data-value').first();
    if (valueElement.length) {
      const extractedTitle = valueElement.text().trim();
      if (extractedTitle) {
        title = extractedTitle;
      }
    }
  }

  let description: string | null = null;
  $('.mw-content-ltr.mw-parser-output > p').each((_, el) => {
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
    const links = await getDesignerLinks(START_URL);
    const designers: Designer[] = [];

    for (const link of links) {
      console.log(`Scraping designer: ${link}`);
      try {
        const designer = await scrapeDesignerDetailPage(link);
        designers.push(designer);
      } catch (err: any) {
        console.warn(`Failed to fetch designer from ${link}: ${err.message}`);
      }
    }

    await prisma.designer.deleteMany()
    // fs.writeFileSync('hotwheels_designers.json', JSON.stringify(designers, null, 2));
    const insertedDesigners = await prisma.designer.createManyAndReturn({
      data: designers
    })

    console.log({ insertedDesigners })
    console.log(`Scraped a total of ${designers.length} designers.`);
  } catch (error) {
    console.error('Designer scraping failed:', error);
  }
})();
