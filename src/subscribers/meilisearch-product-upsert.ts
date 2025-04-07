import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, ProductEvents, SearchUtils } from '@medusajs/utils'
import { MeiliSearchService } from '../modules/meilisearch'
import { QueryContext } from '@medusajs/framework/utils'

export default async function meilisearchProductUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id

  const meilisearchService: MeiliSearchService = container.resolve('meilisearch')

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

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
    filters: {
      id: productId, // Filtrar por el ID del producto
    },
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
    // Procesamos cada variante del producto
    for (const variant of product.variants) {
      // Verificamos si la variante tiene ítems de inventario
      if (variant.inventory_items && variant.inventory_items.length > 0) {
        // Obtenemos el ID del ítem de inventario
        const inventoryItemId = variant.inventory_items[0].inventory_item_id

        // Consultamos los niveles de inventario para este ítem
        const { data: inventoryLevels } = await query.graph({
          entity: 'inventory_level',
          fields: ['*', 'available_quantity'],
          filters: {
            inventory_item_id: inventoryItemId,
          },
        })

        // Asignamos la cantidad disponible a la variante
        variant.inventory_quantity = inventoryLevels.length > 0 ? inventoryLevels[0].available_quantity : 0
      } else {
        // Si la variante no tiene ítems de inventario, establecemos la cantidad en 0
        variant.inventory_quantity = 0
      }
    }
  }

  // Ahora products contiene los productos con sus variantes y la propiedad inventory_quantity
  const product = products[0]

  if (product.status === 'published') {
    await meilisearchService.addDocuments('products', [product], SearchUtils.indexTypes.PRODUCTS)
  } else {
    // Si el estado no es "published", elimina el documento de MeiliSearch
    await meilisearchService.deleteDocument('products', productId)
  }
}

export const config: SubscriberConfig = {
  event: [
    ProductEvents.PRODUCT_CREATED,
    ProductEvents.PRODUCT_UPDATED,
    // InventoryEvents.RESERVATION_ITEM_DELETED,
    // InventoryEvents.RESERVATION_ITEM_UPDATED,
    // InventoryEvents.RESERVATION_ITEM_CREATED,
    // InventoryEvents.RESERVATION_ITEM_ATTACHED,
    // InventoryEvents[0],
    // InventoryEvents[1],
    // InventoryEvents[2],
    // InventoryEvents[3],
    // InventoryEvents[4],
    // PricingEvents[0],
    // PricingEvents[1],
    // PricingEvents[2],
    // PricingEvents[3],
    // PricingEvents[4],/
  ],
}
