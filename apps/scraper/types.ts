export interface D1HTTPResponse<T> {
	errors: ResponseInfo[];
	messages: ResponseInfo[];
	result: QueryResult<T>[];
	success: boolean;
}

interface ResponseInfo {
	code: number;
	message: string;
	documentation_url?: string;
	source: unknown;
}

export interface QueryResult<T> {
	meta?: {
		changed_db?: boolean;
		changes?: number;
		duration?: number;
		last_row_id?: number;
		rows_read?: number;
		served_by_primary?: boolean;
		served_by_region?: "WNAM" | "ENAM" | "WEUR" | "EEUR" | "APAC" | "OC";
		sized_after?: number;
		timings?: {
			sql_duration_ms?: number;
		};
	};
	results?: Array<T>;
	success?: boolean;
}

export interface Designer {
	id: number;
	name: string;
	title: string;
	description: string | null;
}

export interface YearLink {
	year: number;
	url: string;
}

export interface Car {
	id: number;
	name: string;
	image_url: string | null;
	year: string | null;
	series: string | null;
	designers: string[];
	model_number: string | null;
}
