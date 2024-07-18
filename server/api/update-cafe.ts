import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY,
  })

export default defineEventHandler(async (event) => {
  // Ensure this is a PUT request
  if (event.node.req.method !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  }

  // Extract the authorization header
  const authHeader = event.node.req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Missing or invalid Authorization header',
    })
  }

  const providedApiKey = authHeader.split(' ')[1]

  // Compare the provided API key with the stored one
  if (providedApiKey !== process.env.SECRET_KEY) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid API key',
    })
  }

  // Parse the request body
  const body = await readBody(event)

  // Validate the request body
  if (!body || typeof body !== 'object' || !body.place_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body. Must include cafe ID.',
    })
  }

  const { place_id, ...updateData } = body

  try {
    const index = client.index('cafes')

    // Update the document in Meilisearch
    await index.updateDocuments([
      {
        id: place_id,
        ...updateData,
      },
    ])

    return {
      message: 'Cafe updated successfully',
    }
  } catch (error) {
    console.error('Meilisearch update error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error updating cafe',
    })
  }
})
