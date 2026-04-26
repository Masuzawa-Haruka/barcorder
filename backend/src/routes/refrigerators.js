'use strict';

const router = require('express').Router();
const { createRefrigerator } = require('../controllers/refrigeratorController');

router.post('/', createRefrigerator);

module.exports = router;
