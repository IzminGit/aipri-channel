import { catalogSchema, type Catalog } from '../schema'
import { arrangeChannels, sortByPublished } from './playlist'

let promise: Promise<Catalog> | undefined

/** 番組データを取得する。React 19 の use() で Suspense と組み合わせて使う */
export function loadCatalog(): Promise<Catalog> {
  promise ??= fetch(`${import.meta.env.BASE_URL}data/catalog.json`, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`番組データの取得に失敗しました (${res.status})`)
      return res.json()
    })
    .then((json) => {
      const catalog = catalogSchema.parse(json)
      return {
        ...catalog,
        channels: arrangeChannels(catalog.channels.map(sortByPublished), catalog.series),
      }
    })
  return promise
}
