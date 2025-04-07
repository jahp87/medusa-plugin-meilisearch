// Definition of the enum
export enum PrefixTypeEnum {
  resitem = 'resitem',
  iitem = 'iitem',
  plist = 'plist',
  prod = 'prod',
}

// Function for the "res" case
async function getResProducts(query: any, reservationId: string): Promise<string[]> {
  const { data: reservationItems } = await query.graph({
    entity: 'reservation_item',
    where: { id: reservationId }, // Reemplaza con tu ID de ReservationItem
    fields: ['inventory_item_id', 'inventory_item.*'],
  })

  // Si encontramos el ReservationItem, ahora consultamos el inventory_item relacionado
  if (reservationItems && reservationItems.length > 0) {
    const reservationItem = reservationItems[0]

    // Consulta para obtener las variantes de producto relacionadas con el inventory_item
    const { data: inventoryItems } = await query.graph({
      entity: 'inventory_item',
      where: { id: reservationItem.inventory_item_id },
      fields: ['variants.*', 'variants.product_id'],
    })

    // Extraer los IDs de los productos
    if (inventoryItems && inventoryItems.length > 0) {
      const productIds = inventoryItems[0].variants.map((variant) => variant.product_id)
      return productIds
    }
    return []
  }
  return []
}

// Function for the "inv" case
async function getInvItemProducts(query: any, inventoryItemId: string): Promise<string[]> {
  const { data: inventoryItems } = await query.graph({
    entity: 'inventory_item',
    where: { id: inventoryItemId }, // Reemplaza con tu ID de inventory item
    fields: ['variants.*', 'variants.product_id'],
  })

  // Extraer los IDs de los productos
  if (inventoryItems && inventoryItems.length > 0) {
    const productIds = inventoryItems[0].variants.map((variant) => variant.product_id)
    return productIds
  }

  // Return an empty array if no inventory items are found
  return []
}

async function getPriceListProducts(query: any, priceListId: string): Promise<string[]> {
  const { data: priceListProducts } = await query.graph({
    entity: 'price_list',
    where: { id: priceListId },
    fields: ['id', 'name', 'prices.variant_id', 'prices.variant.product_id', 'prices.variant.product.title'],
    limit: 1,
  })

  // Verificar si se encontró la lista de precios
  if (priceListProducts && priceListProducts.length > 0) {
    const priceList = priceListProducts[0]

    // Verificar si prices existe y es un array
    if (priceList.prices && Array.isArray(priceList.prices)) {
      // Obtener IDs únicos de productos
      const productIds = [
        ...new Set(
          priceList.prices
            .filter((price) => price.variant && price.variant.product_id)
            .map((price) => price.variant.product_id),
        ),
      ] as string[]

      console.log('IDs de productos en la lista de precios:', productIds)
      return productIds
    }
  }
  return []
}

// Main function that uses switch-case
export async function getProductsByPrefix(
  prefix: PrefixTypeEnum,
  query: any,
  id: string,
  logger: any,
): Promise<string[] | []> {
  try {
    switch (prefix) {
      case PrefixTypeEnum.resitem:
        // Llama a la función para obtener productos relacionados con "res"
        return await getResProducts(query, id)

      case PrefixTypeEnum.iitem:
        // Llama a la función para obtener productos relacionados con "iitem"
        return await getInvItemProducts(query, id)

      case PrefixTypeEnum.plist:
        // Llama a la función para obtener productos relacionados con "pl"
        console.log('ID de lista de precios:', id)
        return await getPriceListProducts(query, id)

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
