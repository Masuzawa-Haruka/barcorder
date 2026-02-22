"use client";

import { useState, useEffect } from "react";
import { DrumRollDatePicker } from "./DrumRollDatePicker";
import { formatDateForDisplay, getLocalDateString } from "../utils/dateUtils";

interface DateRangePickerProps {
    startDate?: string;
    endDate?: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onClose: () => void;
}

export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onClose
}: DateRangePickerProps) {
    const [localStartDate, setLocalStartDate] = useState(startDate || "");
    const [localEndDate, setLocalEndDate] = useState(endDate || "");
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleApply = () => {
        if (localStartDate && localEndDate) {
            const start = new Date(localStartDate + "T00:00:00");
            const end = new Date(localEndDate + "T00:00:00");
            if (start > end) {
                setErrorMessage("開始日は終了日より前の日付を指定してください。");
                return;
            }
        }
        setErrorMessage(null);
        onStartDateChange(localStartDate);
        onEndDateChange(localEndDate);
        onClose();
    };

    // Escapeキーでモーダルを閉じる
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]); const addDaysToStart = (days: number) => {
        // localStartDate が未設定の場合でも、クイック設定が動作するように現在日付を基準とする
        const baseDate = localStartDate ? new Date(localStartDate + 'T00:00:00') : new Date();
        // 未設定だった場合は、基準日（＝今日）を開始日として反映する
        if (!localStartDate) {
            setLocalStartDate(getLocalDateString(baseDate));
        }
        baseDate.setDate(baseDate.getDate() + days);
        setLocalEndDate(getLocalDateString(baseDate));
    };



    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div
                    className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">賞味期限で検索</h2>
                        <button
                            onClick={onClose}
                            aria-label="モーダルを閉じる"
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* エラーメッセージ */}
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-bold animate-fade-in" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    {/* いつから */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">いつから</label>
                        <button
                            onClick={() => setShowStartPicker(true)}
                            aria-label="開始日を選択"
                            className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white hover:border-blue-500 focus:outline-none transition-colors text-left"
                        >
                            {localStartDate ? formatDateForDisplay(localStartDate) : "日付を選択"}
                        </button>
                    </div>

                    {/* いつまで */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">いつまで</label>
                        <button
                            onClick={() => setShowEndPicker(true)}
                            aria-label="終了日を選択"
                            className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white hover:border-blue-500 focus:outline-none transition-colors text-left"
                        >
                            {localEndDate ? formatDateForDisplay(localEndDate) : "日付を選択"}
                        </button>
                    </div>

                    {/* プリセットボタン */}
                    <div className="mb-6">
                        <p className="text-xs text-gray-500 mb-2 font-bold">クイック設定</p>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => addDaysToStart(3)}
                                className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600"
                                aria-label="3日後までの範囲を設定"
                            >
                                3日後
                            </button>
                            <button
                                onClick={() => addDaysToStart(7)}
                                className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600"
                                aria-label="1週間後までの範囲を設定"
                            >
                                1週間
                            </button>
                            <button
                                onClick={() => addDaysToStart(14)}
                                className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600"
                                aria-label="2週間後までの範囲を設定"
                            >
                                2週間
                            </button>
                            <button
                                onClick={() => addDaysToStart(30)}
                                className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600"
                                aria-label="1ヶ月後までの範囲を設定"
                            >
                                1ヶ月
                            </button>
                        </div>
                    </div>

                    {/* 適用ボタン */}
                    <button onClick={handleApply} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-600">
                        OK
                    </button>
                </div>
            </div>

            {/* ドラムロールピッカー - いつから */}
            {showStartPicker && (
                <DrumRollDatePicker
                    initialDate={localStartDate ? new Date(localStartDate + 'T00:00:00') : new Date()}
                    onConfirm={(date) => {
                        setLocalStartDate(getLocalDateString(date));
                        setShowStartPicker(false);
                    }}
                    onCancel={() => setShowStartPicker(false)}
                />
            )}

            {/* ドラムロールピッカー - いつまで */}
            {showEndPicker && (
                <DrumRollDatePicker
                    initialDate={localEndDate ? new Date(localEndDate + 'T00:00:00') : new Date()}
                    onConfirm={(date) => {
                        setLocalEndDate(getLocalDateString(date));
                        setShowEndPicker(false);
                    }}
                    onCancel={() => setShowEndPicker(false)}
                />
            )}
        </>
    );
}
