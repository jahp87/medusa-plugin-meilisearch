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
      fields: [
        '*',
        'calculated_price.*',
        'inventory_items.*',
        'inventory_items.inventory.location_levels.stocked_quantity',
        'inventory_items.inventory.location_levels.reserved_quantity',
      ],
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
    const updatedVariants: any[] = []

    for (const variant of variants) {
      let inventoryQuantity = 0

      // if (variant.inventory_items?.length > 0) {
      //   const inventoryItemId = variant.inventory_items[0].inventory_item_id

      //   const { data: inventoryLevels } = await query.graph({
      //     entity: 'inventory_level',
      //     fields: ['*', 'available_quantity'],
      //     filters: {
      //       inventory_item_id: inventoryItemId,
      //     },
      //   })

      //   inventoryQuantity = inventoryLevels.length > 0 ? inventoryLevels[0].available_quantity : 0
      //   console.log('inventoryQuantity', inventoryQuantity)
      // }

      inventoryQuantity = calculateInventoryQuantity(variant)

      // Asignamos el valor a la variante
      updatedVariants.push({
        ...variant,
        inventory_quantity: inventoryQuantity,
      })
    }

    // // 🔁 Asignamos las variantes actualizadas al producto
    product.variants = updatedVariants

    // search reviews

    const { data: reviews } = await query.graph({
      entity: 'review',
      fields: ['id', 'product_id', 'rating'],
      filters: {
        product_id: [product.id],
      },
    })

    const total_rating = reviews.reduce((acc, review) => acc + review.rating, 0)

    product.rating = total_rating / reviews.length

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

    InventoryEvents.INVENTORY_ITEM_CREATED,
    InventoryEvents.RESERVATION_ITEM_CREATED,
    InventoryEvents.INVENTORY_LEVEL_CREATED,

    InventoryEvents.INVENTORY_ITEM_UPDATED,
    InventoryEvents.RESERVATION_ITEM_UPDATED,
    InventoryEvents.INVENTORY_LEVEL_UPDATED,

    InventoryEvents.INVENTORY_ITEM_DELETED,
    InventoryEvents.RESERVATION_ITEM_DELETED,
    InventoryEvents.INVENTORY_LEVEL_DELETED,

    InventoryEvents.INVENTORY_ITEM_RESTORED,
    InventoryEvents.RESERVATION_ITEM_RESTORED,
    InventoryEvents.INVENTORY_LEVEL_RESTORED,

    InventoryEvents.INVENTORY_ITEM_ATTACHED,
    InventoryEvents.RESERVATION_ITEM_ATTACHED,
    InventoryEvents.INVENTORY_LEVEL_ATTACHED,

    InventoryEvents.INVENTORY_ITEM_DETACHED,
    InventoryEvents.RESERVATION_ITEM_DETACHED,
    InventoryEvents.INVENTORY_LEVEL_DETACHED,

    PricingEvents.PRICE_LIST_RULE_CREATED,
    PricingEvents.PRICE_LIST_CREATED,
    PricingEvents.PRICE_RULE_CREATED,
    PricingEvents.PRICE_SET_CREATED,
    PricingEvents.PRICE_CREATED,

    PricingEvents.PRICE_LIST_RULE_UPDATED,
    PricingEvents.PRICE_LIST_UPDATED,
    PricingEvents.PRICE_RULE_UPDATED,
    PricingEvents.PRICE_SET_UPDATED,
    PricingEvents.PRICE_UPDATED,

    PricingEvents.PRICE_LIST_RULE_DELETED,
    PricingEvents.PRICE_LIST_DELETED,
    PricingEvents.PRICE_RULE_DELETED,
    PricingEvents.PRICE_SET_DELETED,
    PricingEvents.PRICE_DELETED,

    PricingEvents.PRICE_LIST_RULE_RESTORED,
    PricingEvents.PRICE_LIST_RESTORED,
    PricingEvents.PRICE_RULE_RESTORED,
    PricingEvents.PRICE_SET_RESTORED,
    PricingEvents.PRICE_RESTORED,

    PricingEvents.PRICE_LIST_RULE_ATTACHED,
    PricingEvents.PRICE_LIST_ATTACHED,
    PricingEvents.PRICE_RULE_ATTACHED,
    PricingEvents.PRICE_SET_ATTACHED,
    PricingEvents.PRICE_ATTACHED,

    PricingEvents.PRICE_LIST_RULE_DETACHED,
    PricingEvents.PRICE_LIST_DETACHED,
    PricingEvents.PRICE_RULE_DETACHED,
    PricingEvents.PRICE_SET_DETACHED,
    PricingEvents.PRICE_DETACHED,
  ],
}

function calculateInventoryQuantity(variant: any): number {
  if (!variant.inventory_items) return 0

  return variant.inventory_items.reduce((total, invItem) => {
    if (!invItem.inventory?.location_levels) return total

    return (
      total +
      invItem.inventory.location_levels.reduce((sum, level) => {
        return sum + (level.stocked_quantity || 0) - (level.reserved_quantity || 0)
      }, 0)
    )
  }, 0)
}
