import { SearchTypes } from '@medusajs/types'
import { Modules, SearchUtils } from '@medusajs/utils'
import { MeiliSearch, Settings } from 'meilisearch'
import { meilisearchErrorCodes, MeilisearchPluginOptions } from '../types'
import { getProductWithPricesWorkflow } from 'src/workflows/get-product-workflow'
//import { transformProduct } from '../utils/transformer'
//import { queryWorkflow } from '../../../workflows/query-workflow'

type InjectDependencies = {
  [Modules.PRODUCT]: any
}

export class MeiliSearchService extends SearchUtils.AbstractSearchService {
  static identifier = 'index-meilisearch'

  isDefault = false

  protected readonly config_: MeilisearchPluginOptions
  protected readonly client_: MeiliSearch
  protected productService_: any
  protected container_: any

  constructor({ [Modules.PRODUCT]: product }: InjectDependencies, options: MeilisearchPluginOptions) {
    super({ product }, options)
    this.productService_ = product
    this.container_ = product
    this.config_ = options

    //this.container_ = container
    // this.query_ = query

    if (process.env.NODE_ENV !== 'development') {
      if (!options.config?.apiKey) {
        throw Error(
          'Meilisearch API key is missing in plugin config. See https://github.com/rokmohar/medusa-plugin-meilisearch',
        )
      }
    }

    if (!options.config?.host) {
      throw Error(
        'Meilisearch host is missing in plugin config. See https://github.com/rokmohar/medusa-plugin-meilisearch',
      )
    }

    this.client_ = new MeiliSearch(options.config)
  }

  async getProductWithPrices(productId: string) {
    const { result } = await getProductWithPricesWorkflow(this.container_).run({
      input: {
        productId: productId,
        regionId: 'reg_01JN3PZX5Q2AJWKSTDMKCM543A',
        currencyCode: 'eur',
      },
    })

    return result
  }
  // async getProductWithCalculatedPrices(productId: string) {
  //   try {
  //     const product = await this.productService_.retrieve(productId, {
  //       region_id: 'reg_01JN3PZX5Q2AJWKSTDMKCM543A',
  //       currency_code: 'eur',
  //       include_pricestax: true,
  //     })

  //     return product
  //   } catch (error) {
  //     throw error
  //   }
  // }

  // async getQueryByWorkFlow() {
  //   const { result } = await queryWorkflow().run()
  //   console.log('result workflow', result)
  //   return result
  // }

  async createIndex(indexName: string, options: Record<string, unknown> = { primaryKey: 'id' }) {
    return await this.client_.createIndex(indexName, options)
  }

  getIndex(indexName: string) {
    return this.client_.index(indexName)
  }

  async addDocuments(indexName: string, documents: any, type: string) {
    const transformedDocuments = this.getTransformedDocuments(type, documents)

    return await this.client_.index(indexName).addDocuments(await transformedDocuments, { primaryKey: 'id' })
  }

  async replaceDocuments(indexName: string, documents: any, type: string) {
    const transformedDocuments = this.getTransformedDocuments(type, documents)

    return await this.client_.index(indexName).addDocuments(await transformedDocuments, { primaryKey: 'id' })
  }

  async deleteDocument(indexName: string, documentId: string) {
    return await this.client_.index(indexName).deleteDocument(documentId)
  }

  async deleteDocuments(indexName: string, documentIds: string[]) {
    return await this.client_.index(indexName).deleteDocuments(documentIds)
  }

  async deleteAllDocuments(indexName: string) {
    return await this.client_.index(indexName).deleteAllDocuments()
  }

  async search(indexName: string, query: string, options: Record<string, any>) {
    const { paginationOptions, filter, additionalOptions } = options

    return await this.client_.index(indexName).search(query, { filter, ...paginationOptions, ...additionalOptions })
  }

  async updateSettings(indexName: string, settings: SearchTypes.IndexSettings & Settings) {
    const indexSettings = settings.indexSettings ?? {}

    await this.upsertIndex(indexName, settings)

    return await this.client_.index(indexName).updateSettings(indexSettings)
  }

  async upsertIndex(indexName: string, settings: SearchTypes.IndexSettings) {
    try {
      await this.client_.getIndex(indexName)
    } catch (error) {
      if (error.code === meilisearchErrorCodes.INDEX_NOT_FOUND) {
        await this.createIndex(indexName, {
          primaryKey: settings?.primaryKey ?? 'id',
        })
      }
    }
  }

  //getQuery() {
  // if (!this.query_) {
  //   this.query_ = this.container_.resolve(ContainerRegistrationKeys.QUERY)
  // } else {
  //   const logger = this.container_.resolve(ContainerRegistrationKeys.LOGGER)
  //   logger.warn('Query not found')
  //   return this.query_
  // }
  //   return this.query_
  // }

  getTransformedDocuments(type: string, documents: any[]): Promise<any[]> {
    // Si no hay documentos, retornar un array vacío
    if (!documents?.length) {
      return Promise.resolve([])
    }

    // Función para manejar la transformación de productos
    const handleProductsTransformation = async () => {
      // Obtener el transformer desde la configuración o usar uno por defecto
      // const productsTransformer =
      //   this.config_.settings?.[SearchUtils.indexTypes.PRODUCTS]?.transformer ?? transformProduct

      // Crear el contenedor
      // const container = createMedusaContainer()

      // container.register('query', asValue({}))

      // console.log('Contenedor creado:', container)

      // Transformar los documentos en un solo paso
      //const queryWorkflow = await this.getQueryByWorkFlow()
      //const queryQuery = await this.getQuery()
      //const queryContainer = this.query_
      return documents.map((document) => {
        //const transformedData = { document, queryQuery: queryQuery, queryContainer: queryContainer }
        //const transformedData = { document, query: queryWorkflow }
        //const transformedData = { document, query: queryQuery }
        // const transformedData = this.getProductWithCalculatedPrices(document.id)
        // return productsTransformer(transformedData)
        return this.getProductWithPrices(document.id)
      })
    }

    // Manejar diferentes tipos de transformación
    switch (type) {
      case SearchUtils.indexTypes.PRODUCTS:
        return handleProductsTransformation()
      default:
        // Por defecto, retornar los documentos sin cambios
        return Promise.resolve(documents)
    }
  }

  // async getTransformedDocuments(type: string, documents: any[]) {
  //   if (!documents?.length) {
  //     return []
  //   }

  //   switch (type) {
  //     case SearchUtils.indexTypes.PRODUCTS:
  //       console.log('container in methods', { container })
  //       const productsTransformer = transformProduct(documents, container)

  //       return documents.map(await productsTransformer)
  //     default:
  //       return documents
  //   }
  // }
}
