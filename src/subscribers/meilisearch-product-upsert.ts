import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, InventoryEvents, PricingEvents, ProductEvents, SearchUtils } from '@medusajs/utils'
import { MeiliSearchService } from '../modules/meilisearch'
import { QueryContext } from '@medusajs/framework/utils'
import { getProductsByPrefix, PrefixTypeEnum } from '../utils'

export default async function meilisearchProductUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const type = data.id.split('_')[0]
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const productList: string[] = []
  if ((await getProductsByPrefix(type as PrefixTypeEnum, query, data.id, logger)).length === 0) {
    productList.push(data.id)
  } else {
    // Si el ID del producto empieza con "res" o "iitem", obtenemos la lista de productos
    const products = await getProductsByPrefix(type as PrefixTypeEnum, query, data.id, logger)
    productList.push(...products)
  }

  console.log('productList', productList)

  const meilisearchService: MeiliSearchService = container.resolve('meilisearch')

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
      id: productList, // Filtrar por el ID del producto
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

  console.log('products', products)

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
  products.map(async (product) => {
    if (product.status === 'published') {
      console.log('add product', product)
      await meilisearchService.addDocuments('products', [product], SearchUtils.indexTypes.PRODUCTS)
    } else {
      // Si el estado no es "published", elimina el documento de MeiliSearch
      await meilisearchService.deleteDocument('products', product.id)
    }
  })
}

export const config: SubscriberConfig = {
  event: [
    ProductEvents.PRODUCT_CREATED,
    ProductEvents.PRODUCT_UPDATED,

    InventoryEvents.RESERVATION_ITEM_DELETED,
    InventoryEvents.RESERVATION_ITEM_UPDATED,
    InventoryEvents.RESERVATION_ITEM_CREATED,
    InventoryEvents.RESERVATION_ITEM_ATTACHED,
    InventoryEvents.INVENTORY_ITEM_CREATED,
    InventoryEvents.INVENTORY_ITEM_UPDATED,
    InventoryEvents.INVENTORY_ITEM_DELETED,
    InventoryEvents.INVENTORY_ITEM_RESTORED,
    InventoryEvents.INVENTORY_ITEM_ATTACHED,
    PricingEvents.PRICE_LIST_ATTACHED,
    PricingEvents.PRICE_LIST_DETACHED,
    PricingEvents.PRICE_LIST_CREATED,
    PricingEvents.PRICE_LIST_UPDATED,
    PricingEvents.PRICE_LIST_DELETED,
    PricingEvents.PRICE_LIST_RESTORED,
  ],
}
