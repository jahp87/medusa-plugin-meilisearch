import { createStep, StepResponse, createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { QueryContext } from '@medusajs/framework/utils'

// Paso para obtener un producto con precios calculados
const getProductWithPricesStep = createStep(
  'get-product-with-prices-step',
  async (input: { productId: string; regionId: string; currencyCode: string }, { container }) => {
    // Resolver el objeto query del contenedor
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Usar query.graph para obtener el producto con precios calculados
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['*', 'variants.*', 'tags.*', 'images.*', 'options.*', 'variants.calculated_price.*'],
      filters: {
        id: input.productId,
      },
      context: {
        variants: {
          calculated_price: QueryContext({
            region_id: input.regionId,
            currency_code: input.currencyCode,
          }),
        },
      },
    })

    return new StepResponse(products[0])
  },
)

// Workflow que utiliza el paso anterior
export const getProductWithPricesWorkflow = createWorkflow(
  'get-product-with-prices',
  function (input: { productId: string; regionId: string; currencyCode: string }) {
    const product = getProductWithPricesStep(input)
    return new WorkflowResponse({ product })
  },
)
