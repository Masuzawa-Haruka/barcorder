require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

// JWTトークンを含むリクエストごとのSupabaseクライアントを作成するヘルパー関数
const getAuthClient = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new AuthError('認証ヘッダーが設定されていません');
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: authHeader,
            },
        },
    });
};

app.use(cors());
app.use(express.json());

// ---------------------------------------------------
// 1. 商品検索API (Open Food Facts 版 - 認証不要)
// ---------------------------------------------------
app.get('/api/product', async (req, res) => {
    const query = req.query.code;
    if (!query) return res.status(400).json({ error: "検索ワードが必要です" });

    console.log(`🔍 OpenFoodFacts検索: ${query}`);

    try {
        const isBarcode = /^\d+$/.test(query);
        let products = [];

        // A. バーコード検索の場合 (特定の商品1つを狙い撃ち)
        if (isBarcode) {
            const url = `https://world.openfoodfacts.org/api/v0/product/${query}.json`;
            const response = await axios.get(url);

            if (response.data.status === 1) {
                const p = response.data.product;
                products.push({
                    name: p.product_name_ja || p.product_name || "名称不明", // 日本語名を優先
                    image: p.image_url || p.image_front_url || "",
                    code: p.code,
                    categories: p.categories || ""
                });
            }
        }
        // B. キーワード検索の場合 (検索結果リストを取得)
        else {
            const searchUrl = `https://jp.openfoodfacts.org/cgi/search.pl`;
            const params = {
                search_terms: query,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: 24,
            };

            const response = await axios.get(searchUrl, { params });

            if (response.data.products && response.data.products.length > 0) {
                products = response.data.products.map(p => ({
                    name: p.product_name_ja || p.product_name || "名称不明",
                    image: p.image_url || p.image_front_url || "",
                    code: p.code,
                    categories: p.categories || ""
                }));
            }
        }

        if (products.length === 0) {
            return res.status(404).json({ error: "商品が見つかりませんでした" });
        }

        const results = products.map(item => ({
            name: item.name,
            price: null,
            image: item.image || "https://placehold.co/150x150?text=No+Image",
            url: "",
            code: item.code,
            categories: item.categories || ""
        }));

        res.json(results);

    } catch (error) {
        console.error("⚠️ APIエラー:", error.message);
        res.status(500).json({ error: "情報の取得に失敗しました" });
    }
});

// ---------------------------------------------------
// 2. ダッシュボード取得API (冷蔵庫一覧)
// ---------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
    try {
        const authSupabase = getAuthClient(req);

        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ error: '認証エラー：もう一度ログインしてください' });
        }

        const { data, error } = await authSupabase
            .from('refrigerator_members')
            .select(`
                role,
                refrigerators (
                    id,
                    name
                )
            `)
            .eq('user_id', user.id);

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (e) {
        if (e.name === 'AuthError') return res.status(401).json({ error: e.message });
        console.error('GET /api/dashboard エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// ---------------------------------------------------
// 2.5 冷蔵庫作成API
// ---------------------------------------------------
app.post('/api/refrigerators', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: '冷蔵庫名は必須です' });
    }

    try {
        const authSupabase = getAuthClient(req);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ error: '認証エラー' });
        }

        // 冷蔵庫作成とオーナー登録をDB側トランザクション（RPC）で一括実行する
        const { data: refId, error: rpcError } = await authSupabase.rpc(
            'create_refrigerator_with_owner',
            { p_name: name }
        );

        if (rpcError) {
            console.error('create_refrigerator_with_owner RPC error:', rpcError);
            return res.status(500).json({ error: `冷蔵庫作成処理でDBエラー: ${rpcError.message}` });
        }

        if (!refId) {
            console.error('create_refrigerator_with_owner RPC returned no data');
            return res.status(500).json({ error: '冷蔵庫作成処理で予期せぬエラーが発生しました。' });
        }

        res.status(201).json({ id: refId, name });
    } catch (e) {
        if (e.name === 'AuthError') return res.status(401).json({ error: e.message });
        console.error('POST /api/refrigerators エラー:', e);
        res.status(500).json({ error: 'サーバー内で予期せぬエラーが発生しました。' });
    }
});

