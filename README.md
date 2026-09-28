# アイプリチャンネル — CGライブ番組表

おねがいアイプリ・ひみつのアイプリ・アイドルランドプリパラの公式 CG ライブ（YouTube プレイリスト）を、
**テレビのチャンネルと番組表** に見立てて視聴できる非公式ファンサイトです。

- 1 プレイリスト = 1 チャンネル、1 動画 = 1 番組
- 毎日 **5:00 (JST)** に各チャンネルがプレイリスト先頭から放送開始し、動画の長さに沿ってループ放送
- 誰がいつ開いても同じ「放送中」の動画・再生位置から始まる（疑似リニア放送）
- 番組表から放送中の枠を選ぶとチャンネル切替、それ以外の枠はオンデマンド再生

## 機能

| 機能                  | 内容                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 番組表                | 5:00〜翌5:00 の横スクロール EPG（仮想スクロール）。現在時刻ライン、過去/放送中/これからの色分け                        |
| プレーヤー            | YouTube IFrame API（`youtube-nocookie.com`）。放送位置とのずれを検知して「放送位置に戻る」                             |
| キーボード / リモコン | `↑` `↓`（チャンネル±キー）、`1`〜`9`、`G` 番組表、`F` お気に入り、`M` ミュート、`L` 放送に戻る、`T` テーマ、`?` ヘルプ |
| お気に入り            | ブラウザに保存。お気に入りチャンネルは一覧・番組表の先頭に並ぶ                                                         |
| ダークモード          | 自動（OS 設定に追従）/ ライト / ダーク                                                                                 |
| PWA                   | ホーム画面に追加してアプリのように起動。オフライン時は前回の番組データで表示                                           |
| URL                   | `?ch=2` でチャンネルを直接指定。`?now=2026-09-29T21:00:00%2B09:00` で時刻をずらして確認可能                            |

デザインは [デジタル庁デザインシステム](https://design.digital.go.jp/)（`@digital-go-jp/tailwind-theme-plugin`）の
カラー・タイポグラフィ・角丸・フォーカスリングのトークンを使用しています。

## 技術構成

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + デジタル庁デザイントークン
- Zod（番組データのスキーマ検証。アプリと取得スクリプトで共有）
- vite-plugin-pwa（Workbox）
- Vitest / oxlint / Prettier
- GitHub Actions → GitHub Pages

```
channels.config.json        チャンネル（プレイリスト）の設定 ← 人が編集する
scripts/fetch-playlists.ts  YouTube Data API から動画情報を取得して catalog.json を生成
public/data/catalog.json    生成された番組データ（アプリはこれだけを読む）
src/
  schema.ts                 設定・番組データの Zod スキーマ
  lib/schedule.ts           放送スケジュールの算出（純粋関数・テストあり）
  components/               Player / NowPlaying / UpNext / ChannelList / Guide / Header …
  hooks/                    共有時計・localStorage 永続化・テーマ
```

## チャンネル（番組）を追加する

1. `channels.config.json` にエントリを追加して push

   ```json
   {
     "number": 4,
     "slug": "my-channel",
     "name": "チャンネル名 CGライブ",
     "shortName": "短い名前",
     "color": "orange",
     "playlistId": "PLxxxxxxxxxxxxxxxx"
   }
   ```

   `color` は `blue` `light-blue` `cyan` `green` `lime` `yellow` `orange` `red` `magenta` `purple` から選択します。

2. GitHub Actions が YouTube Data API で動画一覧・再生時間を取得し、`catalog.json` を更新してデプロイします。
   以降も毎日 5:17 (JST) に自動で更新されます（非公開・埋め込み不可の動画は自動で除外）。

## 初回セットアップ

1. [Google Cloud Console](https://console.cloud.google.com/) で **YouTube Data API v3** を有効化し、API キーを発行
   （「API の制限」で YouTube Data API v3 のみに絞るのがおすすめ）
2. リポジトリの **Settings → Secrets and variables → Actions** に `YOUTUBE_API_KEY` として登録
3. **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定
4. Actions タブから「Build & Deploy」を手動実行（または main に push）

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
