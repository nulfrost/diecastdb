import { API_BASE, API_TOKEN, BASE_URL } from "./constants";
import type { D1HTTPResponse } from "./types";
import { ofetch } from "ofetch";

export async function query<T>(sql: string, params: unknown[] = []) {
	const res = await fetch(API_BASE, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ sql, params }),
	});

	const data: D1HTTPResponse<T> = await res.json();
	if (!data.success) {
		console.error("D1 Error:", data.errors);
		throw new Error(data.errors.map((e) => e.message).join(", "));
	}

	return data.result;
}

export const fetchWithRetry = ofetch.create({
	retry: 3,
	retryDelay: 1000,
	retryStatusCodes: [400, 408, 500],
});
