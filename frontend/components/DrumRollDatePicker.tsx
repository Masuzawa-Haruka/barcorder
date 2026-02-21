"use client";

import { useState, useMemo, useEffect } from "react";
import Picker from "react-mobile-picker";

interface DrumRollDatePickerProps {
    initialDate?: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
}

export function DrumRollDatePicker({
    initialDate,
    onConfirm,
    onCancel
}: DrumRollDatePickerProps) {
    // 1. initialDateの妥当性チェック
    const safeInitialDate = useMemo(() => {
        const d = initialDate || new Date();
        return !Number.isNaN(d.getTime()) ? d : new Date();
    }, [initialDate]);

    // 2. 年・月の選択肢をメモ化
    const { years, months } = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 1;
        const endYear = currentYear + 10;
        const y = Array.from(
            { length: endYear - startYear + 1 },
            (_, i) => (startYear + i).toString()
        );
        const m = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
        return { years: y, months: m };
    }, []);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    const [pickerValue, setPickerValue] = useState<{
        year: string;
        month: string;
        day: string;
    }>({
        year: safeInitialDate.getFullYear().toString(),
        month: (safeInitialDate.getMonth() + 1).toString().padStart(2, '0'),
        day: safeInitialDate.getDate().toString().padStart(2, '0'),
    });

    // 選択された年月に応じて日数を動的に生成
    const daysInMonth = getDaysInMonth(
        parseInt(pickerValue.year),
        parseInt(pickerValue.month)
    );

    // 月や年が変更された際、選択中の「日」が存在しない日付（例: 2月31日）になっていれば自動補正する
    useEffect(() => {
        const currentDay = parseInt(pickerValue.day);
        if (currentDay > daysInMonth) {
            setPickerValue(prev => ({
                ...prev,
                day: daysInMonth.toString().padStart(2, '0')
            }));
        }
    }, [pickerValue.year, pickerValue.month, daysInMonth, pickerValue.day]);

    const days = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
    }, [daysInMonth]);

    const handleConfirm = () => {
        const selectedDate = new Date(
            parseInt(pickerValue.year),
            parseInt(pickerValue.month) - 1,
            parseInt(pickerValue.day)
        );
        onConfirm(selectedDate);
    };

    // 3. Escapeキーでのキャンセル
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="drumroll-picker-title"
            >
                {/* ヘッダー */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                    <button
                        onClick={onCancel}
                        className="text-blue-500 font-semibold text-base"
                    >
                        キャンセル
                    </button>
                    <h3 id="drumroll-picker-title" className="font-bold text-gray-800">日付を選択</h3>
                    <button
                        onClick={handleConfirm}
                        className="text-lime-500 font-bold text-base"
                    >
                        決定
                    </button>
                </div>

                {/* ドラムロールピッカー */}
                <div className="py-4">
                    <Picker
                        value={pickerValue}
                        onChange={(value) => setPickerValue(value as { year: string; month: string; day: string })}
                        wheelMode="natural"
                        height={216}
                    >
                        <Picker.Column name="year">
                            {years.map((year) => (
                                <Picker.Item key={year} value={year}>
                                    {({ selected }) => (
                                        <div
                                            aria-label={`${year}年`}
                                            className={`flex items-center justify-center h-12 text-lg transition-all ${selected
                                                ? 'font-bold text-gray-900 scale-110'
                                                : 'text-gray-400'
                                                }`}
                                        >
                                            {year}年
                                        </div>
                                    )}
                                </Picker.Item>
                            ))}
                        </Picker.Column>

                        <Picker.Column name="month">
                            {months.map((month) => (
                                <Picker.Item key={month} value={month}>
                                    {({ selected }) => (
                                        <div
                                            aria-label={`${month}月`}
                                            className={`flex items-center justify-center h-12 text-lg transition-all ${selected
                                                ? 'font-bold text-gray-900 scale-110'
                                                : 'text-gray-400'
                                                }`}
                                        >
                                            {month}月
                                        </div>
                                    )}
                                </Picker.Item>
                            ))}
                        </Picker.Column>

                        <Picker.Column name="day">
                            {days.map((day) => (
                                <Picker.Item key={day} value={day}>
                                    {({ selected }) => (
                                        <div
                                            aria-label={`${day}日`}
                                            className={`flex items-center justify-center h-12 text-lg transition-all ${selected
                                                ? 'font-bold text-gray-900 scale-110'
                                                : 'text-gray-400'
                                                }`}
                                        >
                                            {day}日
                                        </div>
                                    )}
                                </Picker.Item>
                            ))}
                        </Picker.Column>
                    </Picker>
                </div>
            </div>
        </div>
    );
}
