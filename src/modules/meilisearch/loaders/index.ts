import { LoaderOptions } from '@medusajs/types'
import { MeiliSearchService } from '../services'
import { MeilisearchPluginOptions } from '../types'
import { asClass, asValue } from 'awilix'

//import meiliSearchLoader from './index_ho'

export default async function meiliSearchLoader({
  container,
  options,
}: LoaderOptions<MeilisearchPluginOptions>): Promise<void> {
  if (!options) {
    throw new Error('Missing meilisearch configuration')
  }

  const logger = container.resolve('logger')

  //logger.info('MeiliSearch loader executed - waiting for system ready event')

  //const meilisearch = new MeiliSearchService(container, options)
  // Registra las opciones y una versión inicial del servicio
  container.register({
    meilisearchOptions: asValue(options),
  })

  container.register({
    meilisearchService: asClass(MeiliSearchService).singleton(),
  })
  logger.info('MeiliSearch loader executed - waiting for system ready event')
}

meiliSearchLoader.priority = 500
