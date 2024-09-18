import { MeiliSearch } from "meilisearch";
import { QueryObject } from "ufo";
import { rateLimit } from "~/utils/rateLimit";

function buildFilters(query: QueryObject): string[] {
  const filters: string[] = [];
  // Rating filter (At least logic)
  const rating = parseFloat(query.gmaps_rating as string);
  if (!isNaN(rating)) {
    filters.push(`gmaps_rating >= ${rating}`);
  }
  // Total reviews filter (At least logic)
  const totalReviews = parseInt(query.gmaps_total_reviews as string);
  if (!isNaN(totalReviews)) {
    filters.push(`gmaps_total_reviews >= ${totalReviews}`);
  }
  // Dynamic attribute filters
  for (const [key, value] of Object.entries(query)) {
    if (
      key !== "q" &&
      key !== "page" &&
      key !== "hitsPerPage" &&
      key !== "lat" &&
      key !== "lng" &&
      key !== "gmaps_rating" &&
      key !== "gmaps_total_reviews" &&
      key !== "radius" &&
      key !== "isIncludeDetails" &&
      (typeof value !== "string" || !isNaN(Number(value))) &&
      (typeof value !== "string" || !value.includes(","))
    ) {
      if (typeof value === "string") {
        filters.push(`${key} = ${isNaN(Number(value)) ? `'${value}'` : value}`);
      }
    } else if (typeof value === "string" && value.includes(",")) {
      const values = value.split(",");
      // JOIN WITH OR e.g. coffee_quality = Good OR coffee_quality = Excellent
      filters.push(`${key} = [${values.map((v) => `'${v}'`).join(" OR ")}]`);
    }
  }
  return filters;
}

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export default defineEventHandler(async (event) => {
  const index = client.index("cafes");
  // Apply rate limiting
  const clientIp = getRequestIP(event) ?? "anonymous";
  const rateLimitResult = rateLimit(clientIp);
  if (!rateLimitResult.success) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests, please try again later.",
    });
  }

  const query = getQuery(event);
  const searchTerm = (query.q as string) || "";
  const page = parseInt(query.page as string) || 1;
  const hitsPerPage = parseInt(query.hitsPerPage as string) || 20;
  const isIncludeDetails = query.isIncludeDetails === "true";

  try {
    const searchOptions: any = {
      limit: hitsPerPage,
      offset: (page - 1) * hitsPerPage,
      filter: buildFilters(query),
    };

    // Set the fields to retrieve based on isIncludeDetails
    if (!isIncludeDetails) {
      searchOptions.attributesToRetrieve = [
        "id",
        "gmaps_rating",
        "_geo",
        "name",
      ];
    }

    console.log("searchOptions", searchOptions);

    // Add geo search if coordinates are provided
    if (query.lat && query.lng) {
      const lat = parseFloat(query.lat as string);
      const lng = parseFloat(query.lng as string);
      if (!isNaN(lat) && !isNaN(lng)) {
        // Always sort by distance when coordinates are provided
        searchOptions.sort = [`_geoPoint(${lat}, ${lng}):asc`];
        // Only apply radius filter if there's no search term
        if (!searchTerm && query.radius) {
          const radius = parseInt(query.radius as string);
          if (!isNaN(radius)) {
            searchOptions.filter.push(`_geoRadius(${lat}, ${lng}, ${radius})`);
          }
        }
      }
    }

    const searchResults = await index.search(searchTerm, searchOptions);

    return {
      hits: searchResults.hits,
      totalHits: searchResults.estimatedTotalHits,
      page,
      hitsPerPage,
      processingTimeMs: searchResults.processingTimeMs,
    };
  } catch (error) {
    console.error("Meilisearch error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Error performing search",
    });
  }
});
