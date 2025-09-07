export interface Hotwheel {
	id: number;
	image_url: string;
	model_number: string;
	name: string;
	series: string;
	year: string;
	designers: Designer[];
}

export interface Designer {
	id: number;
	name: string;
	title: string;
	description: string;
}
