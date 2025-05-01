// Definition of the enum
export enum PrefixTypeEnum {
  resitem = 'resitem',
  iitem = 'iitem',
  plist = 'plist',
  prod = 'prod',
  variant = 'variant',
}

// Function for the "res" case
async function getResProducts(query: any, reservationIds: string[]): Promise<string[]> {
  // Consulta todos los reservation_items de una sola vez
  const { data: reservationItems } = await query.graph({
    entity: 'reservation_item',
    filters: {
      id: reservationIds, // Filtrar por array de IDs
    },
    fields: ['id', 'inventory_item_id'],
  })

  if (!reservationItems || reservationItems.length === 0) {
    return []
  }

  // Crear un array para almacenar los resultados por cada reservation item
  let results: string[] = []

  // Procesar cada reservation item individualmente
  for (const reservationItem of reservationItems) {
    if (!reservationItem.inventory_item_id) {
      results = []
      continue
    }

    // Consultar inventory_item relacionado
    const { data: inventoryItems } = await query.graph({
      entity: 'inventory_item',
      filters: {
        id: [reservationItem.inventory_item_id],
      },
      fields: ['id', 'variants.*', 'variants.product_id'],
    })

    if (!inventoryItems || inventoryItems.length === 0) {
      results = []
      continue
    }

    // Extraer los product_ids para este reservation item
    const productIds = inventoryItems[0].variants?.map((variant) => variant.product_id).filter(Boolean) || [] // Filtrar valores nulos o undefined

    results.push(productIds)
  }

  return results
}

// Function for the "inv" case
async function getInvItemProducts(query: any, inventoryItemIds: string[]): Promise<string[]> {
  try {
    // Validate input
    if (!inventoryItemIds || inventoryItemIds.length === 0) {
      console.log('No inventory item IDs provided')
      return []
    }

    // Query all inventory items at once
    const { data: inventoryItems } = await query.graph({
      entity: 'inventory_item',
      filters: {
        id: inventoryItemIds,
      },
      fields: ['id', 'variants.*', 'variants.product_id'],
    })

    // Check if we got any results
    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('No inventory items found')
      return []
    }

    // Check if each inventory item has variants
    for (const item of inventoryItems) {
      if (!item.variants || !Array.isArray(item.variants) || item.variants.length === 0) {
        console.log(`Inventory item ${item.id} has no variants`)
      }
    }

    // Extract all product IDs from all inventory items and filter out nulls/undefined immediately
    const productIds = inventoryItems.flatMap((item) =>
      (item.variants?.map((variant) => variant.product_id) || []).filter(Boolean),
    )

    // If no product IDs were found, return empty array
    if (productIds.length === 0) {
      console.log('No product IDs found for the inventory items')
      return []
    }

    console.log(`Found ${productIds.length} product IDs from inventory items`)
    return productIds
  } catch (error) {
    console.error(`Error retrieving products from inventory items: ${error.message}`)
    return [] // Return empty array on any error
  }
}
async function getPriceListProducts(query: any, priceListIds: string[]): Promise<string[]> {
  try {
    // Validate input
    if (!priceListIds || priceListIds.length === 0) {
      console.log('No price list IDs provided')
      return []
    }

    // Get all price lists at once with their prices
    const { data: priceLists } = await query.graph({
      entity: 'price_list',
      filters: {
        id: priceListIds,
      },
      fields: ['id', 'name', 'prices.*', 'prices.price_set_id'],
    })

    if (!priceLists || priceLists.length === 0) {
      console.log('No price lists found')
      return []
    }

    // Verificar si cada price list tiene precios
    for (const priceList of priceLists) {
      if (!priceList.prices || !Array.isArray(priceList.prices) || priceList.prices.length === 0) {
        console.log(`Price list ${priceList.id} has no prices`)
      }
    }
    // Extract all price_set_ids from all price lists
    const priceSetIds = priceLists.flatMap((priceList) =>
      (priceList.prices || []).map((price) => price.price_set_id).filter(Boolean),
    )

    if (priceSetIds.length === 0) {
      console.log('No price set IDs found')
      return []
    }

    // Query product variants related to these price sets
    const { data: variants } = await query.graph({
      entity: 'product_variant',
      filters: {
        price_set_id: priceSetIds,
      },
      fields: ['product_id'],
    })

    if (!variants || variants.length === 0) {
      console.log('No variants found for the price sets')
      return []
    }

    let productIds: string[] = []
    // Extract unique product IDs
    productIds = [...new Set(variants.map((variant) => variant.product_id).filter(Boolean))] as string[]

    if (productIds.length === 0) {
      console.log('No product IDs found for the price lists')
      return []
    }

    return productIds
  } catch (error) {
    console.error(`Error getting products from price lists: ${error.message}`)
    return []
  }
}

// Main function that uses switch-case
export async function getProductsByPrefix(
  prefix: PrefixTypeEnum,
  query: any,
  array_id: string[],
  logger: any,
): Promise<string[] | []> {
  try {
    switch (prefix) {
      case PrefixTypeEnum.resitem:
        // Llama a la función para obtener productos relacionados con "res"
        return await getResProducts(query, array_id)

      case PrefixTypeEnum.iitem:
        // Llama a la función para obtener productos relacionados con "iitem"
        return await getInvItemProducts(query, array_id)

      case PrefixTypeEnum.plist:
        // Llama a la función para obtener productos relacionados con "pl"

        return await getPriceListProducts(query, array_id)

      case PrefixTypeEnum.prod:
        // Retorna un array vacío para el caso "prod"
        return []

      default:
        // Maneja cualquier otro caso no definido
        logger.warn(`Prefijo desconocido: ${prefix}`)
        return []
    }
  } catch (error) {
    // Manejo de errores: Log del error y retorno de un array vacío
    logger.error(`Error al obtener productos para el prefijo "${prefix}":`, error)
    return []
  }
}
