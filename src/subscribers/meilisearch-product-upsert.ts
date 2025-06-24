import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, ProductEvents, InventoryEvents, PricingEvents, SearchUtils } from '@medusajs/utils'
import { MeiliSearchService } from '../modules/meilisearch'
import { QueryContext } from '@medusajs/framework/utils'
// import Medusa from '@medusajs/js-sdk'

export default async function meilisearchProductUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  //*******************************************************************
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`data ${data.id}`)

  const meilisearchService: MeiliSearchService = container.resolve('meilisearch')

  // sdk.admin.product.listOptions('prod_123').then(({ product_options }) => {
  //   console.log(product_options)
  // })
  // sdk.admin.product.listVariants('prod_123').then(({ variants }) => {
  //   console.log(variants)
  // })

  // const sdk = new Medusa({
  //   baseUrl: process.env.MEDUSA_BACKEND_URL || 'localhost:8000', // URL de tu backend de Medusa
  //   debug: process.env.ENV === 'development',
  // })

  logger.info('search all product')
  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*', // Todos los campos del producto
      'options.*',
      'options.values.*',
      'images.*',
      'tags.*',
      'categories.*',
      'variants.*',
      'variants.options.*',
      'variants.calculated_price.*',
      'variants.inventory_items.*',
    ],

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
    //product.options = sdk.admin.product.listOptions(product.id)

    const { data: variants } = await query.graph({
      entity: 'product_variant',
      fields: [
        '*',
        'calculated_price.*',
        'options.*',
        'options.option.*', // Esto trae los detalles de la opción (por ejemplo, título)
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
      // const variants = await sdk.admin.product.listVariants(variant.id)
      // variant.options = variants[0].options
      if (variant.inventory_items !== undefined) {
        inventoryQuantity = calculateInventoryQuantity(variant)
        updatedVariants.push({
          ...variant,
          inventory_quantity: inventoryQuantity,
        })
      } else {
        updatedVariants.push(...variant)
      }
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
    ProductEvents.PRODUCT_VARIANT_ATTACHED,
    ProductEvents.PRODUCT_VARIANT_CREATED,
    ProductEvents.PRODUCT_VARIANT_DELETED,
    ProductEvents.PRODUCT_VARIANT_UPDATED,
    ProductEvents.PRODUCT_VARIANT_DETACHED,
    ProductEvents.PRODUCT_VARIANT_RESTORED,
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
    'product-review.created',
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
