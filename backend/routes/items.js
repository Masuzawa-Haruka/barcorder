'use strict';

const router = require('express').Router();
const { AuthError, getAuthClient } = require('../middleware/auth');

const validateDate = (dateStr) => {
    if (typeof dateStr !== 'string') return { error: '賞味期限はYYYY-MM-DD形式の文字列で指定してください' };
    const trimmed = dateStr.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { error: '賞味期限の形式が不正です（YYYY-MM-DD形式で指定してください）' };

    const [y, m, d] = trimmed.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(dt.getTime()) || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
        return { error: '存在しない日付が指定されています' };
    }
    return { trimmed };
};

// 在庫一覧取得
router.get('/', async (req, res) => {
    const { refrigerator_id } = req.query;
    if (refrigerator_id === undefined) return res.status(400).json({ error: 'refrigerator_id は必須です' });
    if (typeof refrigerator_id !== 'string') return res.status(400).json({ error: 'refrigerator_id は文字列で指定してください' });

    try {
        const authSupabase = getAuthClient(req);
        const { data, error, status } = await authSupabase
            .from('inventory_items')
            .select('id, refrigerator_id, barcode, expiration_date, status, added_at, products_master (name, image_url, category)')
            .eq('refrigerator_id', refrigerator_id)
            .order('expiration_date', { ascending: true });

        if (error) return res.status(status || 500).json({ error: error.message });

        res.json(data.map(item => ({
            id: item.id,
            refrigerator_id: item.refrigerator_id,
            barcode: item.barcode,
            name: item.products_master?.name || '名称未設定',
            image_url: item.products_master?.image_url || '',
            category: item.products_master?.category || '',
            expiry_date: item.expiration_date,
            status: item.status,
            created_at: item.added_at,
        })));
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('GET /api/items エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// 商品登録
router.post('/', async (req, res) => {
    const { refrigerator_id, name, barcode, image, expiry_date, category } = req.body;

    if (typeof refrigerator_id !== 'string' || !refrigerator_id.trim()) return res.status(400).json({ error: 'refrigerator_id は必須です' });
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: '商品名（name）は必須です' });
    if (typeof barcode !== 'string' || !barcode.trim()) return res.status(400).json({ error: 'バーコードは必須です' });
    if (typeof image !== 'string' || !image.trim()) return res.status(400).json({ error: '画像URLは必須です' });

    const dateResult = validateDate(expiry_date);
    if (dateResult.error) return res.status(400).json({ error: dateResult.error });

    try {
        const authSupabase = getAuthClient(req);
        const finalCategory = typeof category === 'string' && category.trim() ? category : '未分類';

        const { error: pmError } = await authSupabase
            .from('products_master')
            .upsert({ barcode, name, image_url: image, category: finalCategory }, { onConflict: 'barcode' });

        if (pmError) {
            console.error('products_master Upsert エラー:', pmError);
            return res.status(500).json({ error: '商品マスターの登録に失敗しました。' });
        }

        const { data, error } = await authSupabase
            .from('inventory_items')
            .insert([{ refrigerator_id, barcode, expiration_date: dateResult.trimmed, status: 'active' }])
            .select();

        if (error) {
            console.error('inventory_items Insert エラー:', error);
            return res.status(500).json({ error: '在庫の登録に失敗しました。' });
        }
        res.status(201).json(data[0]);
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('POST /api/items エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// ステータス・賞味期限更新
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status, expiry_date } = req.body;
    const updateFields = {};

    if (status !== undefined) {
        if (!['active', 'consumed', 'discarded'].includes(status)) return res.status(400).json({ error: '不正なステータスです' });
        updateFields.status = status;
    }
    if (expiry_date !== undefined) {
        const dateResult = validateDate(expiry_date);
        if (dateResult.error) return res.status(400).json({ error: dateResult.error });
        updateFields.expiration_date = dateResult.trimmed;
    }
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: '更新対象フィールドが指定されていません。status または expiry_date を指定してください。' });
    }

    try {
        const authSupabase = getAuthClient(req);
        const { data, error } = await authSupabase.from('inventory_items').update(updateFields).eq('id', id).select();

        if (error) {
            if (error.status === 401 || error.status === 403) return res.status(error.status).json({ error: error.message });
            return res.status(500).json({ error: error.message });
        }
        if (!data?.length) return res.status(404).json({ error: '指定されたIDのアイテムは存在しないか、権限がありません。' });

        res.json(data[0]);
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('PATCH /api/items/:id エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// 削除
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const authSupabase = getAuthClient(req);
        const { error } = await authSupabase.from('inventory_items').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.status(204).send();
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('DELETE /api/items/:id エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

module.exports = router;