// ---------------------------------------------------
// 3. 在庫一覧取得API (`inventory_items` -> `products_master`)
// ---------------------------------------------------
app.get('/api/items', async (req, res) => {
    const { refrigerator_id } = req.query;
    if (!refrigerator_id) {
        return res.status(400).json({ error: 'refrigerator_id が必要です' });
    }

    try {
        const authSupabase = getAuthClient(req);

        const { data, error } = await authSupabase
            .from('inventory_items')
            .select(`
                *,
                products_master (
                    name,
                    image_url,
                    category
                )
            `)
            .eq('refrigerator_id', refrigerator_id)
            .order('expiration_date', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        // フロントエンドのUIに合わせた形式に整形する
        const formattedData = data.map(item => ({
            id: item.id,
            refrigerator_id: item.refrigerator_id,
            barcode: item.barcode,
            name: item.products_master?.name || "名称未設定",
            image_url: item.products_master?.image_url || "",
            category: item.products_master?.category || "",
            expiry_date: item.expiration_date,
            status: item.status,
            created_at: item.added_at
        }));

        res.json(formattedData);
    } catch (e) {
        if (e.name === 'AuthError') return res.status(401).json({ error: e.message });
        console.error('GET /api/items エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// ---------------------------------------------------
// 4. 商品登録API (`products_master` Upsert -> `inventory_items` Insert)
// ---------------------------------------------------
app.post('/api/items', async (req, res) => {
    const { refrigerator_id, name, barcode, image, expiry_date, category } = req.body;

    if (!refrigerator_id) return res.status(400).json({ error: 'refrigerator_id は必須です' });
    if (!name || name.trim() === '') return res.status(400).json({ error: '商品名（name）は必須です' });
    if (!barcode || barcode.trim() === '') return res.status(400).json({ error: 'バーコードは必須です' });
    if (!image || image.trim() === '') return res.status(400).json({ error: '画像URLは必須です' });
    if (!expiry_date || expiry_date.trim() === '') return res.status(400).json({ error: '賞味期限は必須です' });

    const expiry = new Date(expiry_date);
    if (Number.isNaN(expiry.getTime())) {
        return res.status(400).json({ error: '賞味期限の形式が不正です' });
    }

    try {
        const authSupabase = getAuthClient(req);

        // 1. 商品マスターにUpsert（既存のバーコードがあれば更新）
        const { error: pmError } = await authSupabase
            .from('products_master')
            .upsert({
                barcode,
                name,
                image_url: image,
                category: category || '未分類'
            }, { onConflict: 'barcode' });

        if (pmError) {
            console.error('products_master Upsert エラー:', pmError);
            return res.status(500).json({ error: '商品マスターの登録に失敗しました。' });
        }

        // 2. 在庫に追加
        const { data, error } = await authSupabase
            .from('inventory_items')
            .insert([{
                refrigerator_id,
                barcode,
                expiration_date: expiry_date,
                status: 'active'
            }])
            .select();

        if (error) {
            console.error('inventory_items Insert エラー:', error);
            return res.status(500).json({ error: '在庫の登録に失敗しました。' });
        }
        res.status(201).json(data[0]);
    } catch (e) {
        if (e.name === 'AuthError') return res.status(401).json({ error: e.message });
        console.error('POST /api/items エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// ---------------------------------------------------
// 5. ステータス・賞味期限更新API (`inventory_items` を対象)
// ---------------------------------------------------
app.patch('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { status, expiry_date } = req.body;

    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (expiry_date !== undefined) updateFields.expiration_date = expiry_date;

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
            error: '更新対象フィールドが指定されていません。'
        });
    }

    try {
        const authSupabase = getAuthClient(req);

        const { data, error } = await authSupabase
            .from('inventory_items')
            .update(updateFields)
            .eq('id', id)
            .select();

        if (error) return res.status(500).json({ error: error.message });

        if (!data || data.length === 0) {
            return res.status(404).json({ error: '指定されたIDのアイテムは存在しないか、権限がありません。' });
        }

        res.json(data[0]);
    } catch (e) {
        if (e.name === 'AuthError') return res.status(401).json({ error: e.message });
        console.error('PATCH /api/items/:id エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// ---------------------------------------------------
// 6. 削除API (`inventory_items` から削除)
// ---------------------------------------------------
app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const authSupabase = getAuthClient(req);

        const { error } = await authSupabase
            .from('inventory_items')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        res.status(204).send();
    } catch (e) {
        if (e.name === 'AuthError') return res.status(401).json({ error: e.message });
        console.error('DELETE /api/items/:id エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

app.listen(port, () => {
    console.log(`✅ Backend server listening on port ${port}`);
});