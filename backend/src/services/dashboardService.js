'use strict';

const dashboardRepository = require('../repositories/dashboardRepository');

const getMemberships = async (authSupabase) => {
    const { user, error: authError } = await dashboardRepository.getUser(authSupabase);
    if (authError || !user) return { error: '認証エラー：もう一度ログインしてください', status: 401 };

    const { data, error } = await dashboardRepository.getMemberships(authSupabase, user.id);
    if (error) return { error: error.message, status: 500 };

    return { data };
};

module.exports = { getMemberships };
