'use strict';

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

const buildUpdateFields = (status, expiryDate) => {
    const updateFields = {};

    if (status !== undefined) {
        if (!['active', 'consumed', 'discarded'].includes(status)) {
            return { error: '不正なステータスです' };
        }
        updateFields.status = status;
    }

    if (expiryDate !== undefined) {
        const dateResult = validateDate(expiryDate);
        if (dateResult.error) return { error: dateResult.error };
        updateFields.expiration_date = dateResult.trimmed;
    }

    if (Object.keys(updateFields).length === 0) {
        return { error: '更新対象フィールドが指定されていません。status または expiry_date を指定してください。' };
    }

    return { updateFields };
};

module.exports = { validateDate, buildUpdateFields };
