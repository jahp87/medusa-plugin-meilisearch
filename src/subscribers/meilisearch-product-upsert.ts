import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, ProductEvents, InventoryEvents, PricingEvents, SearchUtils } from '@medusajs/utils'
import { MeiliSearchService } from '../modules/meilisearch'
import { QueryContext } from '@medusajs/framework/utils'
// import { getProductsByPrefix, PrefixTypeEnum } from '../utils'
//import { PrefixTypeEnum } from '../utils'

export default async function meilisearchProductUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // let productList: string[] = []
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  //*******************************************************************
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`data ${data.id}`)

  // let type: string = ''
  // let array_id: string[] = []
  // if (Array.isArray(data.id) && data.id.length > 0) {
  //   type = data.id[0].split('_')[0]
  //   array_id = data.id
  // } else {
  //   type = data.id.split('_')[0]

  //   array_id = [data.id]
  // }

  //if ((await getProductsByPrefix(type as PrefixTypeEnum, query, id, logger)).length === 0) {\
  // if (type == PrefixTypeEnum.prod) {
  //   productList = array_id
  // } else {
  //   // Si el ID del producto empieza con "res" o "iitem", obtenemos la lista de productos
  //   const reponse_products = await getProductsByPrefix(type as PrefixTypeEnum, query, array_id, logger)

  //   productList = reponse_products
  // }
  //************************************************************************************************

  const meilisearchService: MeiliSearchService = container.resolve('meilisearch')

  logger.info('search all product')
  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*', // Todos los campos del producto
      'options.*',
      'images.*',
      'tags.*',
      'categories.*',
      'variants.*',
      'variants.calculated_price.*',
      'variants.inventory_items.*',
    ],
    // filters: {
    //   id: [productList], // Filtrar por el ID del producto
    // },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: meilisearchService.options.regionId,
          currency_code: meilisearchService.options.currencyCode,
        }),
      },
    },
  })

  for (const product of products) {
    const { data: variants } = await query.graph({
      entity: 'product_variant',
      fields: ['*', 'calculated_price.*', 'inventory_items.*'],
      filters: {
        product_id: [product.id],
      },
      context: {
        calculated_price: QueryContext({
          region_id: meilisearchService.options.regionId,
          currency_code: meilisearchService.options.currencyCode,
        }),
      },
    })
    console.log('variants', variants)
    const updatedVariants: any[] = []

    for (const variant of variants) {
      let inventoryQuantity = 0

      if (variant.inventory_items?.length > 0) {
        const inventoryItemId = variant.inventory_items[0].inventory_item_id

        const { data: inventoryLevels } = await query.graph({
          entity: 'inventory_level',
          fields: ['*', 'available_quantity'],
          filters: {
            inventory_item_id: inventoryItemId,
          },
        })

        inventoryQuantity = inventoryLevels.length > 0 ? inventoryLevels[0].available_quantity : 0
        console.log('inventoryQuantity', inventoryQuantity)
      }

      // Asignamos el valor a la variante
      updatedVariants.push({
        ...variant,
        inventory_quantity: inventoryQuantity,
      })
    }

    // // 🔁 Asignamos las variantes actualizadas al producto
    product.variants = updatedVariants

    // Actualizamos el producto en MeiliSearch
    if (product.status === 'published') {
      await meilisearchService.addDocuments('products', [product], SearchUtils.indexTypes.PRODUCTS)
    } else {
      // Si el estado no es "published", elimina el documento de MeiliSearch
      await meilisearchService.deleteDocument('products', product.id)
    }
  }
}

export const config: SubscriberConfig = {
  event: [
    ProductEvents.PRODUCT_CREATED,
    ProductEvents.PRODUCT_UPDATED,
    ProductEvents.PRODUCT_DELETED,
    ProductEvents.PRODUCT_VARIANT_CREATED,

    InventoryEvents.RESERVATION_ITEM_DELETED,
    InventoryEvents.RESERVATION_ITEM_UPDATED,
    InventoryEvents.RESERVATION_ITEM_CREATED,
    InventoryEvents.INVENTORY_ITEM_CREATED,
    InventoryEvents.INVENTORY_ITEM_UPDATED,
    InventoryEvents.INVENTORY_ITEM_DELETED,

    PricingEvents.PRICE_LIST_CREATED,
    PricingEvents.PRICE_LIST_UPDATED,
    PricingEvents.PRICE_LIST_DELETED,
    PricingEvents.PRICE_LIST_ATTACHED,
    PricingEvents.PRICE_LIST_DETACHED,
    PricingEvents.PRICE_LIST_RESTORED,
  ],
}
