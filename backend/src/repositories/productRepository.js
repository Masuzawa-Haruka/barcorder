'use strict';

const axios = require('axios');

const findByBarcode = async (barcode) => {
    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (response.data.status !== 1) return [];

    const p = response.data.product;
    return [{
        name: p.product_name_ja || p.product_name || '名称不明',
        image: p.image_url || p.image_front_url || '',
        code: p.code,
        categories: p.categories || '',
    }];
};

const searchByKeyword = async (keyword) => {
    const response = await axios.get('https://jp.openfoodfacts.org/cgi/search.pl', {
        params: { search_terms: keyword, search_simple: 1, action: 'process', json: 1, page_size: 24 },
    });

    if (!response.data.products?.length) return [];

    return response.data.products.map(p => ({
        name: p.product_name_ja || p.product_name || '名称不明',
        image: p.image_url || p.image_front_url || '',
        code: p.code,
        categories: p.categories || '',
    }));
};

module.exports = { findByBarcode, searchByKeyword };
