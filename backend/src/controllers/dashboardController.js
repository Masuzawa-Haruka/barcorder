'use strict';

const { AuthError, getAuthClient } = require('../middlewares/auth');
const dashboardService = require('../services/dashboardService');

const getDashboard = async (req, res) => {
    try {
        const authSupabase = getAuthClient(req);
        const { data, error, status } = await dashboardService.getMemberships(authSupabase);
        if (error) return res.status(status || 500).json({ error });
        res.json(data);
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('GET /api/dashboard エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
};

module.exports = { getDashboard };
