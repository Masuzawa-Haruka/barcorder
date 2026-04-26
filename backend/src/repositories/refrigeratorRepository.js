'use strict';

const getUser = async (authSupabase) => {
    const { data: { user }, error } = await authSupabase.auth.getUser();
    return { user, error };
};

const createWithOwner = async (authSupabase, name) => {
    const { data: refId, error } = await authSupabase.rpc('create_refrigerator_with_owner', { p_name: name });
    return { refId, error };
};

module.exports = { getUser, createWithOwner };
