import { Module } from '@medusajs/utils'
import { MeiliSearchService } from './services/meilisearch'

//import meiliSearchLoader from './loaders/index_ho'
// import { MeiliSearchService } from './services'

export * from './services'
export * from './types'
import Loader from './loaders'

// export default Module('meilisearch', {
//   service: MeiliSearchService,
//   loaders: [meiliSearchLoader],
// })

export default Module('meilisearch', {
  service: MeiliSearchService,
  loaders: [Loader],
})
