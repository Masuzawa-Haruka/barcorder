"use client";

import { useState } from "react";

interface DateTimePickerProps {
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
}

export function DateTimePicker({ label = "日時を選択", value, onChange }: DateTimePickerProps) {
    const [selectedDateTime, setSelectedDateTime] = useState(value || "");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSelectedDateTime(newValue);
        if (onChange) {
            onChange(newValue);
        }
    };

    const formatDateTime = (dateTimeString: string) => {
        if (!dateTimeString) return "";
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2">
                {label}
            </label>

            {/* iOS標準のドラムロールピッカーが表示される */}
            <input
                type="datetime-local"
                value={selectedDateTime}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />

            {/* 選択された日時のプレビュー */}
            {selectedDateTime && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">選択された日時:</p>
                    <p className="text-base font-bold text-gray-800">
                        {formatDateTime(selectedDateTime)}
                    </p>
                </div>
            )}
        </div>
    );
}
