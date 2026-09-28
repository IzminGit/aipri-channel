import { z } from 'zod'

/** デジタル庁デザインシステムの色相名（チャンネルのアクセントカラー） */
export const channelColors = [
  'blue',
  'light-blue',
  'cyan',
  'green',
  'lime',
  'yellow',
  'orange',
  'red',
  'magenta',
  'purple',
] as const

/** channels.config.json の1エントリ（人が編集する設定） */
export const channelConfigSchema = z.object({
  number: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  shortName: z.string().min(1),
  /** 作品シリーズ名 */
  series: z.string().min(1),
  color: z.enum(channelColors),
  playlistId: z.string().min(1),
})

export const channelsConfigSchema = z
  .object({
    /** 番組表に並べるシリーズの順（左から） */
    series: z.array(z.string().min(1)).min(1),
    channels: z.array(channelConfigSchema).min(1),
  })
  .refine((c) => new Set(c.channels.map((ch) => ch.number)).size === c.channels.length, {
    message: 'channel number が重複しています',
  })
  .refine((c) => c.channels.every((ch) => c.series.includes(ch.series)), {
    message: 'series に含まれないシリーズ名のチャンネルがあります',
  })

export const videoSchema = z.object({
  id: z.string().length(11),
  title: z.string(),
  durationSec: z.number().int().positive(),
  publishedAt: z.iso.datetime({ offset: true }),
  description: z.string(),
})

export const channelSchema = channelConfigSchema.extend({
  playlistTitle: z.string(),
  /** プレイリストの作成日（シリーズ内はこの新しい順に並べる） */
  playlistCreatedAt: z.iso.datetime({ offset: true }),
  videos: z.array(videoSchema),
})

/** public/data/catalog.json（スクリプトが生成し、アプリが読む） */
export const catalogSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  /** シリーズの並び順（channels.config.json から引き継ぐ） */
  series: z.array(z.string()),
  channels: z.array(channelSchema),
})

export type ChannelColor = (typeof channelColors)[number]
export type ChannelConfig = z.infer<typeof channelConfigSchema>
export type Video = z.infer<typeof videoSchema>
export type Channel = z.infer<typeof channelSchema>
export type Catalog = z.infer<typeof catalogSchema>
