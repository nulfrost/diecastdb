import { ofetch } from "ofetch";

export const hotheelsApi = ofetch.create({
	baseURL: "https://diecastdb.dev/v1",
});
