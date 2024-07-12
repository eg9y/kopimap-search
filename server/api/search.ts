import { MeiliSearch } from 'meilisearch'
import { rateLimit } from '~/utils/rateLimit'
import { QueryObject } from 'ufo'

// Define a type for our attribute modes
type AttributeMode = 
  | "Not Accessible" | "Partially Accessible" | "Fully Accessible"
  | "No Bathroom" | "For Customers" | "Public Access"
  | "Poor" | "Acceptable" | "Clean" | "Very Clean"
  | "No Food" | "Snacks Only" | "Light Meals" | "Full Menu"
  | "Not Really" | "Somewhat" | "Very"
  | "Very Limited" | "Some Options" | "Great Variety"
  | "None" | "Limited" | "Ample"
  | "Relaxed" | "Energetic" | "Cozy" | "Modern" | "Artistic"
  | "No Parking" | "Limited" | "Ample"
  | "no" | "yes"
  | "None Visible" | "Limited" | "Plenty"
  | "Poor" | "Average" | "Good" | "Excellent"
  | "Basic" | "Comfortable" | "Luxurious"
  | "Standard" | "Interesting" | "Very Unique"
  | "No WiFi" | "Unreliable" | "Mostly Reliable" | "Very Reliable"
  | "Not Suitable" | "Okay" | "Good" | "Excellent"

// Define the attributes we want to filter on
const attributeFilters: (keyof QueryObject)[] = [
  'accessibility_mode',
  'bathroom_availability_mode',
  'cleanliness_mode',
  'coffee_quality_mode',
  'food_options_mode',
  'instagram_worthy_mode',
  'non_coffee_options_mode',
  'outdoor_seating_mode',
  'overall_vibe_mode',
  'parking_mode',
  'pet_friendly_mode',
  'power_outlets_mode',
  'seating_comfort_mode',
  'unique_offering_mode',
  'value_for_money_mode',
  'wifi_reliability_mode',
  'work_space_mode',
]

function buildFilters(query: QueryObject): string[] {
  const filters: string[] = []

  // Rating filter
  const minRating = parseFloat(query.minRating as string)
  if (!isNaN(minRating)) {
    filters.push(`gmaps_rating >= ${minRating}`)
  }

  // Attribute filters
  attributeFilters.forEach(attr => {
    const value = query[attr]
    if (typeof value === 'string' && isValidAttributeMode(value)) {
      filters.push(`${attr} = '${value}'`)
    }
  })

  return filters
}

function isValidAttributeMode(value: string): value is AttributeMode {
  // This function checks if the provided value is a valid AttributeMode
  const validModes: AttributeMode[] = [
    "Not Accessible", "Partially Accessible", "Fully Accessible",
    "No Bathroom", "For Customers", "Public Access",
    "Poor", "Acceptable", "Clean", "Very Clean",
    "No Food", "Snacks Only", "Light Meals", "Full Menu",
    "Not Really", "Somewhat", "Very",
    "Very Limited", "Some Options", "Great Variety",
    "None", "Limited", "Ample",
    "Relaxed", "Energetic", "Cozy", "Modern", "Artistic",
    "No Parking", "Limited", "Ample",
    "no", "yes",
    "None Visible", "Limited", "Plenty",
    "Poor", "Average", "Good", "Excellent",
    "Basic", "Comfortable", "Luxurious",
    "Standard", "Interesting", "Very Unique",
    "No WiFi", "Unreliable", "Mostly Reliable", "Very Reliable",
    "Not Suitable", "Okay", "Good", "Excellent"
  ]
  return validModes.includes(value as AttributeMode)
}


export default defineEventHandler(async (event) => {
const client = getMeiliSearchClient()
const index = client.index('cafes')

  // Apply rate limiting
  const clientIp = getRequestIP(event) ?? 'anonymous'
  const rateLimitResult = rateLimit(clientIp)
  if (!rateLimitResult.success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests, please try again later.',
    })
  }

  const query = getQuery(event)
  const searchTerm = query.q as string || ''
  const page = parseInt(query.page as string) || 1
  const hitsPerPage = parseInt(query.hitsPerPage as string) || 20

  try {
    const searchOptions: any = {
      limit: hitsPerPage,
      offset: (page - 1) * hitsPerPage,
      filter: buildFilters(query),
    }

    // Add geo search if coordinates are provided
    if (query.lat && query.lng) {
      searchOptions.sort = [`_geoPoint(${query.lat}, ${query.lng}):asc`]
    }

    const searchResults = await index.search(searchTerm, searchOptions)

    return {
      hits: searchResults.hits,
      totalHits: searchResults.estimatedTotalHits,
      page,
      hitsPerPage,
      processingTimeMs: searchResults.processingTimeMs,
    }
  } catch (error) {
    console.error('Meilisearch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error performing search',
    })
  }
})
