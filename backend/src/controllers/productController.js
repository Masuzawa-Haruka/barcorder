'use strict';

const productService = require('../services/productService');

const searchProduct = async (req, res) => {
    const query = req.query.code;
    if (!query) return res.status(400).json({ error: '検索ワードが必要です' });

    console.log(`🔍 OpenFoodFacts検索: ${query}`);

    try {
        const products = await productService.search(query);
        if (products.length === 0) return res.status(404).json({ error: '商品が見つかりませんでした' });
        res.json(products);
    } catch (error) {
        console.error('⚠️ APIエラー:', error.message);
        res.status(500).json({ error: '情報の取得に失敗しました' });
    }
};

module.exports = { searchProduct };
