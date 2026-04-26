'use strict';

const router = require('express').Router();
const { getItems, createItem, updateItem, deleteItem } = require('../controllers/itemController');

router.get('/', getItems);
router.post('/', createItem);
router.patch('/:id', updateItem);
router.delete('/:id', deleteItem);

module.exports = router;
