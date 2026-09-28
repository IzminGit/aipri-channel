# アイプリチャンネル — CGライブ番組表

プリティーシリーズ（アイプリ・プリパラ・プリマジ）、プリキュア、アイカツの公式 CG ライブ・主題歌・MV（YouTube プレイリスト）を、
**テレビのチャンネルと番組表** に見立てて視聴できる非公式ファンサイトです。

- 1 プレイリスト = 1 チャンネル（番組表の縦の列）、1 動画 = 1 番組（1 曲目、2 曲目…の行）
- 列は左から **プリティーシリーズ → プリキュアシリーズ → アイカツシリーズ**、同じシリーズ内は **プレイリストの作成日が新しい順**（シリーズ名の帯と区切り線で区別）
- 各チャンネルの曲は **動画の公開日が古い順** に並ぶ
- レイアウトは [japantv.app](https://japantv.app/) を踏襲：上段にプレーヤー（左）と番組の詳細（右）を固定し、下段の番組表だけがスクロール（ヘッダーなしで番組表を広く表示。キーボード操作ヘルプと表示テーマは詳細パネル右上）
- 番組表の曲をクリックで再生し、同じチャンネルの次の曲を連続再生（最終曲の次は 1 曲目へ）

## 機能

| 機能                  | 内容                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 番組表                | チャンネルを縦列、曲を行に並べた表。サムネイルとタイトルを表示。列見出しと曲番号は固定                                                                |
| 番組の詳細            | 番組表でマウスオーバーした曲のサムネイル・公開日・再生時間・動画の説明を表示（離れると再生中の曲に戻る）                                              |
| キーボード / リモコン | 矢印キーで番組表を移動・Enter で再生、`F` お気に入り、`Shift`+`↑↓` 並び替え、`N`/`P` 次/前の曲、`PgUp`/`PgDn` チャンネル切替、`1`〜`9`、`M`、`T`、`?` |
| お気に入り            | 曲ごとの ☆ で左端の「お気に入り」列に追加。ドラッグ・▲▼・Shift+↑↓ で並び替え、この列も連続再生。ブラウザに保存                                        |
| ダークモード          | 自動（OS 設定に追従）/ ライト / ダーク                                                                                                                |
| PWA                   | ホーム画面に追加してアプリのように起動。オフライン時は前回の番組データで表示                                                                          |
| URL                   | `?ch=2&n=5` で 2ch の 5 曲目を指定して開ける（`ch=0` はお気に入り列）                                                                                 |

デザインは [デジタル庁デザインシステム](https://design.digital.go.jp/)（`@digital-go-jp/tailwind-theme-plugin`）の
カラー・タイポグラフィ・角丸・フォーカスリングのトークンを使用しています。

## 技術構成

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + デジタル庁デザイントークン
- Zod（番組データのスキーマ検証。アプリと取得スクリプトで共有）
- vite-plugin-pwa（Workbox）
- Vitest / oxlint / Prettier
- Vercel（ホスティング・PR ごとのプレビュー）+ GitHub Actions（CI・番組データの定期更新）

```
channels.config.json        チャンネル（プレイリスト）の設定 ← 人が編集する
scripts/fetch-playlists.ts  YouTube Data API から動画情報を取得して catalog.json を生成
public/data/catalog.json    生成された番組データ（アプリはこれだけを読む）
src/
  schema.ts                 設定・番組データの Zod スキーマ
  lib/playlist.ts           連続再生・カーソル移動・並び順・お気に入り（純粋関数・テストあり）
  components/               Player / InfoPanel / ProgramGuide / Toolbar …
  hooks/                    localStorage 永続化・テーマ
```

## チャンネル（番組）を追加する

1. `channels.config.json` の `channels` にエントリを追加して push

   ```json
   {
     "number": 22,
     "slug": "my-channel",
     "name": "チャンネル名（詳細表示用）",
     "shortName": "番組表の列見出し",
     "series": "アイカツシリーズ",
     "color": "light-blue",
     "playlistId": "PLxxxxxxxxxxxxxxxx"
   }
   ```

   - `series` は `channels.config.json` 冒頭の `series`（左からの並び順）にある名前を指定します。
     新しいシリーズを作るときは `series` にも追加してください。
   - 列の並び（シリーズ順 → プレイリスト作成日の新しい順）と表示上のチャンネル番号は自動で決まります。
     `number` は重複しない値であれば何でも構いません。
   - `color` は `blue` `light-blue` `cyan` `green` `lime` `yellow` `orange` `red` `magenta` `purple` から選択します
     （現在はシリーズごとに プリティー=`magenta`・プリキュア=`orange`・アイカツ=`light-blue`）。

2. GitHub Actions が YouTube Data API で動画一覧・再生時間を取得して `catalog.json` をコミットし、
   それを受けて Vercel が自動で再デプロイします。
   以降も毎日 5:17 (JST) に自動で更新されます（非公開・埋め込み不可の動画は自動で除外）。

## 初回セットアップ

1. [Google Cloud Console](https://console.cloud.google.com/) で **YouTube Data API v3** を有効化し、API キーを発行
   （「API の制限」で YouTube Data API v3 のみに絞るのがおすすめ）
2. リポジトリの **Settings → Secrets and variables → Actions** に `YOUTUBE_API_KEY` として登録
3. [Vercel](https://vercel.com/new) で **Add New… → Project** からこのリポジトリを Import
   （フレームワーク・ビルド設定は `vercel.json` で指定済みなので、そのまま Deploy で OK）
4. Actions タブから「Update playlist data」を手動実行すると、最新の番組データが反映されます

以降は main への push で本番、プルリクエストでプレビュー環境が自動でデプロイされます。

API キーが未設定でも、コミット済みの `catalog.json` でサイトは動作します。

## 開発

```sh
npm install
npm run dev          # 開発サーバー
npm test             # ユニットテスト
npm run lint         # oxlint
npm run format       # Prettier
npm run build        # 型チェック + 本番ビルド

YOUTUBE_API_KEY=xxxx npm run fetch-data   # 番組データをローカルで更新
```

## 注意事項

本サイトは非公式のファンサイトです。映像は各公式 YouTube チャンネルが公開している動画を埋め込み再生しており、
権利は各権利者に帰属します。
