require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

// ---------------------------------------------------
// 1. 商品検索API (Open Food Facts 版)
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
            // 日本語(jp)サブドメインを使って検索
            const searchUrl = `https://jp.openfoodfacts.org/cgi/search.pl`;
            const params = {
                search_terms: query,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: 24, // 取得件数
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

        // フロントエンドで扱いやすい形に整形して返す
        // ※Open Food Factsには「価格」がないので price は null にします
        const results = products.map(item => ({
            name: item.name,
            price: null,
            image: item.image || "https://placehold.co/150x150?text=No+Image",
            url: "", // 商品ページURLは特にないので空文字
            code: item.code
        }));

        res.json(results);

    } catch (error) {
        console.error("⚠️ APIエラー:", error.message);
        res.status(500).json({ error: "情報の取得に失敗しました" });
    }
});

// ---------------------------------------------------
// 2. 在庫一覧取得API
// ---------------------------------------------------
app.get('/api/items', async (req, res) => {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ---------------------------------------------------
// 3. 商品登録API
// ---------------------------------------------------
app.post('/api/items', async (req, res) => {
    const { name, barcode, image, expiry_date } = req.body;
    const { data, error } = await supabase
        .from('items')
        .insert([{ name, barcode, image_url: image, expiry_date, status: 'active' }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// ---------------------------------------------------
// 4. ステータス・賞味期限更新API
// ---------------------------------------------------
app.patch('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { status, expiry_date } = req.body;

    // 更新するフィールドを動的に構築
    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (expiry_date !== undefined) updateFields.expiry_date = expiry_date;

    const { data, error } = await supabase
        .from('items')
        .update(updateFields)
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// ---------------------------------------------------
// 5. 削除API
// ---------------------------------------------------
app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`✅ Backend server listening on port ${port}`);
});