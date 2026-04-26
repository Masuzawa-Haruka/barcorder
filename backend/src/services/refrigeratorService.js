'use strict';

const refrigeratorRepository = require('../repositories/refrigeratorRepository');

const create = async (authSupabase, name) => {
    const { user, error: authError } = await refrigeratorRepository.getUser(authSupabase);
    if (authError || !user) return { error: '認証エラー', status: 401 };

    const { refId, error: rpcError } = await refrigeratorRepository.createWithOwner(authSupabase, name);
    if (rpcError) {
        console.error('create_refrigerator_with_owner RPC error:', rpcError);
        return { error: `冷蔵庫作成処理でDBエラー: ${rpcError.message}`, status: 500 };
    }
    if (!refId) return { error: '冷蔵庫作成処理で予期せぬエラーが発生しました。', status: 500 };

    return { data: { id: refId, name } };
};

module.exports = { create };
