import { SearchTypes } from '@medusajs/types'
import { SearchUtils } from '@medusajs/utils'
import { MeiliSearch, Settings } from 'meilisearch'
import { meilisearchErrorCodes, MeilisearchPluginOptions } from '../types'
import { transformProduct } from '../utils/transformer'

export class MeiliSearchService extends SearchUtils.AbstractSearchService {
  static identifier = 'index-meilisearch'

  isDefault = false

  protected readonly config_: MeilisearchPluginOptions
  protected readonly client_: MeiliSearch

  constructor(container: any, options: MeilisearchPluginOptions) {
    super(container, options)
    console.log('container in services', container)
    console.log('*****************************************************************************************')
    this.config_ = options

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

  async createIndex(indexName: string, options: Record<string, unknown> = { primaryKey: 'id' }) {
    return await this.client_.createIndex(indexName, options)
  }

  getIndex(indexName: string) {
    return this.client_.index(indexName)
  }

  async addDocuments(indexName: string, documents: any, type: string) {
    const transformedDocuments = this.getTransformedDocuments(type, documents)

    return await this.client_.index(indexName).addDocuments(transformedDocuments, { primaryKey: 'id' })
  }

  async replaceDocuments(indexName: string, documents: any, type: string) {
    const transformedDocuments = this.getTransformedDocuments(type, documents)

    return await this.client_.index(indexName).addDocuments(transformedDocuments, { primaryKey: 'id' })
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

  async getTransformedDocuments(type: string, documents: any[]) {
    if (!documents?.length) {
      return []
    }

    switch (type) {
      case SearchUtils.indexTypes.PRODUCTS:
        console.log('container', super.container)
        const productsTransformer = transformProduct(documents, super.container)

        return documents.map(await productsTransformer)
      default:
        return documents
    }
  }
}
