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

  const logger = container.resolve('logger')

  // Registra las opciones y una versión inicial del servicio
  container.register({
    meilisearchOptions: asValue(options),
    meilisearchService: asClass(MeiliSearchService).singleton(),
  })

  logger.info('MeiliSearch loader executed - waiting for system ready event')
}

// export default async function meiliSearchLoader({
//   container,
//   options,
// }: LoaderOptions<MeilisearchPluginOptions>): Promise<void> {
//   if (!options) {
//     throw new Error('Missing meilisearch configuration')
//   }
//   const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
//   console.log('loading logger', logger)

//   // Función para resolver con reintentos
//   const resolveWithRetry = async (key, maxRetries = 10, delay = 1000) => {
//     let retries = 0

//     while (retries < maxRetries) {
//       try {
//         return container.resolve(key)
//       } catch (error) {
//         logger.warn(`Intento ${retries + 1}/${maxRetries} fallido para resolver ${key}: ${error.message}`)
//         retries++

//         if (retries >= maxRetries) {
//           throw error
//         }

//         // Esperar antes del siguiente intento
//         await new Promise((resolve) => setTimeout(resolve, delay))
//       }
//     }
//   }

//   try {
//     // Intentar resolver query con reintentos
//     const query = await resolveWithRetry(ContainerRegistrationKeys.QUERY)

//     container.register({
//       logger: asValue(logger),
//       query: asValue(query),
//       options: asValue(options),
//     })

//     container.register({
//       meilisearchService: asClass(MeiliSearchService).singleton(),
//     })

//     const { settings } = options

//     await Promise.all(
//       Object.entries(settings || {}).map(async ([indexName, value]) => {
//         return await (container.resolve('meilisearchService') as MeiliSearchService).updateSettings(indexName, value)
//       }),
//     )
//   } catch (error) {
//     logger.error(`No se pudo cargar la dependencia query: ${error.message}`)
//     throw error
//   }
// }

// meiliSearchLoader.priority = 10
