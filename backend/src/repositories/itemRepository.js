'use strict';

const findByRefrigerator = async (authSupabase, refrigeratorId) => {
    const { data, error, status } = await authSupabase
        .from('inventory_items')
        .select('id, refrigerator_id, barcode, expiration_date, status, added_at, products_master (name, image_url, category)')
        .eq('refrigerator_id', refrigeratorId)
        .order('expiration_date', { ascending: true });

    if (error) return { error, status };

    return {
        data: data.map(item => ({
            id: item.id,
            refrigerator_id: item.refrigerator_id,
            barcode: item.barcode,
            name: item.products_master?.name || '名称未設定',
            image_url: item.products_master?.image_url || '',
            category: item.products_master?.category || '',
            expiry_date: item.expiration_date,
            status: item.status,
            created_at: item.added_at,
        })),
    };
};

const upsertProductMaster = async (authSupabase, { barcode, name, imageUrl, category }) => {
    const { error } = await authSupabase
        .from('products_master')
        .upsert({ barcode, name, image_url: imageUrl, category }, { onConflict: 'barcode' });
    return { error };
};

const insertInventoryItem = async (authSupabase, { refrigeratorId, barcode, expirationDate }) => {
    const { data, error } = await authSupabase
        .from('inventory_items')
        .insert([{ refrigerator_id: refrigeratorId, barcode, expiration_date: expirationDate, status: 'active' }])
        .select();
    return { data, error };
};

const updateById = async (authSupabase, id, updateFields) => {
    const { data, error } = await authSupabase
        .from('inventory_items')
        .update(updateFields)
        .eq('id', id)
        .select();
    return { data, error };
};

const deleteById = async (authSupabase, id) => {
    const { error } = await authSupabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
    return { error };
};

module.exports = { findByRefrigerator, upsertProductMaster, insertInventoryItem, updateById, deleteById };
