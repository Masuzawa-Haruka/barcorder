"use client";

import { useState } from "react";
import Picker from "react-mobile-picker";

interface DrumRollDatePickerProps {
    initialDate?: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
}

export function DrumRollDatePicker({
    initialDate = new Date(),
    onConfirm,
    onCancel
}: DrumRollDatePickerProps) {
    const currentYear = new Date().getFullYear();

    // 年・月・日の選択肢を生成
    const years = Array.from({ length: 10 }, (_, i) => (currentYear - 2 + i).toString());
    const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    const [pickerValue, setPickerValue] = useState<{
        year: string;
        month: string;
        day: string;
    }>({
        year: initialDate.getFullYear().toString(),
        month: (initialDate.getMonth() + 1).toString().padStart(2, '0'),
        day: initialDate.getDate().toString().padStart(2, '0'),
    });

    // 選択された年月に応じて日数を動的に生成
    const daysInMonth = getDaysInMonth(
        parseInt(pickerValue.year),
        parseInt(pickerValue.month)
    );
    const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

    const handleConfirm = () => {
        const selectedDate = new Date(
            parseInt(pickerValue.year),
            parseInt(pickerValue.month) - 1,
            parseInt(pickerValue.day)
        );
        onConfirm(selectedDate);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                    <button
                        onClick={onCancel}
                        className="text-blue-500 font-semibold text-base"
                    >
                        キャンセル
                    </button>
                    <h3 className="font-bold text-gray-800">日付を選択</h3>
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
