// nitro/server/middleware/cors.ts

import { appendHeader, defineEventHandler, getRequestHeader } from "h3";

export default defineEventHandler((event) => {
	const allowedOrigins = [
		"http://localhost:5173",
		"http://localhost:3001",
		"https://kopimap.com",
		"https://www.kopimap.com",
		"capacitor://localhost",
	];
	const origin = getRequestHeader(event, "origin");

	if (origin && allowedOrigins.includes(origin)) {
		appendHeader(event, "Access-Control-Allow-Origin", origin);
		appendHeader(event, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		appendHeader(
			event,
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization",
		);
		appendHeader(event, "Access-Control-Allow-Credentials", "true");
	}

	// Handle preflight requests
	if (event.node.req.method === "OPTIONS") {
		event.node.res.statusCode = 204;
		event.node.res.end();
		return;
	}
});
