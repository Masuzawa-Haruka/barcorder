'use strict';

const { AuthError, getAuthClient } = require('../middlewares/auth');
const itemService = require('../services/itemService');
const itemRepository = require('../repositories/itemRepository');

const getItems = async (req, res) => {
    const { refrigerator_id } = req.query;
    if (refrigerator_id === undefined) return res.status(400).json({ error: 'refrigerator_id は必須です' });
    if (typeof refrigerator_id !== 'string') return res.status(400).json({ error: 'refrigerator_id は文字列で指定してください' });

    try {
        const authSupabase = getAuthClient(req);
        const { data, error, status } = await itemRepository.findByRefrigerator(authSupabase, refrigerator_id);
        if (error) return res.status(status || 500).json({ error: error.message });
        res.json(data);
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('GET /api/items エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
};

const createItem = async (req, res) => {
    const { refrigerator_id, name, barcode, image, expiry_date, category } = req.body;

    if (typeof refrigerator_id !== 'string' || !refrigerator_id.trim()) return res.status(400).json({ error: 'refrigerator_id は必須です' });
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: '商品名（name）は必須です' });
    if (typeof barcode !== 'string' || !barcode.trim()) return res.status(400).json({ error: 'バーコードは必須です' });
    if (typeof image !== 'string' || !image.trim()) return res.status(400).json({ error: '画像URLは必須です' });

    const dateResult = itemService.validateDate(expiry_date);
    if (dateResult.error) return res.status(400).json({ error: dateResult.error });

    try {
        const authSupabase = getAuthClient(req);
        const finalCategory = typeof category === 'string' && category.trim() ? category : '未分類';

        const { error: pmError } = await itemRepository.upsertProductMaster(authSupabase, {
            barcode, name, imageUrl: image, category: finalCategory,
        });
        if (pmError) {
            console.error('products_master Upsert エラー:', pmError);
            return res.status(500).json({ error: '商品マスターの登録に失敗しました。' });
        }

        const { data, error } = await itemRepository.insertInventoryItem(authSupabase, {
            refrigeratorId: refrigerator_id,
            barcode,
            expirationDate: dateResult.trimmed,
        });
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
};

const updateItem = async (req, res) => {
    const { id } = req.params;
    const { status, expiry_date } = req.body;

    const result = itemService.buildUpdateFields(status, expiry_date);
    if (result.error) return res.status(400).json({ error: result.error });

    try {
        const authSupabase = getAuthClient(req);
        const { data, error } = await itemRepository.updateById(authSupabase, id, result.updateFields);

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
};

const deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        const authSupabase = getAuthClient(req);
        const { error } = await itemRepository.deleteById(authSupabase, id);
        if (error) return res.status(500).json({ error: error.message });
        res.status(204).send();
    } catch (e) {
        if (e instanceof AuthError) return res.status(401).json({ error: e.message });
        console.error('DELETE /api/items/:id エラー:', e);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
};

module.exports = { getItems, createItem, updateItem, deleteItem };
