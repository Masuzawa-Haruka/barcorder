# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語

コードコメント・コミットメッセージ・レビューはすべて**日本語**で記述すること。

## Git

ブランチ操作には `git switch` を使わず、必ず `git checkout` を使うこと。

### ブランチ運用

- ブランチは `feature/○○` の形式で命名する（○○は作業内容）
  - ✅ `feature/top-page`
  - ❌ `feature/mori`（作業者名はNG）
  - ❌ `top-page`（`feature/` プレフィックス必須）
- 派生元ブランチは `develop`

### commit → push → PR フロー

コードをコミットして push する際は以下の手順を自動で実行すること:

1. コミット（既存のコミット規約に従う）
2. `git push`（初回は `-u origin <branch>`）
3. **初回 push 時のみ**、`gh pr create --base develop` で PR を自動作成（必ず `develop` をベースにすること）
4. **PR の merge・ブランチ削除はユーザーが行う。Claude は PR 作成までで止めること。**

## プロジェクト概要

バーコードスキャンによる家庭用品の賞味期限管理アプリ。JANコードをスキャンして商品情報を自動取得し、期限を記録・通知する。

## コマンド

### フロントエンド (`frontend/`)

```bash
npm run dev    # 開発サーバー起動 (port 3000)
npm run build  # 本番ビルド
npm run lint   # ESLint 実行
```

### バックエンド (`backend/`)

```bash
npm run dev    # nodemon で開発サーバー起動 (port 3001)
```

### 環境変数

バックエンドは `backend/.env` に以下が必要:
```
SUPABASE_URL=...
SUPABASE_KEY=...
```

## アーキテクチャ

### 全体構成

```
frontend/   Next.js (App Router) + TypeScript + Tailwind CSS v4
backend/    Express.js (CommonJS) + Supabase クライアント
```

フロントエンドは `http://localhost:3001/api/*` のバックエンドAPIを直接呼び出す。

### フロントエンド

- **`app/page.tsx`** — 実質的なシングルページアプリ。3タブ構成: 商品登録・在庫一覧・分析
- **`components/BarcodeScanner.tsx`** — `react-zxing` を使ったカメラスキャンコンポーネント
- **`types/index.ts`** — `ProductSearchResult`・`InventoryItem` 等の型定義

`"use client"` は必要な箇所のみ使用。型定義は `types/index.ts` に集約し、`any` 型は使用禁止。

### バックエンド

- **`index.js`** — 単一ファイルの Express サーバー
- Supabase の `items` テーブルに対して CRUD 操作
- Open Food Facts API (`jp.openfoodfacts.org`) で商品情報を取得

エンドポイント:
| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/product?code=<JAN or keyword>` | Open Food Facts で商品検索 |
| GET | `/api/items` | 在庫一覧取得 |
| POST | `/api/items` | 在庫登録 |
| PATCH | `/api/items/:id` | ステータス・期限日更新 |
| DELETE | `/api/items/:id` | 削除 |

機能が増えた場合は `routes/` ディレクトリへの分割を検討する。

### データベース (Supabase)

`items` テーブル: `id`, `user_id`, `barcode`, `name`, `image_url`, `expiry_date`, `status`('active'/'consumed'/'discarded'), `created_at`

## 実装後の動作確認

コードを書き終えたら必ず以下を実行すること:

1. `npm run build`（またはビルドが不要な場合は `npm run lint`）でエラーがないことを確認
2. 開発サーバーを起動し、実際に動作することをブラウザまたは API クライアントで確認
3. 確認結果をユーザーに報告してから作業完了とする

動作確認なしに「実装しました」と報告してはならない。

## コーディング規約

### バックエンド
- CommonJS (`require()`) を使用（ESM 不使用）
- 全 API 呼び出しに `try-catch` を必須
- リクエストパラメータ (`req.query`, `req.body`) のバリデーションを行う
- エラー時は適切な HTTP ステータスコード (400/500系) + JSON を返す

### フロントエンド
- TypeScript 厳密モード、`any` 型禁止
- スタイルは Tailwind CSS v4 の Utility Class のみ（CSS Modules・CSS-in-JS 不使用）
- モバイルファーストのレスポンシブ設計 (`sm:`, `md:`, `lg:` プレフィックス)
- 非同期処理は `async/await` + `try-catch`
- 画像には `alt` 属性を必ず付与

## コードレビュー形式

重要度を必ず明示: **【必須修正】**・**【要改善】**・**【任意】**

```
## レビューサマリー
## 詳細レビュー
### 必須修正
### 推奨改善
### 任意改善
## 良い点
```
