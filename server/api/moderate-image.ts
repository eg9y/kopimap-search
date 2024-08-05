import { createError, defineEventHandler, readBody } from 'h3'
import NSFWFilter from 'nsfw-filter'

export default defineEventHandler(async (event) => {
  // Ensure this is a POST request
  if (event.node.req.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  }

  try {
    // Parse the request body
    const body = await readBody(event)

    // Validate the request body
    if (!body || !body.imageBase64) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. Must include imageBase64.',
      })
    }

    const { imageBase64 } = body

    // Convert base64 to File object
    const byteCharacters = atob(imageBase64.split(',')[1])
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })

    // Perform NSFW check
    const predictions = await NSFWFilter.predictImg(file, 3)
    const pornPrediction = predictions.find(
      ({ className }) => className === 'Porn'
    )
    const hentaiPrediction = predictions.find(
      ({ className }) => className === 'Hentai'
    )

    const isSafe = !(
      (pornPrediction && pornPrediction.probability > 0.25) ||
      (hentaiPrediction && hentaiPrediction.probability > 0.25)
    )

    return {
      isSafe,
      predictions,
    }
  } catch (error) {
    console.error('NSFW moderation error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error moderating image',
    })
  }
})