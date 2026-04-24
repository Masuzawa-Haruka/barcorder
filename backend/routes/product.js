'use strict';

const router = require('express').Router();
const axios = require('axios');

router.get('/', async (req, res) => {
    const query = req.query.code;
    if (!query) return res.status(400).json({ error: '検索ワードが必要です' });

    console.log(`🔍 OpenFoodFacts検索: ${query}`);

    try {
        const isBarcode = /^\d+$/.test(query);
        let products = [];

        if (isBarcode) {
            const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${query}.json`);
            if (response.data.status === 1) {
                const p = response.data.product;
                products.push({
                    name: p.product_name_ja || p.product_name || '名称不明',
                    image: p.image_url || p.image_front_url || '',
                    code: p.code,
                    categories: p.categories || '',
                });
            }
        } else {
            const response = await axios.get('https://jp.openfoodfacts.org/cgi/search.pl', {
                params: { search_terms: query, search_simple: 1, action: 'process', json: 1, page_size: 24 },
            });
            if (response.data.products?.length > 0) {
                products = response.data.products.map(p => ({
                    name: p.product_name_ja || p.product_name || '名称不明',
                    image: p.image_url || p.image_front_url || '',
                    code: p.code,
                    categories: p.categories || '',
                }));
            }
        }

        if (products.length === 0) return res.status(404).json({ error: '商品が見つかりませんでした' });

        res.json(products.map(item => ({
            name: item.name,
            price: null,
            image: item.image || 'https://placehold.co/150x150?text=No+Image',
            url: '',
            code: item.code,
            categories: item.categories || '',
        })));
    } catch (error) {
        console.error('⚠️ APIエラー:', error.message);
        res.status(500).json({ error: '情報の取得に失敗しました' });
    }
});

module.exports = router;
