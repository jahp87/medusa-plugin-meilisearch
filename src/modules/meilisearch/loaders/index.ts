import { LoaderOptions } from '@medusajs/types'
import { MeiliSearchService } from '../services'
import { MeilisearchPluginOptions } from '../types'
import { asClass, asValue } from 'awilix'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export default async function meiliSearchLoader({
  container,
  options,
}: LoaderOptions<MeilisearchPluginOptions>): Promise<void> {
  if (!options) {
    throw new Error('Missing meilisearch configuration')
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  console.log('******logger*******', logger)

  console.log('******query*******', query)

  //  const meilisearchService: MeiliSearchService = new MeiliSearchService(container, options)
  container.register({
    logger: asValue(logger),
    query: asValue(query),
    options: asValue(options),
    // meilisearchService: asValue(meilisearchService),
  })

  container.register({
    meilisearchService: asClass(MeiliSearchService).singleton(),
  })

  const { settings } = options

  await Promise.all(
    Object.entries(settings || {}).map(async ([indexName, value]) => {
      // return await meilisearchService.updateSettings(indexName, value)
      return await (container.resolve('meilisearchService') as MeiliSearchService).updateSettings(indexName, value)
    }),
  )
}

meiliSearchLoader.priority = 998
