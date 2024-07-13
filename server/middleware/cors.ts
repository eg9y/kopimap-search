
import { defineEventHandler, appendHeader } from 'h3'

export default defineEventHandler((event) => {
  const allowedOrigins = ['http://localhost:5173', 'https://kopimap.com']
  const origin = getRequestHeader(event, 'origin')

  if (origin && allowedOrigins.includes(origin)) {
    appendHeader(event, 'Access-Control-Allow-Origin', origin)
    appendHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    appendHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    appendHeader(event, 'Access-Control-Allow-Credentials', 'true')
  }

  // Handle preflight requests
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
    return
  }
})