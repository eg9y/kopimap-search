// server/api/upload.ts

import https from "https";
import { defineEventHandler, getHeader, readMultipartFormData } from "h3";
import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
	// Extract the Authorization header
	const authHeader = getHeader(event, "authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return {
			statusCode: 401,
			body: { error: "Unauthorized: No token provided" },
		};
	}

	const token = authHeader.substring(7); // Remove 'Bearer ' prefix

	// Verify the JWT token
	try {
		const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
		if (!supabaseJwtSecret) {
			throw new Error(
				"Supabase JWT secret is not set in environment variables",
			);
		}

		const decodedToken = jwt.verify(token, supabaseJwtSecret);

		// You can access user information from decodedToken if needed
		// For example: const userId = decodedToken.sub;
	} catch (error) {
		console.error("JWT verification failed:", error);
		return {
			statusCode: 401,
			body: { error: "Unauthorized: Invalid token" },
		};
	}

	// Proceed with handling the request as before
	const form = await readMultipartFormData(event);

	if (!form) {
		return { statusCode: 400, body: { error: "No files uploaded" } };
	}

	// Find the file and placeId
	const file = form.find((part) => part.name === "file" && part.filename);
	const placeIdField = form.find((part) => part.name === "placeId");

	if (!file) {
		return { statusCode: 400, body: { error: "No file field in the upload" } };
	}

	const placeId = placeIdField
		? placeIdField.data.toString("utf-8")
		: "unknown";

	// Prepare for uploading to Bunny CDN
	const storageZoneName = "kopimap"; // Replace with your storage zone name
	const storageZonePassword = process.env.BUNNY_STORAGE_PASSWORD;
	const region = "sg"; // Use 'sg' for Singapore region
	const hostname = `${region}.storage.bunnycdn.com`;
	const filePath = `/${storageZoneName}/review-images/${placeId}/${file.filename}`;

	const options: https.RequestOptions = {
		method: "PUT",
		host: hostname,
		path: filePath,
		headers: {
			AccessKey: storageZonePassword || "",
			"Content-Type": file.type || "application/octet-stream",
			"Content-Length": file.data.length,
		},
	};

	try {
		const response = await new Promise<{
			statusCode: number;
			body: string;
		}>((resolve, reject) => {
			const req = https.request(options, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk.toString("utf8");
				});
				res.on("end", () => {
					resolve({
						statusCode: res.statusCode ?? 0,
						body: data,
					});
				});
			});

			req.on("error", (error) => {
				reject(error);
			});

			req.write(file.data);
			req.end();
		});

		if (response.statusCode >= 200 && response.statusCode < 300) {
			// Construct the URL to access the file
			const cdnHostname = "kopimap-cdn.b-cdn.net";
			const fileUrl = `https://${cdnHostname}/review-images/${placeId}/${file.filename}`;

			return { url: fileUrl };
		} else {
			console.error("Bunny CDN upload failed:", response.body);
			return {
				statusCode: 500,
				body: { error: "Failed to upload to Bunny CDN" },
			};
		}
	} catch (error) {
		console.error("Error uploading to Bunny CDN:", error);
		return {
			statusCode: 500,
			body: { error: "Failed to upload to Bunny CDN" },
		};
	}
});
