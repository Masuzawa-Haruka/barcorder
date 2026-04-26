'use strict';

const { createClient } = require('@supabase/supabase-js');

class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

const getAuthClient = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AuthError('認証ヘッダーが設定されていません');

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('サーバー設定エラー：環境変数 SUPABASE_URL が未設定です。');

    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    if (!anonKey) throw new Error('サーバー設定エラー：SUPABASE_ANON_KEY が未設定です。');

    if (!process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_KEY) {
        console.warn('警告：SUPABASE_KEY からフォールバックしています。SUPABASE_ANON_KEY への移行を検討してください。');
    }

    return createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });
};

module.exports = { AuthError, getAuthClient };
