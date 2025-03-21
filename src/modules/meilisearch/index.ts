import { Module } from '@medusajs/utils'
import { MeiliSearchService } from './services/meilisearch'
import Loader from './loaders'
//import meiliSearchLoader from './loaders/index_ho'
// import { MeiliSearchService } from './services'

export * from './services'
export * from './types'

// export default Module('meilisearch', {
//   service: MeiliSearchService,
//   loaders: [meiliSearchLoader],
// })

export default Module('meilisearch', {
  service: MeiliSearchService,
  loaders: [Loader],
})
