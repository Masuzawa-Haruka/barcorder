'use strict';

const productRepository = require('../repositories/productRepository');

const search = async (query) => {
    const isBarcode = /^\d+$/.test(query);
    const products = isBarcode
        ? await productRepository.findByBarcode(query)
        : await productRepository.searchByKeyword(query);

    return products.map(item => ({
        name: item.name,
        price: null,
        image: item.image || 'https://placehold.co/150x150?text=No+Image',
        url: '',
        code: item.code,
        categories: item.categories || '',
    }));
};

module.exports = { search };
