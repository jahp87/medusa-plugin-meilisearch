import { Query, QueryContext } from '@medusajs/framework/utils'

export const transformProduct = async (product: any, container) => {
  try {
    const query = container.resolve('query')

    const { data: products } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'subtitle',
        'description',
        'handle',
        'is_giftcard',
        'discountable',
        'thumbnail',
        'collection_id',
        'type_id',
        'weight',
        'length',
        'height',
        'width',
        'hs_code',
        'origin_country',
        'mid_code',
        'material',
        'created_at',
        'updated_at',
        'options.*', // Incluir opciones del producto
        'tags.*', // Incluir etiquetas
        'images.*', // Incluir imágenes
        'variants.*', // Incluir variantes
      ],
      filters: {
        id: product.id,
      },
      context: {
        variants: {
          calculated_price: QueryContext({
            region_id: 'reg_01JMAW0RPQNC2FE5M40CRNEBDW',
            currency_code: 'eur',
          }),
        },
      },
    })

    const fullProduct = products[0]

    return {
      ...fullProduct,
      options: fullProduct.options?.map((option: any) => ({
        id: option.id,
        title: option.title,
        metadata: null,
        product_id: option.product_id,
        created_at: option.created_at,
        updated_at: option.updated_at,
        deleted_at: null,
      })),
      tags: fullProduct.tags?.map((tag: any) => tag.value) || [],
      images: fullProduct.images?.map((image: any) => image.url) || [],
      variants: fullProduct.variants.map((variant: any) => ({
        ...variant,
        calculated_price: variant.calculated_price,
      })),
    }
  } catch (error) {
    console.error('Error al transformar el producto:', error.message)
    throw error
  }
}
