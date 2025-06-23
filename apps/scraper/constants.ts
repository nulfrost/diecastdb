import "dotenv/config";

export const BASE_URL = "https://hotwheels.fandom.com";
export const DATABASE_ID = process.env.D1_DATABASE_ID;
export const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
export const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
export const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
