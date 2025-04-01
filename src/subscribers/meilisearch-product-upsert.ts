import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, ProductEvents, SearchUtils } from '@medusajs/utils'
import { MeiliSearchService } from '../modules/meilisearch'
import { QueryContext } from '@medusajs/framework/utils'

export default async function meilisearchProductUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const meilisearchService: MeiliSearchService = container.resolve('meilisearch')

  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*', // Todos los campos del producto
      'options.*', // Todas las opciones del producto
      'images.*', // Todas las imágenes del producto
      'tags.*', // Todos los tags del producto
      'categories.*', // Todas las categorías del producto
      'variants.*', // Todos los campos de las variantes
      'variants.calculated_price.*', // Precios calculados de las variantes
    ],
    filters: {
      id: productId, // Filtrar por el ID del producto
    },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: meilisearchService.options.regionId, // ID de la región para el cálculo de precios
          currency_code: meilisearchService.options.currencyCode, // Código de moneda para el cálculo de precios
          // Opcional: country_code: "US" para incluir impuestos
        }),
      },
    },
  })

  const product = products[0]

  if (product.status === 'published') {
    await meilisearchService.addDocuments('products', [product], SearchUtils.indexTypes.PRODUCTS)
  } else {
    // Si el estado no es "published", elimina el documento de MeiliSearch
    await meilisearchService.deleteDocument('products', productId)
  }
}
//******************************************************************************* */
// const productId = data.id
// const productModuleService = container.resolve(Modules.PRODUCT)
// const meilisearchService: MeiliSearchService = container.resolve('meiliserch')
// const product = await productModuleService.retrieveProduct(productId, {
//   relations: ['*', 'options', 'images', 'tags', 'variants', 'categories'],
// })
// if (product.status === 'published') {
//   // If status is "published", add or update the document in MeiliSearch
//   await meilisearchService.addDocuments('products', [product], SearchUtils.indexTypes.PRODUCTS)
// } else {
//   // If status is not "published", remove the document from MeiliSearch
//   await meilisearchService.deleteDocument('products', productId)
// }

export const config: SubscriberConfig = {
  event: [ProductEvents.PRODUCT_CREATED, ProductEvents.PRODUCT_UPDATED],
}
