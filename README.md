# Cafe Search API Documentation

This API allows you to search for cafes based on various criteria, including location, ratings, and specific attributes.

## Base URL

```
https://your-api-base-url.com/api/search
```

## Query Parameters

- `q` (string): The search query term.
- `page` (integer): The page number for pagination (default: 1).
- `hitsPerPage` (integer): The number of results per page (default: 20).
- `lat` (float): Latitude for geosearch.
- `lng` (float): Longitude for geosearch.
- `radius` (integer): Radius in meters for geosearch.
- `minRating` (float): Minimum rating filter.

Additional attribute filters (all string type):
- `accessibility_mode`
- `bathroom_availability_mode`
- `cleanliness_mode`
- `coffee_quality_mode`
- `food_options_mode`
- `instagram_worthy_mode`
- `non_coffee_options_mode`
- `outdoor_seating_mode`
- `overall_vibe_mode`
- `parking_mode`
- `pet_friendly_mode`
- `power_outlets_mode`
- `seating_comfort_mode`
- `unique_offering_mode`
- `value_for_money_mode`
- `wifi_reliability_mode`
- `work_space_mode`

## Examples

### Basic Search

Search for cafes with the term "coffee":

```bash
curl "https://your-api-base-url.com/api/search?q=coffee"
```

### Geosearch

Search for cafes within a 2km radius of a specific point:

```bash
curl "https://your-api-base-url.com/api/search?lat=-6.2088&lng=106.8456&radius=2000"
```

### Combined Search and Geosearch

Search for "Starbucks" within a 3km radius:

```bash
curl "https://your-api-base-url.com/api/search?q=Starbucks&lat=-6.2088&lng=106.8456&radius=3000"
```

### Using Bounding Box

To search within the specified bounding box, you can use the following coordinates:

- Top-left: 106.526998, -6.526709
- Bottom-right: 107.152031, -6.021617

Use these coordinates with the `_geoBoundingBox` filter:

```bash
curl "https://your-api-base-url.com/api/search?filter=_geoBoundingBox([107.152031, -6.021617], [106.526998, -6.526709])"
```

### Filtering by Rating

Search for highly-rated cafes (rating 4.5 or above):

```bash
curl "https://your-api-base-url.com/api/search?minRating=4.5"
```

### Using Attribute Filters

Search for cafes with full menu and ample parking:

```bash
curl "https://your-api-base-url.com/api/search?food_options_mode=Full%20Menu&parking_mode=Ample"
```

### Combining Multiple Filters

Search for highly-rated cafes with WiFi within a specific area:

```bash
curl "https://your-api-base-url.com/api/search?minRating=4.5&wifi_reliability_mode=Very%20Reliable&lat=-6.2088&lng=106.8456&radius=2000"
```

## Response Format

The API returns a JSON object with the following structure:

```json
{
  "hits": [
    {
      "id": "string",
      "name": "string",
      "address": "string",
      "gmaps_rating": number,
      "_geo": {
        "lat": number,
        "lng": number
      },
      // ... other cafe attributes
    }
  ],
  "totalHits": number,
  "page": number,
  "hitsPerPage": number,
  "processingTimeMs": number
}
```

## Error Handling

In case of errors, the API will return appropriate HTTP status codes along with error messages. Common error codes include:

- 400: Bad Request (invalid parameters)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error