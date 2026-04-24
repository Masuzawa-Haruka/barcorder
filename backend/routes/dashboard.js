'use strict';

const router = require('express').Router();
const { AuthError, getAuthClient } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        const authSupabase = getAuthClient(req);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) return res.status(401).json({ error: '認証エラー：もう一度ログインしてください' });

        const { data, error } = await authSupabase
            .from('refrigerator_members')
            .select('role, refrigerators!inner (id, name)')
            .eq('user_id', user.id);

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('GET /api/dashboard エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

module.exports = router;
