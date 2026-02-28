// types/index.ts

// 1. APIから取得した商品情報の型 (Yahoo!検索結果など)
// 画面での「検索結果」表示に使います
export type ProductSearchResult = {
  name: string;      // 商品名
  price?: number;    // 価格（ない場合もあるので ? をつける）
  image: string;     // 画像URL
  url?: string;      // 商品ページURL
  code?: string;     // JANコード
  categories?: string; // カテゴリ
};

// 2. データベース(Supabase)に保存される在庫データの型
// 画面での「在庫一覧」表示に使います
export type InventoryItem = {
  id: string;        // UUID (Supabaseが生成)
  user_id: string;   // 所有者のID
  name: string;      // 商品名
  barcode: string;   // JANコード
  image_url: string | null; // 画像がない場合もあるので null 許容
  expiry_date: string;      // 賞味期限 (YYYY-MM-DD)
  status: 'active' | 'consumed' | 'discarded'; // ステータスは文字列リテラル型で制限する
  created_at: string;       // 登録日
};