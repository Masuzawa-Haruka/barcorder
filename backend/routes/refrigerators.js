'use strict';

const router = require('express').Router();
const { AuthError, getAuthClient } = require('../middleware/auth');

router.post('/', async (req, res) => {
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: '冷蔵庫名は必須です' });
    }

    try {
        const authSupabase = getAuthClient(req);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) return res.status(401).json({ error: '認証エラー' });

        const { data: refId, error: rpcError } = await authSupabase.rpc(
            'create_refrigerator_with_owner',
            { p_name: name }
        );

        if (rpcError) {
            console.error('create_refrigerator_with_owner RPC error:', rpcError);
            return res.status(500).json({ error: `冷蔵庫作成処理でDBエラー: ${rpcError.message}` });
        }
        if (!refId) return res.status(500).json({ error: '冷蔵庫作成処理で予期せぬエラーが発生しました。' });

        res.status(201).json({ id: refId, name });
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('POST /api/refrigerators エラー:', e);
        res.status(500).json({ error: 'サーバー内で予期せぬエラーが発生しました。' });
    }
});

module.exports = router;
