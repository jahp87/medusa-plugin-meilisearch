import { LoaderOptions } from '@medusajs/types'
import { MeiliSearchService } from '../services'
import { MeilisearchPluginOptions } from '../types'
import { asClass, asValue } from 'awilix'

export default async ({ container, options }: LoaderOptions<MeilisearchPluginOptions>): Promise<void> => {
  if (!options) {
    throw new Error('Missing meilisearch configuration')
  }

  //const meilisearchService: MeiliSearchService = new MeiliSearchService(container, options)
  const { settings } = options

  container.register({
    options: asValue(options),
    container: asValue(container),
  })

  container.register({
    meilisearchService: asClass(MeiliSearchService).singleton(),
  })

  await Promise.all(
    Object.entries(settings || {}).map(async ([indexName, value]) => {
      const meilisearchService = container.resolve('meilisearchService') as MeiliSearchService
      return await meilisearchService.updateSettings(indexName, value)
    }),
  )
}
