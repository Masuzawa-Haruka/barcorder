"use client";

import { useState } from "react";
import { DrumRollDatePicker } from "./DrumRollDatePicker";

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
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
    const [localStartDate, setLocalStartDate] = useState(startDate || new Date().toISOString().split('T')[0]);
    const [localEndDate, setLocalEndDate] = useState(endDate);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const handleApply = () => {
        onStartDateChange(localStartDate);
        onEndDateChange(localEndDate);
        onClose();
    };

    const addDaysToStart = (days: number) => {
        if (!localStartDate) return;
        const start = new Date(localStartDate);
        start.setDate(start.getDate() + days);
        const endStr = start.toISOString().split('T')[0];
        setLocalEndDate(endStr);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">賞味期限で検索</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                    </div>

                    {/* いつから */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">いつから</label>
                        <button
                            onClick={() => setShowStartPicker(true)}
                            className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white hover:border-blue-500 focus:outline-none transition-colors text-left"
                        >
                            {localStartDate ? formatDate(localStartDate) : "日付を選択"}
                        </button>
                    </div>

                    {/* いつまで */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">いつまで</label>
                        <button
                            onClick={() => setShowEndPicker(true)}
                            className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white hover:border-blue-500 focus:outline-none transition-colors text-left"
                        >
                            {localEndDate ? formatDate(localEndDate) : "日付を選択"}
                        </button>
                    </div>

                    {/* プリセットボタン */}
                    <div className="mb-6">
                        <p className="text-xs text-gray-500 mb-2 font-bold">クイック設定</p>
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => addDaysToStart(3)} className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">3日後</button>
                            <button onClick={() => addDaysToStart(7)} className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">1週間</button>
                            <button onClick={() => addDaysToStart(14)} className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">2週間</button>
                            <button onClick={() => addDaysToStart(30)} className="px-2 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">1ヶ月</button>
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
                    initialDate={localStartDate ? new Date(localStartDate) : new Date()}
                    onConfirm={(date) => {
                        setLocalStartDate(date.toISOString().split('T')[0]);
                        setShowStartPicker(false);
                    }}
                    onCancel={() => setShowStartPicker(false)}
                />
            )}

            {/* ドラムロールピッカー - いつまで */}
            {showEndPicker && (
                <DrumRollDatePicker
                    initialDate={localEndDate ? new Date(localEndDate) : new Date()}
                    onConfirm={(date) => {
                        setLocalEndDate(date.toISOString().split('T')[0]);
                        setShowEndPicker(false);
                    }}
                    onCancel={() => setShowEndPicker(false)}
                />
            )}
        </>
    );
}
