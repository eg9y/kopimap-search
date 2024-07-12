import { useRuntimeConfig } from '#imports'
import { MeiliSearch } from 'meilisearch'

let client: MeiliSearch | null = null

export function getMeiliSearchClient(): MeiliSearch {
  if (client) {
    return client
  }

  const config = useRuntimeConfig()
  console.log('config', config);
  client = new MeiliSearch({
    host: config.meilisearchHost,
    apiKey: config.meilisearchApiKey,
  })

  return client
}
