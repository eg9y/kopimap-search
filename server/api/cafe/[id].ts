import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_API_KEY,
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cafe ID is required',
    })
  }

  try {
    const index = client.index('cafes')
    const cafe = await index.getDocument(id)
    return cafe
  } catch (error) {
    console.error('Error fetching cafe:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching cafe details',
    })
  }
})