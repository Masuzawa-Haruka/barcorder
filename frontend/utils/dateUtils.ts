/**
 * YYYY-MM-DD形式の文字列を、タイムゾーンのズレを防ぎつつ操作・フォーマットするためのユーティリティ関数群です。
 */

/**
 * タイムゾーンの影響を受けずに、YYYY-MM-DD形式の文字列を YYYY/MM/DD に変換します。
 * @param dateStr "YYYY-MM-DD" などの日付文字列
 * @returns "YYYY/MM/DD" 形式の文字列。無効な場合は空文字を返します。
 */
export const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return "";

    // "YYYY-MM-DD" 形式の文字列であれば、文字列置換のみで処理してタイムゾーン計算をバイパスする
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr.replace(/-/g, '/');
    }

    // それ以外の形式のフォールバック (末尾にT00:00:00をつけてローカルタイムとしてパース)
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return "";

    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};

/**
 * Dateオブジェクトからローカルタイムゾーンに基づく YYYY-MM-DD 文字列を生成します。
 * @param date Dateオブジェクト
 * @returns "YYYY-MM-DD" 形式の文字列。無効な場合は空文字を返します。
 */
export const getLocalDateString = (date: Date): string => {
    if (isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

/**
 * YYYY-MM-DD形式の文字列を、ローカルタイムゾーンの0時0分を示すDateオブジェクトに安全に変換します。
 * @param dateStr "YYYY-MM-DD" などの日付文字列
 * @returns Dateオブジェクト。不正な文字列の場合は Invalid Date を返します。
 */
export const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(NaN);

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }

    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    return date;
};
