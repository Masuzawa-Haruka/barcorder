'use strict';

const getUser = async (authSupabase) => {
    const { data: { user }, error } = await authSupabase.auth.getUser();
    return { user, error };
};

const getMemberships = async (authSupabase, userId) => {
    const { data, error } = await authSupabase
        .from('refrigerator_members')
        .select('role, refrigerators!inner (id, name)')
        .eq('user_id', userId);
    return { data, error };
};

module.exports = { getUser, getMemberships };
