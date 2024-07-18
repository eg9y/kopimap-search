import { rateLimit } from '~/utils/rateLimit'
import { QueryObject } from 'ufo'
import { MeiliSearch } from 'meilisearch'

function buildFilters(query: QueryObject): string[] {
  const filters: string[] = []

  // Rating filter
  const minRating = parseFloat(query.minRating as string)
  if (!isNaN(minRating)) {
    filters.push(`gmaps_rating >= ${minRating}`)
  }

  // Dynamic attribute filters
  for (const [key, value] of Object.entries(query)) {
    if (key !== 'q' && key !== 'page' && key !== 'hitsPerPage' && key !== 'lat' && key !== 'lng' && key !== 'minRating' && key !== 'radius') {
      if (typeof value === 'string') {
        filters.push(`${key} = '${value}'`)
      }
    }
  }

  return filters
}

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_API_KEY,
})

export default defineEventHandler(async (event) => {
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

    // Add geo search if coordinates and radius are provided
    if (query.lat && query.lng && query.radius) {
      const lat = parseFloat(query.lat as string)
      const lng = parseFloat(query.lng as string)
      const radius = parseInt(query.radius as string)
      
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
        searchOptions.filter.push(`_geoRadius(${lat}, ${lng}, ${radius})`)
        searchOptions.sort = [`_geoPoint(${lat}, ${lng}):asc`]
      }
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