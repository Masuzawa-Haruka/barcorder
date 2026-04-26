'use strict';

const { AuthError, getAuthClient } = require('../middlewares/auth');
const refrigeratorService = require('../services/refrigeratorService');

const createRefrigerator = async (req, res) => {
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: '冷蔵庫名は必須です' });
    }

    try {
        const authSupabase = getAuthClient(req);
        const { data, error, status } = await refrigeratorService.create(authSupabase, name);
        if (error) return res.status(status || 500).json({ error });
        res.status(201).json(data);
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('POST /api/refrigerators エラー:', e);
        res.status(500).json({ error: 'サーバー内で予期せぬエラーが発生しました。' });
    }
};

module.exports = { createRefrigerator };
