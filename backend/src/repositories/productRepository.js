'use strict';

const axios = require('axios');

const USER_AGENT = 'BarCorder/1.0 (https://github.com/Masuzawa-Haruka/barcorder)';
const RETRY_DELAYS_MS = [500, 1000, 2000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options = {}) => {
    let lastError;
    for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
        try {
            return await axios.get(url, options);
        } catch (err) {
            lastError = err;
            const status = err.response?.status;
            if (status !== 503 || i === RETRY_DELAYS_MS.length) throw lastError;
            console.log(`⏳ 503 のためリトライ (${i + 1}/${RETRY_DELAYS_MS.length}) ...`);
            await sleep(RETRY_DELAYS_MS[i]);
        }
    }
    throw lastError;
};

const findByBarcode = async (barcode) => {
    const response = await fetchWithRetry(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { headers: { 'User-Agent': USER_AGENT } }
    );
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
    const response = await fetchWithRetry('https://jp.openfoodfacts.org/cgi/search.pl', {
        params: { search_terms: keyword, search_simple: 1, action: 'process', json: 1, page_size: 24 },
        headers: { 'User-Agent': USER_AGENT },
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
